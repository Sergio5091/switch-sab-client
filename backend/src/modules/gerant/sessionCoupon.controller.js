import prisma from '../../services/prismaClient.js'
import * as switchService from '../../switch/switchService.js'
import { getIO } from '../../socket.js'
import logger from '../../config/logger.js'
import { scheduleSessionEnd } from './sessions.controller.js'

// ─── Nettoyage des sessions coupon orphelines au démarrage ───────────────────
// Si le backend redémarre avec des sessions ACTIVE en base, on les clôture
export const nettoyerSessionsCouponOrphelines = async () => {
  try {
    const orphelines = await prisma.sessionAnonymeCoupon.findMany({
      where: { statut: 'ACTIVE' },
      include: { poste: true }
    })
    if (orphelines.length === 0) return

    logger.warn(`[sessionCoupon] ${orphelines.length} session(s) coupon orpheline(s) détectée(s) — clôture automatique`)

    for (const s of orphelines) {
      await prisma.$transaction(async (tx) => {
        await tx.sessionAnonymeCoupon.update({
          where: { id: s.id },
          data: { statut: 'TERMINEE', fin: new Date() }
        })
        await tx.poste.update({
          where: { id: s.posteId },
          data: { statut: 'LIBRE' }
        })
      })
    }
    logger.info(`[sessionCoupon] Sessions orphelines clôturées`)
  } catch (err) {
    logger.error('[sessionCoupon] Erreur nettoyage orphelines:', err.message)
  }
}

// ─── POST /gerant/sessions/coupon → Session anonyme avec coupon ──────────────
// Le joueur n'a pas de compte. Il paie avec un coupon.
// Logique :
//   - Coupon de 2000F → session de 1000F → solde restant 1000F conservé
//   - La prochaine fois, il peut réutiliser le même coupon pour une autre session

export const demarrerSessionCoupon = async (req, res) => {
  const { codeCoupon, categorieId, dureeId, posteId } = req.body

  if (!codeCoupon || !categorieId || !dureeId || !posteId) {
    return res.status(400).json({
      message: 'codeCoupon, categorieId, dureeId et posteId sont requis'
    })
  }

  try {
    // 1. Trouver le coupon — actif OU avec solde restant
    let coupon = await prisma.coupon.findFirst({
      where: {
        code: codeCoupon.trim().toUpperCase(),
        salleId: req.user.salle_id,
      },
      include: {
        sessionAnonymeCoupons: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    })

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon introuvable pour cette salle' })
    }

    // Calculer le solde disponible sur ce coupon
    const totalDepense = await prisma.sessionAnonymeCoupon.aggregate({
      where: { couponId: coupon.id, statut: { in: ['TERMINEE', 'ARRETEE', 'ACTIVE'] } },
      _sum: { secondesUtilisees: true }
    })

    // Convertir les secondes utilisées en montant (via les durées)
    // Solde restant = valeur coupon - montant des sessions passées
    const sessionsPassees = await prisma.sessionAnonymeCoupon.findMany({
      where: { couponId: coupon.id },
      include: { duree: true }
    })
    const montantDepense = sessionsPassees
      .filter(s => s.statut !== 'ACTIVE') // exclure session en cours
      .reduce((sum, s) => sum + s.duree.prix, 0)

    const soldeDisponible = coupon.valeur - montantDepense

    // Vérifier si une session est déjà active sur ce coupon
    const sessionActiveExistante = sessionsPassees.find(s => s.statut === 'ACTIVE')
    if (sessionActiveExistante) {
      return res.status(400).json({
        message: 'Ce coupon a déjà une session en cours'
      })
    }

    // 2. Vérifier la durée choisie
    const duree = await prisma.duree.findFirst({
      where: { id: Number(dureeId), categorieId: Number(categorieId) }
    })
    if (!duree) {
      return res.status(404).json({ message: 'Durée introuvable' })
    }

    // Vérifier que le solde coupon couvre la session
    if (soldeDisponible < duree.prix) {
      return res.status(400).json({
        message: `Solde insuffisant sur le coupon. Disponible : ${soldeDisponible.toLocaleString()} F — Requis : ${duree.prix.toLocaleString()} F`
      })
    }

    // 3. Vérifier le poste choisi
    const poste = await prisma.poste.findFirst({
      where: {
        id: Number(posteId),
        categorieId: Number(categorieId),
        statut: 'LIBRE'
      }
    })
    if (!poste) {
      return res.status(400).json({ message: 'Poste indisponible ou occupé' })
    }

    // 4. TRANSACTION : créer session + marquer poste occupé
    const finPrevue = new Date(Date.now() + duree.secondes * 1000)

    const sessionCoupon = await prisma.$transaction(async (tx) => {
      const s = await tx.sessionAnonymeCoupon.create({
        data: {
          couponId: coupon.id,
          salleId: req.user.salle_id,
          posteId: Number(posteId),
          dureeId: Number(dureeId),
          secondesUtilisees: 0,
          soldeRestant: soldeDisponible - duree.prix,
          statut: 'ACTIVE',
          fin: finPrevue,
          gerantId: req.user.id,
        },
        include: { poste: true, duree: true, coupon: true }
      })

      await tx.poste.update({
        where: { id: Number(posteId) },
        data: { statut: 'OCCUPE' }
      })

      // Marquer le coupon comme "en cours" si c'est la première utilisation
      // utilise = true signifie soit en cours, soit épuisé
      // On le marque true dès la première session pour qu'il n'apparaisse plus comme "actif"
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { utilise: true }
      })

      return s
    })

    // 5. Switch + Socket
    try { await switchService.allumerPoste(poste.id) } catch (e) { /* mock */ }

    getIO().emit('session:start', {
      sessionId: `coupon-${sessionCoupon.id}`,
      posteId: poste.id,
      finPrevue,
      estCoupon: true
    })

    // 6. Timer fin automatique
    scheduleSessionCouponEnd(sessionCoupon.id, poste.id, duree.secondes * 1000)

    logger.info(`Session coupon démarrée : coupon ${coupon.code} — poste ${poste.nom} — ${duree.libelle}`)

    return res.status(201).json({
      message: 'Session démarrée',
      sessionId: sessionCoupon.id,
      codeCoupon: coupon.code,
      poste: poste.nom,
      duree: duree.libelle,
      finPrevue,
      soldeRestant: soldeDisponible - duree.prix,
    })
  } catch (err) {
    console.error('[gerant/sessions/coupon POST]', err)
    return res.status(500).json({ message: `Erreur serveur : ${err.message}` })
  }
}

// ─── POST /gerant/sessions/coupon/:id/arreter ─────────────────────────────────

export const arreterSessionCoupon = async (req, res) => {
  const id = Number(req.params.id)
  try {
    const session = await prisma.sessionAnonymeCoupon.findFirst({
      where: { id, statut: 'ACTIVE' },
      include: { poste: true, duree: true }
    })
    if (!session) return res.status(404).json({ message: 'Session introuvable' })

    const secondesEcoulees = Math.floor((Date.now() - session.debut.getTime()) / 1000)
    const secondesUtilisees = Math.min(secondesEcoulees, session.duree.secondes)

    await prisma.$transaction(async (tx) => {
      await tx.sessionAnonymeCoupon.update({
        where: { id },
        data: { statut: 'ARRETEE', fin: new Date(), secondesUtilisees }
      })
      await tx.poste.update({
        where: { id: session.poste.id },
        data: { statut: 'LIBRE' }
      })
    })

    try { await switchService.eteindrePoste(session.poste.id) } catch (e) { /* mock */ }
    getIO().emit('session:stop', { sessionId: `coupon-${id}`, posteId: session.poste.id })

    return res.json({ message: 'Session arrêtée', soldeRestant: session.soldeRestant })
  } catch (err) {
    return res.status(500).json({ message: `Erreur serveur : ${err.message}` })
  }
}

// ─── GET /gerant/sessions/coupon/solde → Consulter solde d'un coupon ─────────

export const getSoldeCoupon = async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ message: 'code requis' })

  try {
    const coupon = await prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), salleId: req.user.salle_id }
    })
    if (!coupon) return res.status(404).json({ message: 'Coupon introuvable' })

    // Guard : si la table n'existe pas encore (migration pas appliquée)
    if (!prisma.sessionAnonymeCoupon) {
      return res.status(503).json({
        message: 'Migration en attente. Lancez : npx prisma migrate dev'
      })
    }

    const sessions = await prisma.sessionAnonymeCoupon.findMany({
      where: { couponId: coupon.id },
      include: { duree: true }
    })

    const montantDepense = sessions
      .filter(s => s.statut !== 'ACTIVE')
      .reduce((sum, s) => sum + s.duree.prix, 0)

    const sessionActive = sessions.find(s => s.statut === 'ACTIVE')
    const soldeDisponible = coupon.valeur - montantDepense

    return res.json({
      code: coupon.code,
      valeurInitiale: coupon.valeur,
      montantDepense,
      soldeDisponible,
      sessionActive: sessionActive ? { id: sessionActive.id, fin: sessionActive.fin } : null,
      nbSessions: sessions.filter(s => s.statut !== 'ACTIVE').length,
    })
  } catch (err) {
    console.error('[getSoldeCoupon]', err)
    return res.status(500).json({ message: `Erreur serveur : ${err.message}` })
  }
}

// ─── Fin automatique session coupon ──────────────────────────────────────────

const couponSessionTimeouts = {}

export function scheduleSessionCouponEnd(sessionId, posteId, delayMs) {
  couponSessionTimeouts[sessionId] = setTimeout(async () => {
    delete couponSessionTimeouts[sessionId]
    try {
      const session = await prisma.sessionAnonymeCoupon.findUnique({
        where: { id: sessionId },
        include: { duree: true }
      })
      if (!session || session.statut !== 'ACTIVE') return

      await prisma.$transaction(async (tx) => {
        await tx.sessionAnonymeCoupon.update({
          where: { id: sessionId },
          data: { statut: 'TERMINEE', fin: new Date(), secondesUtilisees: session.duree.secondes }
        })
        await tx.poste.update({
          where: { id: posteId },
          data: { statut: 'LIBRE' }
        })
      })

      try { await switchService.eteindrePoste(posteId) } catch (e) { /* mock */ }
      getIO().emit('session:end', { sessionId: `coupon-${sessionId}`, posteId })
      logger.info(`Session coupon terminée auto : ${sessionId}`)
    } catch (err) {
      logger.error(`Erreur fin auto session coupon ${sessionId}:`, err.message)
    }
  }, delayMs)
}
