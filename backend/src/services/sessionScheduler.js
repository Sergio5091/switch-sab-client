/**
 * Service de reprise des timers de session au démarrage.
 * Quand le backend redémarre, tous les setTimeout sont perdus.
 * Ce service retrouve les sessions ACTIVE en base et replanifie leur fin automatique.
 */
import prisma from './prismaClient.js'
import logger from '../config/logger.js'

export const initSessionScheduler = async () => {
  const { scheduleSessionEnd } = await import('../modules/gerant/sessions.controller.js')
  await reprendre(scheduleSessionEnd)
}

async function reprendre(scheduleSessionEnd) {
  const maintenant = Date.now()

  try {
    const sessionsActives = await prisma.session.findMany({
      where: { statut: 'ACTIVE' },
      include: { poste: true }
    })

    let reprises = 0
    let expirees = 0

    for (const session of sessionsActives) {
      if (!session.fin) continue
      const delaiRestant = new Date(session.fin).getTime() - maintenant

      if (delaiRestant <= 0) {
        await terminerSessionExpiree(session.id, session.poste.id)
        expirees++
      } else {
        scheduleSessionEnd(session.id, session.poste.id, delaiRestant)
        reprises++
        logger.info(`[scheduler] Session ${session.id} — fin dans ${Math.round(delaiRestant / 1000)}s`)
      }
    }

    if (reprises > 0 || expirees > 0) {
      logger.info(`[scheduler] ${reprises} session(s) replanifiée(s), ${expirees} terminée(s)`)
    }
  } catch (err) {
    logger.error('[scheduler] Erreur sessions:', err.message)
  }
}

async function terminerSessionExpiree(sessionId, posteId) {
  try {
    const { getIO } = await import('../socket.js')
    // pas utilisé ici — le switch est importé plus bas

    await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: sessionId },
        data: { statut: 'TERMINEE', tempsRestant: 0, fin: new Date() }
      })
      await tx.poste.update({ where: { id: posteId }, data: { statut: 'LIBRE' } })
    })

    try {
      const switchService = await import('../switch/switchService.js')
      await switchService.eteindrePoste(posteId)
    } catch (e) { /* mock */ }
    try { getIO().emit('session:end', { sessionId, posteId }) } catch (e) { /* socket pas dispo */ }

    logger.info(`[scheduler] Session ${sessionId} expirée terminée`)
  } catch (err) {
    logger.error(`[scheduler] Erreur terminaison session ${sessionId}:`, err.message)
  }
}
