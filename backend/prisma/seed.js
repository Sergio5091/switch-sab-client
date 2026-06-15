import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import path from 'path'

// Lecture manuelle du .env (seed lancé hors contexte Express)
const envFile = readFileSync(path.join(process.cwd(), '.env'), 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=')
    if (idx > -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
  }
})

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const hash = (pwd) => bcrypt.hashSync(pwd, 10)

async function main() {
  console.log('🌱 Démarrage du seed minimal...')

  // ── Création compte ADMIN uniquement ───────────────────────────────────
  // NOTE: La salle sera créée via l'interface /setup/salle lors de la première installation
  
  const admin = await prisma.user.upsert({
    where: { telephone: '+22900000001' },
    update: {},
    create: {
      pseudo:     'admin',
      email:      'admin@switchsab.local',
      telephone:  '+22900000001',
      motDePasse: hash('admin123'),
      role:       'ADMIN',
      salleId:    null,  // Pas encore de salle configurée
    }
  })

  console.log('\n✅ Compte admin créé !')
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  📧 Email     : admin@switchsab.local')
  console.log('  📱 Téléphone : +22900000001')
  console.log('  🔑 Mot de passe : admin123')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('\n📋 Prochaines étapes :')
  console.log('  1. Démarrer le backend : npm run dev')
  console.log('  2. Se connecter avec les identifiants ci-dessus')
  console.log('  3. Configurer la salle via l\'interface /setup/salle')
  console.log('  4. Activer la licence via /admin/licence')
  console.log('  5. Commencer à utiliser l\'application ✨\n')
}

main()
  .catch(e => { console.error('❌ Erreur seed :', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
