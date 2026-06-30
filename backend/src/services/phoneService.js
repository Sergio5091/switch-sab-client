import { parsePhoneNumber, isValidPhoneNumber, AsYouType } from 'libphonenumber-js'
import logger from '../config/logger.js'

/**
 * Normalise un numéro de téléphone au format E.164 international (+XXXXXXXXXXX)
 * en utilisant le code ISO du pays de la salle comme contexte par défaut.
 *
 * @param {string} numero   - Numéro saisi (local ou international)
 * @param {string} codePays - Code ISO 2 lettres du pays (ex: "BJ", "SN", "FR", "US")
 * @returns {{ normalise: string, valide: boolean, erreur?: string }}
 */
export function normaliserTelephone(numero, codePays) {
  if (!numero || typeof numero !== 'string') {
    return { normalise: numero, valide: false, erreur: 'Numéro manquant' }
  }

  const nettoye = numero.trim().replace(/\s+/g, '').replace(/-/g, '')

  try {
    const parsed = parsePhoneNumber(nettoye, codePays?.toUpperCase() ?? 'BJ')

    if (!parsed || !parsed.isValid()) {
      // Si invalide avec le code pays, tenter quand même en E.164 si le numéro commence par +
      if (nettoye.startsWith('+')) {
        return { normalise: nettoye, valide: false, erreur: `Numéro invalide pour le pays ${codePays}` }
      }
      return { normalise: nettoye, valide: false, erreur: `Numéro invalide : "${numero}"` }
    }

    return { normalise: parsed.format('E.164'), valide: true }
  } catch (err) {
    logger.warn(`[phoneService] Impossible de parser "${numero}" (pays: ${codePays}): ${err.message}`)
    // En cas d'erreur de parsing, retourner le numéro nettoyé tel quel
    return { normalise: nettoye, valide: false, erreur: `Impossible de normaliser le numéro` }
  }
}

/**
 * Normalise et valide. Lance une erreur si le numéro est invalide.
 * À utiliser dans les controllers pour valider avant insertion en BDD.
 */
export function normaliserOuEchouer(numero, codePays) {
  const result = normaliserTelephone(numero, codePays)
  if (!result.valide) {
    const err = new Error(result.erreur ?? `Numéro de téléphone invalide : "${numero}"`)
    err.status = 400
    throw err
  }
  return result.normalise
}
