/**
 * Service de reprise des timers de session au démarrage.
 * Quand le backend redémarre, tous les setTimeout sont perdus.
 * Ce service retrouve les sessions ACTIVE en base et replanifie leur fin automatique.
 */
import prisma from './prismaClient.js'
import logger from '../config/logger.js'

// Import différé pour éviter les dépendances circulaires
let scheduleSessionEndFn = null
let scheduleSessionCouponEndFn = null

export const initSessionScheduler = async () => {
  // Import dynamique pour éviter les dépendances circulaires
  const { scheduleSessionEnd } = await import('../modules/gerant/sessions.controller.js')
  scheduleSessionEndFn = scheduleSessionEnd

  try {
    const { scheduleSessionCouponEnd } = await import('../modules/gerant/sessionCoupon.controller.js')
    scheduleSessionCouponEndFn = scheduleSessionCouponEnd
  } catch (e) {
    // sessionCoupon pas encore disponible
  }

  await reprendre()
}

async function reprendre() {
  const maintenant = Date.now()

  // ─── Sessions normales actives ────────────────────────────────────────────
  try {
    const sessionsActives = await prisma.session.findMany({
      where: { statut: 'ACTIVE' },
      include: { poste: true }
    })

    let reprises = 0
    let expirees = 0

    for (const session of sessionsActives) {
      if (!session.fin) continue

      const finMs = new Date(session.fin).getTime()
      const delaiRestant = finMs - maintenant

      if (delaiRestant <= 0) {
        // Session déjà expirée pendant l'arrêt du backend → terminer immédiatement
        await terminerSessionExpiree(session.id, session.poste.id)
        expirees++
      } else {
        // Replanifier le timer
        scheduleSessionEndFn(session.id, session.poste.id, delaiRestant)
        reprises++
        logger.info(`[scheduler] Session ${session.id} — fin dans ${Math.round(delaiRestant / 1000)}s`)
      }
    }

    if (reprises > 0 || expirees > 0) {
      logger.info(`[scheduler] ${reprises} session(s) replanifiée(s), ${expirees} terminée(s) (expirées pendant l'arrêt)`)
    }
  } catch (err) {
    logger.error('[scheduler] Erreur sessions normales:', err.message)
  }

  // ─── Sessions coupon actives ──────────────────────────────────────────────
  if (!prisma.sessionAnonymeCoupon || !scheduleSessionCouponEndFn) return

  try {
    const couponActives = await prisma.sessionAnonymeCoupon.findMany({
      where: { statut: 'ACTIVE' },
      include: { poste: true }
    })

    let reprises = 0
    let expirees = 0

    for (const session of couponActives) {
      if (!session.fin) continue

      const finMs = new Date(session.fin).getTime()
      const delaiRestant = finMs - maintenant

      if (delaiRestant <= 0) {
        await terminerSessionCouponExpiree(session.id, session.poste.id)
        expirees++
      } else {
        scheduleSessionCouponEndFn(session.id, session.poste.id, delaiRestant)
        reprises++
        logger.info(`[scheduler] Session coupon ${session.id} — fin dans ${Math.round(delaiRestant / 1000)}s`)
      }
    }

    if (reprises > 0 || expirees > 0) {
      logger.info(`[scheduler] Coupon: ${reprises} replanifiée(s), ${expirees} terminée(s)`)
    }
  } catch (err) {
    logger.error('[scheduler] Erreur sessions coupon:', err.message)
  }
}

// Terminer immédiatement une session expirée pendant l'arrêt
async function terminerSessionExpiree(sessionId, posteId) {
  try {
    const { getIO } = await import('../socket.js')
    const { default: switchService } = await import('../switch/switchService.js')

    await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: sessionId },
        data: { statut: 'TERMINEE', tempsRestant: 0, fin: new Date() }
      })
      await tx.poste.update({
        where: { id: posteId },
        data: { statut: 'LIBRE' }
      })
    })

    try { await switchService.eteindrePoste(posteId) } catch (e) { /* mock */ }
    try { getIO().emit('session:end', { sessionId, posteId }) } catch (e) { /* socket pas dispo */ }

    logger.info(`[scheduler] Session ${sessionId} expirée terminée`)
  } catch (err) {
    logger.error(`[scheduler] Erreur terminaison session ${sessionId}:`, err.message)
  }
}

async function terminerSessionCouponExpiree(sessionId, posteId) {
  try {
    const { getIO } = await import('../socket.js')
    const { default: switchService } = await import('../switch/switchService.js')

    await prisma.$transaction(async (tx) => {
      const s = await tx.sessionAnonymeCoupon.findUnique({ where: { id: sessionId }, include: { duree: true } })
      if (!s) return
      await tx.sessionAnonymeCoupon.update({
        where: { id: sessionId },
        data: { statut: 'TERMINEE', fin: new Date(), secondesUtilisees: s.duree.secondes }
      })
      await tx.poste.update({ where: { id: posteId }, data: { statut: 'LIBRE' } })
    })

    try { await switchService.eteindrePoste(posteId) } catch (e) { /* mock */ }
    try { getIO().emit('session:end', { sessionId: `coupon-${sessionId}`, posteId }) } catch (e) { /* socket */ }

    logger.info(`[scheduler] Session coupon ${sessionId} expirée terminée`)
  } catch (err) {
    logger.error(`[scheduler] Erreur terminaison session coupon ${sessionId}:`, err.message)
  }
}
