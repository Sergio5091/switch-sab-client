import { createVerify } from 'crypto'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Lire la licence depuis licenc.json
const licencePath = path.resolve(__dirname, '../../licenc.json')
const licence = JSON.parse(readFileSync(licencePath, 'utf-8'))

// Lire la clé publique actuelle
const publicKeyPath = path.resolve(__dirname, '../keys/public-key.pem')
const publicKey = readFileSync(publicKeyPath, 'utf-8')

console.log('🔍 Vérification de signature')
console.log('='.repeat(60))
console.log(`Licence ID: ${licence.licenceId}`)
console.log(`Machine ID: ${licence.machineId}`)
console.log(`Nom Salle: ${licence.nomSalle || 'N/A'}`)
console.log(`Émise: ${licence.issuedAt}`)
console.log(`Expire: ${licence.expiresAt}`)
console.log('=' . repeat(60))

// Vérifier la signature avec nomSalle (pas salleId)
const data = `${licence.licenceId}|${licence.nomSalle || ''}|${licence.machineId}|${licence.issuedAt}|${licence.expiresAt}`
const verify = createVerify('SHA256')
verify.update(data)
verify.end()

const signatureValide = verify.verify(publicKey, licence.signature, 'base64')

console.log(`\nDonnées signées:`)
console.log(data)
console.log(`\nSignature: ${signatureValide ? '✅ VALIDE' : '❌ INVALIDE'}`)

// Vérifier l'expiration
const expiresAt = new Date(licence.expiresAt)
const now = new Date()
const joursRestants = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))

console.log(`\nExpiration:`)
if (expiresAt < now) {
  console.log(`❌ EXPIRÉE (${-joursRestants} jours ago)`)
} else {
  console.log(`✅ Valide (expire dans ${joursRestants} jours)`)
}

console.log('='.repeat(60))
if (signatureValide && expiresAt > now) {
  console.log('✅ LICENCE COMPLÈTEMENT VALIDE')
} else {
  console.log('❌ LICENCE INVALIDE')
  if (!signatureValide) {
    console.log('   ➜ La signature RSA ne correspond pas à la clé publique actuelle')
    console.log('   ➜ Cette licence a été signée avec une AUTRE clé privée')
  }
  if (expiresAt < now) {
    console.log(`   ➜ La licence a expiré`)
  }
}
