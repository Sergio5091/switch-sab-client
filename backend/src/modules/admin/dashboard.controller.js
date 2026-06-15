import prisma from '../../services/prismaClient.js'

// GET /admin/dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const salleId = req.user.salle_id

    // 1. Compter les sessions du jour
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const sessionsAujourdhui = await prisma.session.findMany({
      where: {
        client: { salleId },
        debut: { gte: today }
      },
      include: {
        duree: { select: { prix: true } },
        client: { select: { id: true } }
      }
    })

    const revenuJour = sessionsAujourdhui.reduce((sum, s) => sum + s.duree.prix, 0)

    // 2. Compter les postes + postes actifs
    const postes = await prisma.poste.findMany({
      where: { 
        categorie: { 
          salleId: salleId 
        } 
      },
      select: { id: true, statut: true }
    })
    const postesActifs = postes.filter(p => p.statut === 'OCCUPE').length

    // 3. Compter les clients
    const clientsCount = await prisma.user.count({
      where: { salleId, role: 'CLIENT' }
    })

    // 4. Catégories avec stats
    const categories = await prisma.categorie.findMany({
      where: { salleId },
      include: {
        postes: { select: { id: true, statut: true } }
      }
    })

    const categoriesStats = categories.map(cat => ({
      id: cat.id,
      nom: cat.nom,
      nbPostes: cat.postes.length,
      nbActifs: cat.postes.filter(p => p.statut === 'OCCUPE').length
    }))

    // 5. Activité des gérants
    const gerants = await prisma.user.findMany({
      where: { salleId, role: 'GERANT' },
      select: { id: true, nom: true, prenom: true }
    })

    const gerantActivity = await Promise.all(
      gerants.map(async (g) => {
        const sessions = await prisma.session.findMany({
          where: {
            gerantId: g.id,
            debut: { gte: today }
          },
          include: { duree: { select: { prix: true } } }
        })
        return {
          gerant: g,
          nbSessions: sessions.length,
          revenu: sessions.reduce((sum, s) => sum + s.duree.prix, 0)
        }
      })
    )

    return res.json({
      stats: {
        sessionsAujourdhui: sessionsAujourdhui.length,
        revenuJour,
        postes: {
          total: postes.length,
          actifs: postesActifs
        },
        clients: clientsCount
      },
      categories: categoriesStats,
      gerantActivity: gerantActivity.sort((a, b) => b.nbSessions - a.nbSessions)
    })
  } catch (err) {
    console.error('[admin/dashboard GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
