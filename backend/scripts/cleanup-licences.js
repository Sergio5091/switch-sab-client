import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function cleanupLicences() {
  try {
    console.log('🧹 Nettoyage des licences corrompues...')
    
    // Supprimer toutes les licences sauf la nouvelle
    const deleted = await prisma.licenceLocale.deleteMany({
      where: {
        licenceId: {
          not: 'LIC-edbb1e05-04ed-439c-b478-9babfbfb1589'
        }
      }
    })
    
    console.log(`✅ ${deleted.count} licence(s) supprimée(s)`)
    
    // Vérifier
    const remaining = await prisma.licenceLocale.findMany()
    console.log(`📋 Licences restantes: ${remaining.length}`)
    
  } catch (err) {
    console.error('❌ Erreur:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupLicences()
