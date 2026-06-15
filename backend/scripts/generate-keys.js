import { generateKeyPairSync } from 'crypto'
import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('🔑 Génération des clés RSA-2048...')

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
})

const privateKeyPath = path.resolve(__dirname, './private-key-TEST-ONLY.pem')
const publicKeyPath = path.resolve(__dirname, '../keys/public-key.pem')

writeFileSync(privateKeyPath, privateKey)
writeFileSync(publicKeyPath, publicKey)

console.log('✅ Clés générées avec succès!')
console.log(`📄 Clé privée: ${privateKeyPath}`)
console.log(`📄 Clé publique: ${publicKeyPath}`)
console.log('\n⚠️  WARNING: Ces clés sont pour TEST UNIQUEMENT')
console.log('   Ne les utilisez pas en production!')
