import { createVerify } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import prisma from './prismaClient.js'
import logger from '../config/logger.js'

// ─── Chargement de la clé publique ────────────────────────────────────────────

const getPublicKey = () => {
  const keyPath = path.resolve(process.env.LICENCE_PUBLIC_KEY_PATH || './keys/public-key.pem')
  if (!existsSync(keyPath)) {
    throw new Error(`Clé publique introuvable : ${keyPath}`)
  }
  return readFileSync(keyPath, 'utf-8')
}

// ─── Vérification signature RSA ───────────────────────────────────────────────

/**
 * Vérifie la signature RSA d'un payload de licence.
 * Le Projet 1 signe : SHA256(licenceId + salleId + machineId + issuedAt + expiresAt)
 */
export const verifySignature = (payload, signature) => {
  try {
    const publicKey = getPublicKey()
    const data = `${payload.licenceId}|${payload.salleId}|${payload.machineId}|${payload.issuedAt}|${payload.expiresAt}`
    const verify = createVerify('SHA256')
    verify.update(data)
    verify.end()
    return verify.verify(publicKey, signature, 'base64')
  } catch (err) {
    logger.error('Erreur vérification signature :', err.message)
    return false
  }
}

// ─── Vérification complète d'une licence ─────────────────────────────────────

export const verifierLicence = (licence) => {
  // 1. Expiration
  if (new Date(licence.expiresAt) < new Date()) {
    return { valide: false, raison: 'Licence expirée' }
  }

  // 2. Signature RSA (si clé publique disponible)
  try {
    const payload = {
      licenceId: licence.licenceId,
      salleId:   licence.salleId,
      machineId: licence.machineId,
      issuedAt:  licence.issuedAt instanceof Date
        ? licence.issuedAt.toISOString()
        : licence.issuedAt,
      expiresAt: licence.expiresAt instanceof Date
        ? licence.expiresAt.toISOString()
        : licence.expiresAt,
    }
    const signatureValide = verifySignature(payload, licence.signature)
    if (!signatureValide) {
      return { valide: false, raison: 'Signature invalide' }
    }
  } catch (err) {
    // Pas de clé publique → mode dev, on laisse passer avec un warning
    logger.warn('Clé publique absente — vérification signature ignorée (mode dev)')
  }

  // 3. Jours restants
  const msRestants = new Date(licence.expiresAt) - new Date()
  const joursRestants = Math.ceil(msRestants / (1000 * 60 * 60 * 24))

  return { valide: true, joursRestants }
}

// ─── Charger la licence active depuis la BDD ─────────────────────────────────

export const getLicenceActive = async () => {
  return prisma.licenceLocale.findFirst({
    where: { status: 'ACTIVE' },
    include: { salle: true }
  })
}
