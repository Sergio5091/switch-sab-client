import { createSign } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Lire la licence actuelle
const licencePath = path.resolve(__dirname, '../../licenc.json')
const licence = JSON.parse(readFileSync(licencePath, 'utf-8'))

// Lire la clé privée
const privateKeyPath = path.resolve(__dirname, './private-key-TEST-ONLY.pem')
const privateKey = readFileSync(privateKeyPath, 'utf-8')

// Créer la signature avec nomSalle (pas salleId)
const data = `${licence.licenceId}|${licence.nomSalle || ''}|${licence.machineId}|${licence.issuedAt}|${licence.expiresAt}`
const sign = createSign('SHA256')
sign.update(data)
sign.end()

const signature = sign.sign(privateKey, 'base64')

// Mettre à jour la licence avec la nouvelle signature
licence.signature = signature

// Écrire la licence mise à jour
writeFileSync(licencePath, JSON.stringify(licence, null, 2))

console.log('✅ Licence régénérée avec succès!')
console.log(`📋 Nouvelle signature: ${signature.substring(0, 50)}...`)
console.log(`💾 Fichier: ${licencePath}`)
