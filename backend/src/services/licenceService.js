import { createVerify } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import prisma from './prismaClient.js'
import logger from '../config/logger.js'

// ─── Chargement de la clé publique ────────────────────────────────────────────

let publicKeyCache = null

const getPublicKey = () => {
  if (publicKeyCache) return publicKeyCache
  
  const keyPath = path.resolve(process.env.LICENCE_PUBLIC_KEY_PATH || './keys/public-key.pem')
  if (!existsSync(keyPath)) {
    return null  // Retourne null au lieu de throw
  }
  publicKeyCache = readFileSync(keyPath, 'utf-8')
  return publicKeyCache
}

// ─── Vérification signature RSA ───────────────────────────────────────────────

export const verifySignature = (payload, signature) => {
  const publicKey = getPublicKey()
  if (!publicKey) {
    return null  // Indique "pas de clé" au lieu de false
  }
  
  try {
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
  const publicKey = getPublicKey()
  if (!publicKey) {
    // Pas de clé publique → mode dev, on laisse passer avec un warning
    logger.warn('Clé publique absente — vérification signature ignorée (mode dev)')
    const msRestants = new Date(licence.expiresAt) - new Date()
    const joursRestants = Math.ceil(msRestants / (1000 * 60 * 60 * 24))
    return { valide: true, joursRestants }
  }

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
  if (signatureValide === false) {
    return { valide: false, raison: 'Signature invalide' }
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