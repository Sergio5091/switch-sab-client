import cron from 'node-cron'
import { envoyerRapportVeille } from './rapportMailService.js'
import logger from '../config/logger.js'

/**
 * Démarre le scheduler d'envoi automatique des rapports.
 * Par défaut : chaque jour à 07h00 heure locale.
 * Configurable via RAPPORT_CRON dans .env (syntaxe cron standard).
 *
 * Exemples :
 *   '0 7 * * *'   → tous les jours à 07:00
 *   '0 8 * * 1-5' → du lundi au vendredi à 08:00
 */
export function demarrerSchedulerRapport() {
  const expression = process.env.RAPPORT_CRON || '0 7 * * *'

  if (!cron.validate(expression)) {
    logger.error(`[rapport-scheduler] Expression cron invalide : "${expression}"`)
    return
  }

  cron.schedule(expression, async () => {
    logger.info('[rapport-scheduler] Déclenchement envoi rapport veille...')
    try {
      await envoyerRapportVeille()
    } catch (err) {
      logger.error('[rapport-scheduler] Erreur lors de l\'envoi :', err.message)
    }
  }, {
    timezone: process.env.TZ || 'Africa/Porto-Novo'
  })

  logger.info(`[rapport-scheduler] Planifié — expression: "${expression}" (tz: ${process.env.TZ || 'Africa/Porto-Novo'})`)
}
