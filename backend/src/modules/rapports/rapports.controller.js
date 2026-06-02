import prisma from '../../services/prismaClient.js'

// GET /admin/rapports?gerantId=&posteId=&debut=&fin=
export const getRapports = async (req, res) => {
  const { gerantId, posteId, debut, fin } = req.query
  const salleId = req.user.salle_id

  try {
    const where = {
      client: { salleId },
    }

    if (gerantId) where.gerantId = Number(gerantId)
    if (posteId)  where.posteId  = Number(posteId)

    if (debut || fin) {
      where.debut = {}
      if (debut) where.debut.gte = new Date(debut)
      if (fin)   where.debut.lte = new Date(fin + 'T23:59:59')
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        client:  { select: { id: true, pseudo: true } },
        gerant:  { select: { id: true, nom: true, prenom: true } },
        poste:   { select: { id: true, nom: true } },
        duree:   { select: { id: true, libelle: true, secondes: true, prix: true } },
      },
      orderBy: { debut: 'desc' }
    })

    const total = sessions.reduce((sum, s) => sum + s.duree.prix, 0)

    // Gérants de la salle pour les filtres
    const gerants = await prisma.user.findMany({
      where: { salleId, role: 'GERANT' },
      select: { id: true, nom: true, prenom: true }
    })

    // Postes de la salle pour les filtres
    const postes = await prisma.poste.findMany({
      where: { categorie: { salleId } },
      select: { id: true, nom: true }
    })

    return res.json({ sessions, total, gerants, postes })
  } catch (err) {
    console.error('[admin/rapports GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
