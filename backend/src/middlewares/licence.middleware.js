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
  const url = req.originalUrl.split('?')[0]

  const exemptee =
    url === '/api/auth/login'      ||
    url === '/api/auth/register'   ||
    url.startsWith('/api/licence') ||
    url.startsWith('/api/setup')

  if (exemptee) return next()

  if (!licenceValide) {
    return res.status(403).json({
      message: 'Licence invalide ou expirée. Contactez votre administrateur.'
    })
  }

  next()
}