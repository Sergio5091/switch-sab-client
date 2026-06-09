import prisma from '../../services/prismaClient.js'
import bcrypt from 'bcryptjs'

// ─── GET /client/home ────────────────────────────────────────────────────

export const getHome = async (req, res) => {
  const clientId = req.user.id
  try {
    const user = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true, pseudo: true,
        credits: { select: { solde: true, categorie: { select: { id: true, nom: true } } } },
        bonus: { select: { solde: true, disponible: true } },
        transactions: {
          select: { montant: true, type: true },
          where: { type: { in: ['RECHARGE_COUPON', 'SESSION'] } }
        },
        sessions: {
          where: { statut: { in: ['ACTIVE', 'ARRETEE', 'TERMINEE'] } },
          select: { id: true, statut: true, fin: true, estBonus: true, debut: true, duree: { select: { libelle: true, secondes: true, prix: true } }, poste: { select: { nom: true } } },
          orderBy: { debut: 'desc' }, take: 10
        }
      }
    })
    if (!user) return res.status(404).json({ message: 'Client introuvable' })

    const soldeCoupon = user.transactions
      .filter(t => t.type === 'RECHARGE_COUPON').reduce((s, t) => s + t.montant, 0)
    const depenses = user.transactions
      .filter(t => t.type === 'SESSION').reduce((s, t) => s + t.montant, 0)
    const soldeMonetaire = Math.max(0, soldeCoupon - depenses)

    return res.json({
      pseudo: user.pseudo,
      credits: user.credits,
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
  const { categorieId, dureeId } = req.body
  if (!categorieId || !dureeId) return res.status(400).json({ message: 'categorieId et dureeId requis' })

  try {
    const duree = await prisma.duree.findFirst({ where: { id: Number(dureeId), categorieId: Number(categorieId) } })
    if (!duree) return res.status(404).json({ message: 'Durée introuvable' })

    const credit = await prisma.credit.findFirst({ where: { clientId, categorieId: Number(categorieId) } })
    if (!credit || credit.solde < duree.secondes) return res.status(400).json({ message: 'Crédit insuffisant' })

    const posteLibre = await prisma.poste.findFirst({ where: { categorieId: Number(categorieId), statut: 'LIBRE' } })
    if (!posteLibre) return res.status(400).json({ message: 'Aucun poste libre dans cette catégorie' })

    const finPrevue = new Date(Date.now() + duree.secondes * 1000)

    const session = await prisma.$transaction(async (tx) => {
      await tx.credit.update({ where: { id: credit.id }, data: { solde: credit.solde - duree.secondes } })
      const s = await tx.session.create({
        data: { clientId, gerantId: clientId, posteId: posteLibre.id, dureeId: Number(dureeId), tempsRestant: duree.secondes, fin: finPrevue, statut: 'ACTIVE', estBonus: false },
      })
      await tx.poste.update({ where: { id: posteLibre.id }, data: { statut: 'OCCUPE' } })
      return s
    })

    const { getIO } = await import('../../socket.js')
    getIO().emit('session:start', { sessionId: session.id, posteId: posteLibre.id, clientId, finPrevue })

    const { scheduleSessionEnd } = await import('../gerant/sessions.controller.js')
    scheduleSessionEnd(session.id, posteLibre.id, duree.secondes * 1000)

    return res.status(201).json({ message: 'Session démarrée', sessionId: session.id, finPrevue })
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
