import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Lire la licence
const licencePath = path.resolve(__dirname, '../../licenc.json')
const licence = JSON.parse(readFileSync(licencePath, 'utf-8'))

console.log('📤 Envoi de la licence au serveur...')
console.log(`URL: http://localhost:3002/api/licence/activer`)
console.log(`Licence ID: ${licence.licenceId}`)

try {
  const response = await fetch('http://localhost:3002/api/licence/activer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(licence)
  })

  const data = await response.json()

  if (response.ok) {
    console.log('✅ Licence chargée en base de données avec succès!')
    console.log(`Réponse: ${JSON.stringify(data, null, 2)}`)
  } else {
    console.error(`❌ Erreur: ${response.status}`)
    console.error(`Message: ${JSON.stringify(data, null, 2)}`)
  }
} catch (err) {
  console.error(`❌ Erreur réseau: ${err.message}`)
  console.error('Assure-toi que le serveur est démarré sur http://localhost:3002')
}
