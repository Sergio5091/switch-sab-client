import prisma from '../../services/prismaClient.js'

// GET /admin/dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const salleId = req.user.salle_id

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Sessions du jour (indicateur d'activité uniquement)
    const sessionsAujourdhui = await prisma.session.findMany({
      where: {
        client: { salleId },
        debut: { gte: today }
      },
      select: { id: true }
    })

    // 2. Revenus du jour = recharges encaissées aujourd'hui (argent réellement perçu)
    const rechargesJour = await prisma.transaction.aggregate({
      where: {
        client: { salleId },
        type: 'RECHARGE_GERANT',
        date: { gte: today }
      },
      _sum: { montant: true }
    })
    const revenuJour = rechargesJour._sum.montant ?? 0

    // 3. Postes + postes actifs
    const postes = await prisma.poste.findMany({
      where: { categorie: { salleId } },
      select: { id: true, statut: true }
    })
    const postesActifs = postes.filter(p => p.statut === 'OCCUPE').length

    // 4. Clients
    const clientsCount = await prisma.user.count({
      where: { salleId, role: 'CLIENT' }
    })

    // 5. Catégories avec stats
    const categories = await prisma.categorie.findMany({
      where: { salleId },
      include: { postes: { select: { id: true, statut: true } } }
    })
    const categoriesStats = categories.map(cat => ({
      id: cat.id,
      nom: cat.nom,
      nbPostes: cat.postes.length,
      nbActifs: cat.postes.filter(p => p.statut === 'OCCUPE').length
    }))

    // 6. Activité des gérants — recharges encaissées par gérant aujourd'hui
    const gerants = await prisma.user.findMany({
      where: { salleId, role: 'GERANT' },
      select: { id: true, nom: true, prenom: true }
    })

    const gerantActivity = await Promise.all(
      gerants.map(async (g) => {
        const [sessions, rechargesAgg] = await Promise.all([
          prisma.session.count({
            where: { gerantId: g.id, debut: { gte: today } }
          }),
          prisma.transaction.aggregate({
            where: {
              // gerantId n'est pas sur Transaction — on cherche les recharges
              // des clients de la salle faites aujourd'hui via ce gérant
              // On utilise le champ gerantId de Transaction si présent
              gerantId: g.id,
              type: 'RECHARGE_GERANT',
              date: { gte: today }
            },
            _sum: { montant: true }
          })
        ])
        return {
          gerant: g,
          nbSessions: sessions,
          revenu: rechargesAgg._sum.montant ?? 0
        }
      })
    )

    return res.json({
      stats: {
        sessionsAujourdhui: sessionsAujourdhui.length,
        revenuJour,
        postes: { total: postes.length, actifs: postesActifs },
        clients: clientsCount
      },
      categories: categoriesStats,
      gerantActivity: gerantActivity.sort((a, b) => b.revenu - a.revenu)
    })
  } catch (err) {
    console.error('[admin/dashboard GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
