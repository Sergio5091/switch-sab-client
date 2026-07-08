import prisma from '../../services/prismaClient.js'
import { envoyerRapportPeriode } from '../../services/rapportMailService.js'

// GET /admin/rapports?gerantId=&posteId=&debut=&fin=
export const getRapports = async (req, res) => {
  const { gerantId, posteId, debut, fin } = req.query
  const salleId = req.user.salle_id

  try {
    // ── Filtres sessions ─────────────────────────────────────────────────
    const whereSession = { client: { salleId } }
    if (gerantId) whereSession.gerantId = Number(gerantId)
    if (posteId)  whereSession.posteId  = Number(posteId)
    if (debut || fin) {
      whereSession.debut = {}
      if (debut) whereSession.debut.gte = new Date(debut)
      if (fin)   whereSession.debut.lte = new Date(fin + 'T23:59:59')
    }

    // ── Filtres recharges ────────────────────────────────────────────────
    const whereRecharge = {
      client: { salleId },
      type: 'RECHARGE_GERANT'
    }
    if (gerantId) whereRecharge.gerantId = Number(gerantId)
    if (debut || fin) {
      whereRecharge.date = {}
      if (debut) whereRecharge.date.gte = new Date(debut)
      if (fin)   whereRecharge.date.lte = new Date(fin + 'T23:59:59')
    }

    const [sessions, recharges] = await Promise.all([
      prisma.session.findMany({
        where: whereSession,
        include: {
          client:  { select: { id: true, pseudo: true } },
          gerant:  { select: { id: true, nom: true, prenom: true } },
          poste:   { select: { id: true, nom: true } },
          duree:   { select: { id: true, libelle: true, secondes: true, prix: true } },
        },
        orderBy: { debut: 'desc' }
      }),
      prisma.transaction.findMany({
        where: whereRecharge,
        include: {
          client: { select: { id: true, pseudo: true, telephone: true } },
        },
        orderBy: { date: 'desc' }
      })
    ])

    // Revenus réels = somme des recharges
    const totalRecharges = recharges.reduce((sum, r) => sum + r.montant, 0)
    // Valeur théorique des sessions (indicateur d'activité)
    const totalSessions = sessions.reduce((sum, s) => sum + s.duree.prix, 0)

    // Gérants et postes pour les filtres
    const [gerants, postes] = await Promise.all([
      prisma.user.findMany({
        where: { salleId, role: 'GERANT' },
        select: { id: true, nom: true, prenom: true }
      }),
      prisma.poste.findMany({
        where: { categorie: { salleId } },
        select: { id: true, nom: true }
      })
    ])

    return res.json({
      sessions,
      recharges,
      totalRecharges,
      totalSessions,
      // total = revenus réels (recharges uniquement)
      total: totalRecharges,
      gerants,
      postes
    })
  } catch (err) {
    console.error('[admin/rapports GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// POST /admin/rapports/envoyer-email → Envoyer le rapport à l'email du propriétaire
export const envoyerRapportEmail = async (req, res) => {
  const salleId = req.user.salle_id
  const { dateDebut, dateFin } = req.body

  if (!dateDebut || !dateFin) {
    return res.status(400).json({ message: 'dateDebut et dateFin requis (format YYYY-MM-DD)' })
  }

  try {
    const data = await envoyerRapportPeriode(salleId, dateDebut, dateFin)

    return res.json({
      message: `Rapport envoyé à ${data.salle.email}`,
      email: data.salle.email,
      resume: {
        nbSessions:      data.sessions.length,
        totalSessions:   data.totalSessions,
        nbRecharges:     data.recharges.length,
        totalRecharges:  data.totalRecharges,
        totalGeneral:    data.totalSessions + data.totalRecharges,
      }
    })
  } catch (err) {
    console.error('[admin/rapports/envoyer-email POST]', err)
    const status = err.message.includes('email') ? 400 : 500
    return res.status(status).json({ message: err.message || 'Erreur serveur' })
  }
}
