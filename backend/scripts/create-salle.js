import prisma from '../src/services/prismaClient.js'

async function createSalle() {
  try {
    console.log('🔍 Vérification de la salle ID 3...')
    
    let salle = await prisma.salle.findUnique({
      where: { id: 3 }
    })

    if (!salle) {
      console.log('📝 Salle non trouvée. Création...')
      salle = await prisma.salle.create({
        data: {
          id: 3,
          nom: 'Switch SAB - Salle Principale',
          pays: 'Sénégal',
          ville: 'Dakar',
          quartier: 'Plateau',
          telephone: '+221770000000',
          switchType: 'WIFI',
          switchConfig: '192.168.1.1'
        }
      })
      console.log('✅ Salle créée avec succès!')
      console.log(`   ID: ${salle.id}`)
      console.log(`   Nom: ${salle.nom}`)
    } else {
      console.log('✅ Salle ID 3 existe déjà')
      console.log(`   Nom: ${salle.nom}`)
    }

    console.log('\n✨ La salle est prête pour la licence!')
  } catch (err) {
    console.error('❌ Erreur:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

createSalle()
