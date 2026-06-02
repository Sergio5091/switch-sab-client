import prisma from '../services/prismaClient.js'
import { verifierLicence } from '../services/licenceService.js'
import logger from '../config/logger.js'

let licenceValide = false

// ─── Vérification au démarrage ────────────────────────────────────────────────

export const checkLicenceAtStartup = async () => {
  await _verifier()
}

/**
 * Recharge l'état de la licence (appelé après POST /licence/activer).
 */
export const reloadLicence = async () => {
  await _verifier()
}

const _verifier = async () => {
  try {
    const licence = await prisma.licenceLocale.findFirst({
      where: { status: 'ACTIVE' }
    })

    if (!licence) {
      logger.warn('Aucune licence active trouvée.')
      licenceValide = false
      return
    }

    const resultat = verifierLicence(licence)

    if (!resultat.valide) {
      logger.warn(`Licence invalide : ${resultat.raison}`)
      licenceValide = false
      return
    }

    licenceValide = true
    logger.info(`✅ Licence valide — ${resultat.joursRestants} jour(s) restant(s)`)
  } catch (err) {
    logger.error('Erreur vérification licence :', err.message)
    licenceValide = false
  }
}

// ─── Middleware Express ───────────────────────────────────────────────────────

/**
 * Bloque toutes les routes si la licence est invalide.
 * Routes exemptées : /api/auth/login, /api/auth/register, /api/licence/*
 */
export const requireLicence = (req, res, next) => {
  const originalUrl = req.originalUrl.split('?')[0]

  console.log('[requireLicence] originalUrl:', originalUrl, 'licenceValide:', licenceValide)

  const exemptee =
    originalUrl === '/api/auth/login'      ||
    originalUrl === '/api/auth/register'   ||
    originalUrl.startsWith('/api/licence')

  if (exemptee) {
    console.log('[requireLicence] Route exemptée')
    return next()
  }

  if (!licenceValide) {
    console.log('[requireLicence] Licence invalide - bloqué')
    return res.status(403).json({
      message: 'Licence invalide ou expirée. Contactez votre administrateur.'
    })
  }

  console.log('[requireLicence] Licence OK - autorisé')
  next()
}