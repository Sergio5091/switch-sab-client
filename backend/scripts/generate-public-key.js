import { createPrivateKey, createPublicKey } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Lire la clé privée
const privateKeyPath = path.resolve(__dirname, './private-key-TEST-ONLY.pem')
const privateKeyPem = readFileSync(privateKeyPath, 'utf-8')

// Créer les objets clés
const privateKey = createPrivateKey(privateKeyPem)
const publicKey = createPublicKey(privateKey)

// Exporter la clé publique en format PEM
const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' })

// Écrire la clé publique
const publicKeyPath = path.resolve(__dirname, '../keys/public-key.pem')
writeFileSync(publicKeyPath, publicKeyPem)

console.log('✅ Clé publique générée avec succès!')
console.log(`💾 Fichier: ${publicKeyPath}`)
