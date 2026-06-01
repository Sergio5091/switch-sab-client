import prisma from '../services/prismaClient.js'
import logger from '../config/logger.js'

let licenceValide = false

/**
 * Vérifie la licence au démarrage du serveur.
 * Appelé une fois dans index.js avant de monter les routes.
 */
export const checkLicenceAtStartup = async () => {
  try {
    const licence = await prisma.licenceLocale.findFirst({
      where: { status: 'ACTIVE' }
    })

    if (!licence) {
      logger.warn('Aucune licence active trouvée.')
      licenceValide = false
      return
    }

    const expiree = new Date(licence.expiresAt) < new Date()
    if (expiree) {
      logger.warn('Licence expirée.')
      licenceValide = false
      return
    }

    // TODO Phase 1 — vérification signature RSA
    // const valide = verifyLicencePayload(payload, licence.signature)

    licenceValide = true
    logger.info(`Licence valide jusqu'au ${licence.expiresAt.toISOString().split('T')[0]}`)
  } catch (err) {
    logger.error('Erreur vérification licence :', err.message)
    licenceValide = false
  }
}

/**
 * Middleware Express — bloque les routes si la licence est invalide.
 * Ne bloque PAS /auth/login et /licence/activer.
 */
export const requireLicence = (req, res, next) => {
  const exemptees = ['/auth/login', '/auth/register', '/licence/activer', '/licence/statut']
  if (exemptees.includes(req.path) || exemptees.includes(req.originalUrl.split('?')[0])) return next()

  if (!licenceValide) {
    return res.status(403).json({
      message: 'Licence invalide ou expirée. Contactez votre administrateur.'
    })
  }
  next()
}
