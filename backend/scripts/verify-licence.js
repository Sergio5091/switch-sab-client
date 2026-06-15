import { createVerify } from 'crypto'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Lire la licence
const licencePath = path.resolve(__dirname, '../../licenc.json')
const licence = JSON.parse(readFileSync(licencePath, 'utf-8'))

// Lire la clé publique
const publicKeyPath = path.resolve(__dirname, '../keys/public-key.pem')
const publicKey = readFileSync(publicKeyPath, 'utf-8')

// Vérifier la signature
const data = `${licence.licenceId}|${licence.salleId}|${licence.machineId}|${licence.issuedAt}|${licence.expiresAt}`
const verify = createVerify('SHA256')
verify.update(data)
verify.end()

const signatureValide = verify.verify(publicKey, licence.signature, 'base64')

console.log('🔍 Vérification de licence')
console.log('='.repeat(50))
console.log(`ID: ${licence.licenceId}`)
console.log(`Statut: ${licence.status}`)
console.log(`Émise: ${licence.issuedAt}`)
console.log(`Expire: ${licence.expiresAt}`)
console.log(`Signature: ${signatureValide ? '✅ VALIDE' : '❌ INVALIDE'}`)

// Vérifier l'expiration
const expiresAt = new Date(licence.expiresAt)
const now = new Date()
const joursRestants = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))

if (expiresAt < now) {
  console.log(`⏰ EXPIRÉE (${-joursRestants} jours ago)`)
} else {
  console.log(`⏰ Expire dans ${joursRestants} jours`)
}

console.log('='.repeat(50))
console.log(signatureValide && expiresAt > now ? '✅ LICENCE VALIDE' : '❌ LICENCE INVALIDE')
