import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'

// ─── Utilitaire : calcul solde monétaire depuis User.solde ───────────────────
// User.solde est le seul champ qui représente le solde FCFA du client.
// Incrémenté par :
//   - utiliserCoupon (coupon côté client)
//   - bonus de parrainage (parrain + filleul dans gerant/clients.controller.js)
// Débité par :
//   - startSession en modeAchat (pas assez de minutes)
//   - prolongerSession en modeAchat

async function getSoldeMonetaire(clientId) {
  const user = await prisma.user.findUnique({
    where: { id: clientId },
    select: { solde: true }
  })
  return user?.solde ?? 0
}

// ─── GET /client/home ────────────────────────────────────────────────────────

export const getHome = async (req, res) => {
  const clientId = req.user.id
  try {
    const user = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true, pseudo: true, salleId: true, solde: true,
        credits: { select: { solde: true, categorie: { select: { id: true, nom: true } } } },
<<<<<<< HEAD
        bonus: { select: { solde: true, disponible: true } },
        transactions: {
          select: { montant: true, type: true },
          where: { type: { in: ['RECHARGE_COUPON', 'SESSION'] } }
        },
=======
        bonus:   { select: { solde: true, disponible: true } },
>>>>>>> origin/dev/ok
        sessions: {
          where: { statut: { in: ['ACTIVE', 'ARRETEE', 'TERMINEE'] } },
          select: {
            id: true, statut: true, fin: true, estBonus: true, debut: true, tempsRestant: true,
            duree: { select: { libelle: true, secondes: true, prix: true } },
            poste: { select: { nom: true, categorieId: true } }
          },
          orderBy: { debut: 'desc' }, take: 10
        }
      }
    })
    if (!user) return res.status(404).json({ message: 'Client introuvable' })

<<<<<<< HEAD
    const soldeCoupon = user.transactions
      .filter(t => t.type === 'RECHARGE_COUPON').reduce((s, t) => s + t.montant, 0)
    const depenses = user.transactions
      .filter(t => t.type === 'SESSION').reduce((s, t) => s + t.montant, 0)
    const soldeMonetaire = Math.max(0, soldeCoupon - depenses)
=======
    const toutesCategories = await prisma.categorie.findMany({
      where: { salleId: user.salleId },
      select: { id: true, nom: true }
    })

    const credits = toutesCategories.map(cat => {
      const creditExistant = user.credits.find(c => c.categorie.id === cat.id)
      return { solde: creditExistant?.solde ?? 0, categorie: cat }
    })

    // Recalculer disponible dynamiquement selon le seuil configuré
    let bonusData = user.bonus
    if (bonusData && bonusData.solde > 0) {
      const configBonus = await prisma.configBonus.findUnique({ where: { salleId: user.salleId } })
      const seuil = configBonus?.seuilDeblocage ?? 0
      const disponibleCalcule = bonusData.solde >= seuil
      if (disponibleCalcule !== bonusData.disponible) {
        await prisma.bonus.update({ where: { clientId }, data: { disponible: disponibleCalcule } })
        bonusData = { ...bonusData, disponible: disponibleCalcule }
      }
    }
>>>>>>> origin/dev/ok

    return res.json({
      pseudo: user.pseudo,
      credits,
      bonus: bonusData,
      soldeMonetaire: user.solde ?? 0,
      activeSession:  user.sessions.find(s => s.statut === 'ACTIVE')   ?? null,
      pausedSession:  user.sessions.find(s => s.statut === 'ARRETEE' && s.tempsRestant > 0) ?? null,
      recentSessions: user.sessions.filter(s => s.statut === 'TERMINEE')
    })
  } catch (err) {
    console.error('[client/home GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── GET /client/sessions ────────────────────────────────────────────────────

export const getSessions = async (req, res) => {
  const clientId = req.user.id
  try {
    const sessions = await prisma.session.findMany({
      where: { clientId },
      select: {
        id: true, statut: true, fin: true, debut: true, estBonus: true, tempsRestant: true,
        duree: { select: { libelle: true, secondes: true, prix: true } },
        poste: { select: { nom: true } }
      },
      orderBy: { debut: 'desc' }
    })
    return res.json(sessions)
  } catch (err) {
    console.error('[client/sessions GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── GET /client/leaderboard ─────────────────────────────────────────────────

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
      .map(c => ({
        id: c.id, pseudo: c.pseudo,
        totalSecondes: c.sessions.reduce((s, sess) => s + (sess.duree?.secondes ?? 0), 0)
      }))
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
    const duree = await prisma.duree.findFirst({
      where: { id: Number(dureeId), categorieId: Number(categorieId) }
    })
    if (!duree) return res.status(404).json({ message: 'Durée introuvable' })

    const posteLibre = await prisma.poste.findFirst({
      where: { categorieId: Number(categorieId), statut: 'LIBRE' }
    })
    if (!posteLibre) return res.status(400).json({ message: 'Aucun poste libre dans cette catégorie' })

    // ── Mode bonus choisi par le client ──────────────────────────────────
    if (useBonus) {
      const bonus = await prisma.bonus.findUnique({ where: { clientId } })
      if (!bonus || !bonus.disponible || bonus.solde < duree.secondes) {
        return res.status(400).json({ message: 'Bonus indisponible ou insuffisant pour cette durée' })
      }
      const finPrevue = new Date(Date.now() + duree.secondes * 1000)
      const session = await prisma.$transaction(async (tx) => {
        await tx.bonus.update({ where: { id: bonus.id }, data: { solde: { decrement: duree.secondes } } })
        const s = await tx.session.create({
          data: { clientId, gerantId: clientId, posteId: posteLibre.id, dureeId: Number(dureeId), tempsRestant: duree.secondes, fin: finPrevue, statut: 'ACTIVE', estBonus: true }
        })
        await tx.poste.update({ where: { id: posteLibre.id }, data: { statut: 'OCCUPE' } })
        return s
      })
      const { getIO } = await import('../../socket.js')
      try { getIO().emit('session:start', { sessionId: session.id, posteId: posteLibre.id, clientId, finPrevue, estBonus: true }) } catch (e) {}
      try {
        const { scheduleSessionEnd } = await import('../gerant/sessions.controller.js')
        scheduleSessionEnd(session.id, posteLibre.id, duree.secondes * 1000)
      } catch (e) { console.warn('[startSession useBonus] scheduleSessionEnd:', e.message) }
      return res.status(201).json({ message: 'Session démarrée avec vos bonus', sessionId: session.id, finPrevue, modeBonus: true })
    }

    // ── Mode normal : crédit en secondes ou solde monétaire ──────────────
    const credit = await prisma.credit.findFirst({
      where: { clientId, categorieId: Number(categorieId) }
    })
    const soldeSecondes = credit?.solde ?? 0
    const soldeMonetaire = await getSoldeMonetaire(clientId)

    let modeAchat = false

    if (soldeSecondes >= duree.secondes) {
      modeAchat = false
    } else if (soldeMonetaire >= duree.prix) {
      modeAchat = true
    } else {
      return res.status(400).json({
        message: `Crédit insuffisant. Disponible : ${Math.floor(soldeSecondes / 60)} min ou ${soldeMonetaire.toLocaleString()} F (requis : ${duree.prix.toLocaleString()} F)`
      })
    }

    const finPrevue = new Date(Date.now() + duree.secondes * 1000)

    const session = await prisma.$transaction(async (tx) => {
      if (modeAchat) {
        await tx.user.update({ where: { id: clientId }, data: { solde: { decrement: duree.prix } } })
      } else {
        await tx.credit.update({ where: { id: credit.id }, data: { solde: { decrement: duree.secondes } } })
      }
      const s = await tx.session.create({
        data: { clientId, gerantId: clientId, posteId: posteLibre.id, dureeId: Number(dureeId), tempsRestant: duree.secondes, fin: finPrevue, statut: 'ACTIVE', estBonus: false }
      })
      await tx.poste.update({ where: { id: posteLibre.id }, data: { statut: 'OCCUPE' } })
      return s
    })

    const { getIO } = await import('../../socket.js')
    try { getIO().emit('session:start', { sessionId: session.id, posteId: posteLibre.id, clientId, finPrevue }) } catch (e) {}
    try {
      const { scheduleSessionEnd } = await import('../gerant/sessions.controller.js')
      scheduleSessionEnd(session.id, posteLibre.id, duree.secondes * 1000)
    } catch (e) { console.warn('[startSession] scheduleSessionEnd non disponible:', e.message) }

    return res.status(201).json({ message: 'Session démarrée', sessionId: session.id, finPrevue, modeAchat })
  } catch (err) {
    console.error('[client/session/start POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── POST /client/session/:id/stop ───────────────────────────────────────────

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
      await tx.session.update({
        where: { id: sessionId },
        data: { statut: 'ARRETEE', fin: new Date(), tempsRestant }
      })
      await tx.poste.update({ where: { id: session.poste.id }, data: { statut: 'LIBRE' } })
    })

    const { getIO } = await import('../../socket.js')
    try { getIO().emit('session:stop', { sessionId, posteId: session.poste.id }) } catch (e) {}

    return res.json({
      message: tempsRestant > 0
        ? `Session mise en pause — ${Math.floor(tempsRestant / 60)} min conservées`
        : 'Session arrêtée',
      tempsRestantConserve: tempsRestant
    })
  } catch (err) {
    console.error('[client/session/:id/stop POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

<<<<<<< HEAD
export const acheterCredit = async (req, res) => {
  const clientId = req.user.id
  const { categorieId, dureeId } = req.body

  if (!categorieId || !dureeId) {
    return res.status(400).json({ message: 'categorieId et dureeId requis' })
  }

  try {
    // Vérifier la catégorie
    const categorie = await prisma.categorie.findFirst({
      where: { id: Number(categorieId), salleId: req.user.salle_id }
    })
    if (!categorie) return res.status(404).json({ message: 'Catégorie introuvable' })

    // Vérifier la durée
    const duree = await prisma.duree.findFirst({
      where: { id: Number(dureeId), categorieId: Number(categorieId) }
    })
    if (!duree) return res.status(404).json({ message: 'Durée introuvable' })

    // Calculer le solde coupon disponible
    const transactions = await prisma.transaction.findMany({
      where: { clientId, type: 'RECHARGE_COUPON' },
      select: { montant: true }
    })
    const achats = await prisma.transaction.findMany({
      where: { clientId, type: 'SESSION' },
      select: { montant: true }
    })
    const soldeCoupon = transactions.reduce((s, t) => s + t.montant, 0)
      - achats.reduce((s, t) => s + t.montant, 0)

    if (soldeCoupon < duree.prix) {
      return res.status(400).json({
        message: `Solde insuffisant. Disponible : ${soldeCoupon} FCFA, requis : ${duree.prix} FCFA`
      })
    }

    // TRANSACTION : déduire solde + créditer minutes
    await prisma.$transaction(async (tx) => {
      // Enregistrer la dépense
      await tx.transaction.create({
        data: { clientId, montant: duree.prix, type: 'SESSION' }
      })

      // Créditer les minutes sur la catégorie
      const credit = await tx.credit.findFirst({
        where: { clientId, categorieId: Number(categorieId) }
      })

      if (credit) {
        await tx.credit.update({
          where: { id: credit.id },
          data: { solde: credit.solde + duree.secondes }
        })
      } else {
        await tx.credit.create({
          data: { clientId, categorieId: Number(categorieId), solde: duree.secondes }
        })
      }
    })

    return res.status(201).json({
      message: `${duree.libelle} crédité sur ${categorie.nom}`,
      minutesCredit: Math.floor(duree.secondes / 60),
      soldeRestant: soldeCoupon - duree.prix
    })
  } catch (err) {
    console.error('[client/acheter-credit POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
=======
// ─── POST /client/coupon ─────────────────────────────────────────────────────
// Seule opération qui incrémente User.solde
>>>>>>> origin/dev/ok

export const utiliserCoupon = async (req, res) => {
  const clientId = req.user.id
  const { code } = req.body
  if (!code) return res.status(400).json({ message: 'Code requis' })
  try {
    const coupon = await prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), salleId: req.user.salle_id, utilise: false }
    })
    if (!coupon) return res.status(404).json({ message: 'Coupon invalide ou déjà utilisé' })

    await prisma.$transaction(async (tx) => {
      await tx.coupon.update({ where: { id: coupon.id }, data: { utilise: true } })
      // Incrémenter User.solde — seule source du solde monétaire client
      await tx.user.update({
        where: { id: clientId },
        data: { solde: { increment: coupon.valeur } }
      })
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

    // ── Mode bonus ────────────────────────────────────────────────────────
    if (useBonus) {
      const bonus = await prisma.bonus.findUnique({ where: { clientId } })
      if (!bonus || !bonus.disponible || bonus.solde < duree.secondes) {
        return res.status(400).json({ message: 'Bonus indisponible ou insuffisant pour cette durée' })
      }
      await prisma.$transaction(async (tx) => {
        await tx.bonus.update({ where: { id: bonus.id }, data: { solde: { decrement: duree.secondes } } })
        await tx.session.update({ where: { id: sessionId }, data: { fin: nouvelleFin, tempsRestant: tempsRestantActuel + duree.secondes } })
      })
      try {
        const { scheduleSessionEnd, getSessionTimeouts } = await import('../gerant/sessions.controller.js')
        const timeouts = getSessionTimeouts()
        if (timeouts[sessionId]) { clearTimeout(timeouts[sessionId]); delete timeouts[sessionId] }
        scheduleSessionEnd(sessionId, session.poste.id, (tempsRestantActuel + duree.secondes) * 1000)
      } catch (e) { console.warn('[prolongerSession useBonus] scheduleSessionEnd:', e.message) }
      const { getIO } = await import('../../socket.js')
      try { getIO().emit('session:prolonged', { sessionId, posteId: session.poste.id, nouvelleFin }) } catch (e) {}
      return res.json({ message: `Session prolongée de ${duree.libelle} avec vos bonus`, nouvelleFin, tempsRestant: tempsRestantActuel + duree.secondes, modeBonus: true })
    }

    // ── Mode normal : minutes ou solde ────────────────────────────────────
    const credit = await prisma.credit.findFirst({
      where: { clientId, categorieId: session.poste.categorieId }
    })
    const soldeSecondes = credit?.solde ?? 0
    const soldeMonetaire = await getSoldeMonetaire(clientId)

    let modeAchat = false
    if (soldeSecondes >= duree.secondes) {
      modeAchat = false
    } else if (soldeMonetaire >= duree.prix) {
      modeAchat = true
    } else {
      return res.status(400).json({
        message: `Crédit insuffisant. Disponible : ${Math.floor(soldeSecondes / 60)} min ou ${soldeMonetaire.toLocaleString()} F (requis : ${duree.prix.toLocaleString()} F)`
      })
    }

    await prisma.$transaction(async (tx) => {
      if (modeAchat) {
        await tx.user.update({ where: { id: clientId }, data: { solde: { decrement: duree.prix } } })
      } else {
        await tx.credit.update({ where: { id: credit.id }, data: { solde: { decrement: duree.secondes } } })
      }
      await tx.session.update({ where: { id: sessionId }, data: { fin: nouvelleFin, tempsRestant: tempsRestantActuel + duree.secondes } })
    })

    try {
      const { scheduleSessionEnd, getSessionTimeouts } = await import('../gerant/sessions.controller.js')
      const timeouts = getSessionTimeouts()
      if (timeouts[sessionId]) { clearTimeout(timeouts[sessionId]); delete timeouts[sessionId] }
      scheduleSessionEnd(sessionId, session.poste.id, (tempsRestantActuel + duree.secondes) * 1000)
    } catch (e) { console.warn('[prolongerSession] scheduleSessionEnd non disponible:', e.message) }

    const { getIO } = await import('../../socket.js')
    try { getIO().emit('session:prolonged', { sessionId, posteId: session.poste.id, nouvelleFin }) } catch (e) {}

    return res.json({ message: `Session prolongée de ${duree.libelle}`, nouvelleFin, tempsRestant: tempsRestantActuel + duree.secondes, modeAchat })
  } catch (err) {
    console.error('[client/session/:id/prolonger POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── POST /client/session/:id/reprendre ──────────────────────────────────────
// Réactive une session ARRETEE avec le temps restant conservé

export const reprendreSession = async (req, res) => {
  const clientId = req.user.id
  const sessionId = Number(req.params.id)

  try {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, clientId, statut: 'ARRETEE' },
      include: { poste: { include: { categorie: true } } }
    })
    if (!session) return res.status(404).json({ message: 'Session en pause introuvable' })
    if (session.tempsRestant <= 0) return res.status(400).json({ message: 'Aucun temps restant pour reprendre' })

    // Vérifier qu'il n'y a pas déjà une session active
    const dejaActive = await prisma.session.findFirst({ where: { clientId, statut: 'ACTIVE' } })
    if (dejaActive) return res.status(400).json({ message: 'Vous avez déjà une session active' })

    const posteLibre = await prisma.poste.findFirst({
      where: { categorieId: session.poste.categorieId, statut: 'LIBRE' }
    })
    if (!posteLibre) return res.status(400).json({
      message: `Aucun poste libre dans la catégorie ${session.poste.categorie.nom}`
    })

    const nouvelleFin = new Date(Date.now() + session.tempsRestant * 1000)

    await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: sessionId },
        data: { statut: 'ACTIVE', posteId: posteLibre.id, fin: nouvelleFin, tempsRestant: session.tempsRestant }
      })
      await tx.poste.update({ where: { id: posteLibre.id }, data: { statut: 'OCCUPE' } })
    })

    try {
      const { scheduleSessionEnd } = await import('../gerant/sessions.controller.js')
      scheduleSessionEnd(sessionId, posteLibre.id, session.tempsRestant * 1000)
    } catch (e) { console.warn('[reprendreSession] scheduleSessionEnd:', e.message) }

    const { getIO } = await import('../../socket.js')
    try { getIO().emit('session:start', { sessionId, posteId: posteLibre.id, clientId, finPrevue: nouvelleFin, estReprise: true }) } catch (e) {}

    return res.json({ message: 'Session reprise', sessionId, posteNom: posteLibre.nom, finPrevue: nouvelleFin, tempsRestant: session.tempsRestant })
  } catch (err) {
    console.error('[client/session/:id/reprendre POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
