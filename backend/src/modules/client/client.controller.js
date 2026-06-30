import prisma from '../../services/prismaClient.js'
import bcrypt from 'bcryptjs'

// ─── GET /client/home ────────────────────────────────────────────────────

export const getHome = async (req, res) => {
  const clientId = req.user.id
  try {
    const user = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true, pseudo: true, salleId: true,
        credits: { select: { solde: true, categorie: { select: { id: true, nom: true } } } },
        bonus: { select: { solde: true, disponible: true } },
        transactions: { select: { montant: true, type: true }, where: { type: { in: ['RECHARGE_GERANT', 'RECHARGE_COUPON', 'BONUS'] } } },
        sessions: {
          where: { statut: { in: ['ACTIVE', 'ARRETEE', 'TERMINEE'] } },
          select: { id: true, statut: true, fin: true, estBonus: true, debut: true, duree: { select: { libelle: true, secondes: true, prix: true } }, poste: { select: { nom: true } } },
          orderBy: { debut: 'desc' }, take: 10
        }
      }
    })
    if (!user) return res.status(404).json({ message: 'Client introuvable' })

    // Récupérer TOUTES les catégories de la salle
    // pour que le client voie les catégories même sans crédit existant
    const toutesCategories = await prisma.categorie.findMany({
      where: { salleId: user.salleId },
      select: { id: true, nom: true }
    })

    // Fusionner : catégories avec solde existant ou 0 par défaut
    const credits = toutesCategories.map(cat => {
      const creditExistant = user.credits.find(c => c.categorie.id === cat.id)
      return {
        solde: creditExistant?.solde ?? 0,
        categorie: cat
      }
    })

    // soldeMonetaire = total recharges + bonus parrainage - dépenses sessions
    const totalEncaisse = user.transactions.reduce((sum, t) => sum + t.montant, 0)
    const depensesSessions = await prisma.transaction.aggregate({
      where: { clientId, type: 'SESSION' },
      _sum: { montant: true }
    })
    const soldeMonetaire = totalEncaisse - (depensesSessions._sum.montant ?? 0)

    return res.json({
      pseudo: user.pseudo,
      credits,
      bonus: user.bonus,
      soldeMonetaire,
      activeSession: user.sessions.find(s => s.statut === 'ACTIVE') ?? null,
      recentSessions: user.sessions.filter(s => s.statut !== 'ACTIVE')
    })
  } catch (err) {
    console.error('[client/home GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── GET /client/sessions ─────────────────────────────────────────────────

export const getSessions = async (req, res) => {
  const clientId = req.user.id
  try {
    const sessions = await prisma.session.findMany({
      where: { clientId },
      select: { id: true, statut: true, fin: true, debut: true, estBonus: true, duree: { select: { libelle: true, secondes: true, prix: true } }, poste: { select: { nom: true } } },
      orderBy: { debut: 'desc' }
    })
    return res.json(sessions)
  } catch (err) {
    console.error('[client/sessions GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── GET /client/leaderboard ──────────────────────────────────────────────

export const getLeaderboard = async (req, res) => {
  const salleId = req.user.salle_id
  try {
    const clients = await prisma.user.findMany({
      where: { salleId, role: 'CLIENT', active: true },
      select: {
        id: true, pseudo: true,
        sessions: { where: { statut: 'TERMINEE' }, select: { duree: { select: { secondes: true } } } }
      }
    })
    const leaderboard = clients
      .map(c => ({ id: c.id, pseudo: c.pseudo, totalSecondes: c.sessions.reduce((s, sess) => s + (sess.duree?.secondes ?? 0), 0) }))
      .sort((a, b) => b.totalSecondes - a.totalSecondes)
    return res.json({ leaderboard, myId: req.user.id })
  } catch (err) {
    console.error('[client/leaderboard GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── POST /client/session/start ──────────────────────────────────────────────

export const startSession = async (req, res) => {
  const clientId = req.user.id
  const { categorieId, dureeId, useBonus } = req.body
  if (!categorieId || !dureeId) return res.status(400).json({ message: 'categorieId et dureeId requis' })

  try {
    const duree = await prisma.duree.findFirst({ where: { id: Number(dureeId), categorieId: Number(categorieId) } })
    if (!duree) return res.status(404).json({ message: 'Durée introuvable' })

    const posteLibre = await prisma.poste.findFirst({ where: { categorieId: Number(categorieId), statut: 'LIBRE' } })
    if (!posteLibre) return res.status(400).json({ message: 'Aucun poste libre dans cette catégorie' })

    // ── Mode bonus choisi explicitement par le client ──
    if (useBonus) {
      const bonus = await prisma.bonus.findUnique({ where: { clientId } })
      if (!bonus || !bonus.disponible || bonus.solde < duree.secondes) {
        return res.status(400).json({ message: 'Bonus indisponible ou insuffisant' })
      }

      const finPrevue = new Date(Date.now() + duree.secondes * 1000)

      const session = await prisma.$transaction(async (tx) => {
        await tx.bonus.update({
          where: { id: bonus.id },
          data: { solde: { decrement: duree.secondes } }
        })
        const s = await tx.session.create({
          data: {
            clientId,
            gerantId: clientId,
            posteId: posteLibre.id,
            dureeId: Number(dureeId),
            tempsRestant: duree.secondes,
            fin: finPrevue,
            statut: 'ACTIVE',
            estBonus: true
          }
        })
        await tx.poste.update({ where: { id: posteLibre.id }, data: { statut: 'OCCUPE' } })
        return s
      })

      const { getIO } = await import('../../socket.js')
      try { getIO().emit('session:start', { sessionId: session.id, posteId: posteLibre.id, clientId, finPrevue, estBonus: true }) } catch (e) {}

      try {
        const { scheduleSessionEnd } = await import('../gerant/sessions.controller.js')
        scheduleSessionEnd(session.id, posteLibre.id, duree.secondes * 1000)
      } catch (e) {
        console.warn('[startSession] scheduleSessionEnd non disponible:', e.message)
      }

      return res.status(201).json({ message: 'Session démarrée avec vos bonus', sessionId: session.id, finPrevue, modeBonus: true })
    }

    // ── Mode normal : crédit en secondes ou solde monétaire ──
    const credit = await prisma.credit.findFirst({ where: { clientId, categorieId: Number(categorieId) } })
    const soldeSecondes = credit?.solde ?? 0

    let modeAchat = false

    if (soldeSecondes < duree.secondes) {
      const user = await prisma.user.findUnique({
        where: { id: clientId },
        select: {
          transactions: {
            where: { type: { in: ['RECHARGE_GERANT', 'RECHARGE_COUPON', 'BONUS'] } },
            select: { montant: true }
          }
        }
      })
      const totalEncaisse = (user?.transactions ?? []).reduce((s, t) => s + t.montant, 0)
      const depenses = await prisma.transaction.aggregate({
        where: { clientId, type: 'SESSION' },
        _sum: { montant: true }
      })
      const soldeMonetaire = totalEncaisse - (depenses._sum.montant ?? 0)

      if (soldeMonetaire >= duree.prix) {
        modeAchat = true
      } else {
        return res.status(400).json({
          message: `Crédit insuffisant. Disponible : ${Math.floor(soldeSecondes / 60)} min ou ${soldeMonetaire.toLocaleString()} F (requis : ${duree.prix.toLocaleString()} F)`
        })
      }
    }

    const finPrevue = new Date(Date.now() + duree.secondes * 1000)

    const session = await prisma.$transaction(async (tx) => {
      if (modeAchat) {
        await tx.transaction.create({
          data: { clientId, montant: duree.prix, type: 'SESSION' }
        })
        await tx.credit.upsert({
          where: { clientId_categorieId: { clientId, categorieId: Number(categorieId) } },
          create: { clientId, categorieId: Number(categorieId), solde: 0 },
          update: {}
        })
      } else {
        await tx.credit.update({
          where: { id: credit.id },
          data: { solde: { decrement: duree.secondes } }
        })
      }

      const s = await tx.session.create({
        data: {
          clientId,
          gerantId: clientId,
          posteId: posteLibre.id,
          dureeId: Number(dureeId),
          tempsRestant: duree.secondes,
          fin: finPrevue,
          statut: 'ACTIVE',
          estBonus: false
        },
      })
      await tx.poste.update({ where: { id: posteLibre.id }, data: { statut: 'OCCUPE' } })
      return s
    })

    const { getIO } = await import('../../socket.js')
    try { getIO().emit('session:start', { sessionId: session.id, posteId: posteLibre.id, clientId, finPrevue }) } catch (e) {}

    try {
      const { scheduleSessionEnd } = await import('../gerant/sessions.controller.js')
      scheduleSessionEnd(session.id, posteLibre.id, duree.secondes * 1000)
    } catch (e) {
      console.warn('[startSession] scheduleSessionEnd non disponible:', e.message)
    }

    return res.status(201).json({ message: 'Session démarrée', sessionId: session.id, finPrevue, modeAchat })
  } catch (err) {
    console.error('[client/session/start POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── POST /client/session/:id/stop ────────────────────────────────────────────

export const stopSession = async (req, res) => {
  const clientId = req.user.id
  const sessionId = Number(req.params.id)
  try {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, clientId, statut: 'ACTIVE' },
      include: { poste: true }
    })
    if (!session) return res.status(404).json({ message: 'Session introuvable ou déjà terminée' })

    const tempsRestant = Math.max(0, Math.floor((new Date(session.fin).getTime() - Date.now()) / 1000))

    await prisma.$transaction(async (tx) => {
      await tx.session.update({ where: { id: sessionId }, data: { statut: 'ARRETEE', fin: new Date() } })
      await tx.poste.update({ where: { id: session.poste.id }, data: { statut: 'LIBRE' } })
      if (tempsRestant > 0) {
        const credit = await tx.credit.findFirst({ where: { clientId, categorieId: session.poste.categorieId } })
        if (credit) await tx.credit.update({ where: { id: credit.id }, data: { solde: credit.solde + tempsRestant } })
      }
    })

    const { getIO } = await import('../../socket.js')
    getIO().emit('session:stop', { sessionId, posteId: session.poste.id })

    return res.json({ message: 'Session arrêtée', tempsRestantConserve: tempsRestant })
  } catch (err) {
    console.error('[client/session/:id/stop POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

export const utiliserCoupon = async (req, res) => {
  const clientId = req.user.id
  const { code } = req.body
  if (!code) return res.status(400).json({ message: 'Code requis' })
  try {
    const coupon = await prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), salleId: req.user.salle_id, utilise: false }
    })
    if (!coupon) return res.status(404).json({ message: 'Coupon invalide ou déjà utilisé' })

    // Ajouter le crédit monétaire → on crédite toutes les catégories proportionnellement
    // Pour simplifier : on stocke en transaction
    await prisma.$transaction(async (tx) => {
      await tx.coupon.update({ where: { id: coupon.id }, data: { utilise: true } })
      await tx.transaction.create({
        data: { clientId, montant: coupon.valeur, type: 'RECHARGE_COUPON' }
      })
    })
    return res.json({ message: 'Coupon appliqué', valeur: coupon.valeur })
  } catch (err) {
    console.error('[client/coupon POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── GET /client/session/:id/categorie ───────────────────────────────────────
// Retourne la categorieId du poste de la session (pour charger les durées côté front)

export const getCategorieSession = async (req, res) => {
  const clientId = req.user.id
  const sessionId = Number(req.params.id)
  try {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, clientId, statut: 'ACTIVE' },
      include: { poste: { select: { categorieId: true, categorie: { select: { id: true, nom: true } } } } }
    })
    if (!session) return res.status(404).json({ message: 'Session active introuvable' })
    return res.json({ categorieId: session.poste.categorieId, categorie: session.poste.categorie })
  } catch (err) {
    console.error('[client/session/:id/categorie GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── POST /client/session/:id/prolonger ──────────────────────────────────────
// Le client prolonge sa propre session avec ses minutes, son solde monétaire ou ses bonus

export const prolongerSession = async (req, res) => {
  const clientId = req.user.id
  const sessionId = Number(req.params.id)
  const { dureeId, useBonus } = req.body

  if (!dureeId) return res.status(400).json({ message: 'dureeId requis' })

  try {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, clientId, statut: 'ACTIVE' },
      include: { poste: true }
    })
    if (!session) return res.status(404).json({ message: 'Session active introuvable' })

    const duree = await prisma.duree.findFirst({
      where: { id: Number(dureeId), categorieId: session.poste.categorieId }
    })
    if (!duree) return res.status(404).json({ message: 'Durée introuvable pour cette catégorie' })

    const tempsRestantActuel = Math.max(0, Math.floor((new Date(session.fin).getTime() - Date.now()) / 1000))
    const nouvelleFin = new Date(Date.now() + (tempsRestantActuel + duree.secondes) * 1000)

    // ── Mode bonus choisi explicitement par le client ──
    if (useBonus) {
      const bonus = await prisma.bonus.findUnique({ where: { clientId } })
      if (!bonus || !bonus.disponible || bonus.solde < duree.secondes) {
        return res.status(400).json({ message: 'Bonus indisponible ou insuffisant' })
      }

      await prisma.$transaction(async (tx) => {
        await tx.bonus.update({
          where: { id: bonus.id },
          data: { solde: { decrement: duree.secondes } }
        })
        await tx.session.update({
          where: { id: sessionId },
          data: { fin: nouvelleFin, tempsRestant: tempsRestantActuel + duree.secondes }
        })
      })

      try {
        const { scheduleSessionEnd, getSessionTimeouts } = await import('../gerant/sessions.controller.js')
        const timeouts = getSessionTimeouts()
        if (timeouts[sessionId]) { clearTimeout(timeouts[sessionId]); delete timeouts[sessionId] }
        scheduleSessionEnd(sessionId, session.poste.id, (tempsRestantActuel + duree.secondes) * 1000)
      } catch (e) {
        console.warn('[prolongerSession] scheduleSessionEnd non disponible:', e.message)
      }

      const { getIO } = await import('../../socket.js')
      try { getIO().emit('session:prolonged', { sessionId, posteId: session.poste.id, nouvelleFin }) } catch (e) {}

      return res.json({ message: `Session prolongée de ${duree.libelle} avec vos bonus`, nouvelleFin, tempsRestant: tempsRestantActuel + duree.secondes, modeBonus: true })
    }

    // ── Mode normal : crédit en secondes ou solde monétaire ──
    const credit = await prisma.credit.findFirst({
      where: { clientId, categorieId: session.poste.categorieId }
    })
    const soldeSecondes = credit?.solde ?? 0

    let modeAchat = false

    if (soldeSecondes < duree.secondes) {
      const user = await prisma.user.findUnique({
        where: { id: clientId },
        select: { transactions: { where: { type: { in: ['RECHARGE_GERANT', 'RECHARGE_COUPON', 'BONUS'] } }, select: { montant: true } } }
      })
      const totalEncaisse = (user?.transactions ?? []).reduce((s, t) => s + t.montant, 0)
      const depenses = await prisma.transaction.aggregate({
        where: { clientId, type: 'SESSION' },
        _sum: { montant: true }
      })
      const soldeMonetaire = totalEncaisse - (depenses._sum.montant ?? 0)

      if (soldeMonetaire >= duree.prix) {
        modeAchat = true
      } else {
        return res.status(400).json({
          message: `Crédit insuffisant. Disponible : ${Math.floor(soldeSecondes / 60)} min ou ${soldeMonetaire.toLocaleString()} F (requis : ${duree.prix.toLocaleString()} F)`
        })
      }
    }

    await prisma.$transaction(async (tx) => {
      if (modeAchat) {
        await tx.transaction.create({ data: { clientId, montant: duree.prix, type: 'SESSION' } })
      } else {
        await tx.credit.update({
          where: { id: credit.id },
          data: { solde: { decrement: duree.secondes } }
        })
      }
      await tx.session.update({
        where: { id: sessionId },
        data: { fin: nouvelleFin, tempsRestant: tempsRestantActuel + duree.secondes }
      })
    })

    try {
      const { scheduleSessionEnd, getSessionTimeouts } = await import('../gerant/sessions.controller.js')
      const timeouts = getSessionTimeouts()
      if (timeouts[sessionId]) { clearTimeout(timeouts[sessionId]); delete timeouts[sessionId] }
      scheduleSessionEnd(sessionId, session.poste.id, (tempsRestantActuel + duree.secondes) * 1000)
    } catch (e) {
      console.warn('[prolongerSession] scheduleSessionEnd non disponible:', e.message)
    }

    const { getIO } = await import('../../socket.js')
    try { getIO().emit('session:prolonged', { sessionId, posteId: session.poste.id, nouvelleFin }) } catch (e) {}

    return res.json({ message: `Session prolongée de ${duree.libelle}`, nouvelleFin, tempsRestant: tempsRestantActuel + duree.secondes, modeAchat })
  } catch (err) {
    console.error('[client/session/:id/prolonger POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
