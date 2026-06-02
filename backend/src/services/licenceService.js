import { createVerify, createHash } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import prisma from './prismaClient.js'
import logger from '../config/logger.js'

// ─── Clé publique ─────────────────────────────────────────────────────────────

let publicKeyCache = null

const getPublicKey = () => {
  if (publicKeyCache) return publicKeyCache
  const keyPath = path.resolve(process.env.LICENCE_PUBLIC_KEY_PATH || './keys/public-key.pem')
  if (!existsSync(keyPath)) return null
  publicKeyCache = readFileSync(keyPath, 'utf-8')
  return publicKeyCache
}

// ─── Hash de contrôle anti-fraude ─────────────────────────────────────────────
// Calculé à partir de tous les champs sensibles + la signature RSA
// Si quelqu'un modifie expiresAt ou autre champ en base, le hash ne correspond plus

export const computeHash = (licence) => {
  const raw = [
    licence.licenceId,
    licence.salleId,
    licence.machineId,
    licence.issuedAt instanceof Date ? licence.issuedAt.toISOString() : licence.issuedAt,
    licence.expiresAt instanceof Date ? licence.expiresAt.toISOString() : licence.expiresAt,
    licence.signature,
  ].join('|')
  return createHash('sha256').update(raw).digest('hex')
}

// ─── Vérification signature RSA ───────────────────────────────────────────────

export const verifySignature = (payload, signature) => {
  const publicKey = getPublicKey()
  if (!publicKey) return null // null = pas de clé (pas false)

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
  // 1. Vérification du hash de contrôle (anti-fraude — toujours actif)
  if (licence.hash) {
    const hashAttendu = computeHash(licence)
    if (hashAttendu !== licence.hash) {
      logger.error(`[FRAUDE] Hash invalide pour licence ${licence.licenceId} — modification détectée en base`)
      return { valide: false, raison: 'Licence corrompue — tentative de fraude détectée' }
    }
  }

  // 2. Expiration
  if (new Date(licence.expiresAt) < new Date()) {
    return { valide: false, raison: 'Licence expirée' }
  }

  // 3. Signature RSA (si clé publique disponible)
  const publicKey = getPublicKey()
  if (!publicKey) {
    logger.warn('Clé publique absente — vérification RSA ignorée (mode dev)')
  } else {
    const payload = {
      licenceId: licence.licenceId,
      salleId:   licence.salleId,
      machineId: licence.machineId,
      issuedAt:  licence.issuedAt instanceof Date ? licence.issuedAt.toISOString() : licence.issuedAt,
      expiresAt: licence.expiresAt instanceof Date ? licence.expiresAt.toISOString() : licence.expiresAt,
    }
    const signatureValide = verifySignature(payload, licence.signature)
    if (signatureValide === false) {
      return { valide: false, raison: 'Signature RSA invalide' }
    }
  }

  // 4. Jours restants
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
