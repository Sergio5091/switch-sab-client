import prisma from '../../services/prismaClient.js'

// ─── GET /client/home ────────────────────────────────────────────────────

export const getHome = async (req, res) => {
  const clientId = req.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        pseudo: true,
        credits: {
          select: {
            solde: true,
            categorie: { select: { id: true, nom: true } }
          }
        },
        bonus: { select: { solde: true, disponible: true } },
        sessions: {
          where: { statut: { in: ['ACTIVE', 'ARRETEE', 'TERMINEE'] } },
          select: {
            id: true,
            statut: true,
            tempsRestant: true,
            estBonus: true,
            debut: true,
            duree: { select: { libelle: true, secondes: true, prix: true } },
            poste: { select: { nom: true } }
          },
          orderBy: { debut: 'desc' },
          take: 10
        }
      }
    })

    if (!user) return res.status(404).json({ message: 'Client introuvable' })

    const activeSession = user.sessions.find(s => s.statut === 'ACTIVE') ?? null

    return res.json({
      pseudo: user.pseudo,
      credits: user.credits,
      bonus: user.bonus,
      activeSession,
      recentSessions: user.sessions.filter(s => s.statut !== 'ACTIVE')
    })
  } catch (err) {
    console.error('[client/home GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
