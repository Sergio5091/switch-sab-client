import pkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import path from 'path'

const { PrismaClient } = pkg

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

async function main() {
  console.log('🌱 Démarrage du seed...')

  const salle = await prisma.salle.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nom: 'Switch SAB',
      pays: 'Bénin',
      ville: 'Cotonou',
      quartier: 'Akpakpa',
      telephone: '+229 0197691879',
      switchType: 'WIFI',
    }
  })
  console.log('✅ Salle créée :', salle.nom)

  const hash = (pwd) => bcrypt.hashSync(pwd, 10)

  const admin = await prisma.user.upsert({
    where: { telephone: '+22900000001' },
    update: {},
    create: {
      pseudo: 'admin',
      telephone: '+22900000001',
      motDePasse: hash('admin123'),
      role: 'ADMIN',
      salleId: salle.id
    }
  })

  const gerant1 = await prisma.user.upsert({
    where: { telephone: '+22900000002' },
    update: {},
    create: {
      pseudo: 'gerant1',
      telephone: '+22900000002',
      motDePasse: hash('gerant123'),
      role: 'GERANT',
      telUrgence: '+22900000010',
      salleId: salle.id
    }
  })

  const gerant2 = await prisma.user.upsert({
    where: { telephone: '+22900000003' },
    update: {},
    create: {
      pseudo: 'gerant2',
      telephone: '+22900000003',
      motDePasse: hash('gerant123'),
      role: 'GERANT',
      telUrgence: '+22900000011',
      salleId: salle.id
    }
  })

  const clients = await Promise.all([
    prisma.user.upsert({ where: { telephone: '+22900000004' }, update: {}, create: { pseudo: 'kofi',   telephone: '+22900000004', motDePasse: hash('client123'), role: 'CLIENT', salleId: salle.id } }),
    prisma.user.upsert({ where: { telephone: '+22900000005' }, update: {}, create: { pseudo: 'amina',  telephone: '+22900000005', motDePasse: hash('client123'), role: 'CLIENT', salleId: salle.id } }),
    prisma.user.upsert({ where: { telephone: '+22900000006' }, update: {}, create: { pseudo: 'yann',   telephone: '+22900000006', motDePasse: hash('client123'), role: 'CLIENT', salleId: salle.id } }),
    prisma.user.upsert({ where: { telephone: '+22900000007' }, update: {}, create: { pseudo: 'fatou',  telephone: '+22900000007', motDePasse: hash('client123'), role: 'CLIENT', salleId: salle.id } }),
    prisma.user.upsert({ where: { telephone: '+22900000008' }, update: {}, create: { pseudo: 'marcus', telephone: '+22900000008', motDePasse: hash('client123'), role: 'CLIENT', salleId: salle.id } }),
  ])

  console.log('✅ Users créés :', [admin, gerant1, gerant2, ...clients].map(u => u.pseudo).join(', '))

  const categoriesData = [
    { nom: 'PS4',  durees: [{ libelle: '30min', secondes: 1800, prix: 300 }, { libelle: '1H', secondes: 3600, prix: 500 },  { libelle: '2H', secondes: 7200, prix: 900 },  { libelle: '3H', secondes: 10800, prix: 1200 }] },
    { nom: 'PS5',  durees: [{ libelle: '30min', secondes: 1800, prix: 500 }, { libelle: '1H', secondes: 3600, prix: 800 },  { libelle: '2H', secondes: 7200, prix: 1400 }, { libelle: '3H', secondes: 10800, prix: 2000 }] },
    { nom: 'XBOX', durees: [{ libelle: '30min', secondes: 1800, prix: 400 }, { libelle: '1H', secondes: 3600, prix: 700 },  { libelle: '2H', secondes: 7200, prix: 1200 }, { libelle: '3H', secondes: 10800, prix: 1600 }] },
  ]

  const categories = []
  for (const cat of categoriesData) {
    const created = await prisma.categorie.upsert({
      where: { id: categories.length + 1 },
      update: {},
      create: {
        nom: cat.nom,
        salleId: salle.id,
        durees: { create: cat.durees }
      },
      include: { durees: true }
    })
    categories.push(created)
  }
  console.log('✅ Catégories créées :', categories.map(c => c.nom).join(', '))

  const postesData = [
    { nom: 'PS4 — Poste 1',  categorieId: categories[0].id },
    { nom: 'PS4 — Poste 2',  categorieId: categories[0].id },
    { nom: 'PS5 — Poste 1',  categorieId: categories[1].id },
    { nom: 'PS5 — Poste 2',  categorieId: categories[1].id },
    { nom: 'XBOX — Poste 1', categorieId: categories[2].id },
    { nom: 'XBOX — Poste 2', categorieId: categories[2].id },
  ]

  for (const [i, poste] of postesData.entries()) {
    await prisma.poste.upsert({
      where: { id: i + 1 },
      update: {},
      create: poste
    })
  }
  console.log('✅ Postes créés :', postesData.map(p => p.nom).join(', '))

  // Créditer les 2 premiers clients en PS4 (2H)
  for (const client of clients.slice(0, 2)) {
    await prisma.credit.upsert({
      where: { clientId_categorieId: { clientId: client.id, categorieId: categories[0].id } },
      update: {},
      create: { clientId: client.id, categorieId: categories[0].id, solde: 7200 }
    })
  }

  await prisma.configBonus.upsert({
    where: { id: 1 },
    update: {},
    create: {
      ratioSecondes: 300,
      seuilDeblocage: 3600,
      validitejours: 30,
      reductionInvite: 20,
      bonusParrain: 10
    }
  })

  console.log('\n🎉 Seed terminé !\n')
  console.log('Comptes disponibles :')
  console.log('  Admin    → pseudo: admin   | tel: +22900000001 | mdp: admin123')
  console.log('  Gérant 1 → pseudo: gerant1 | tel: +22900000002 | mdp: gerant123')
  console.log('  Gérant 2 → pseudo: gerant2 | tel: +22900000003 | mdp: gerant123')
  console.log('  Clients  → kofi/amina/yann/fatou/marcus | mdp: client123')
}

main()
  .catch(e => { console.error('❌ Erreur :', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
