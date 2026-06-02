import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'

// ─── GET /gerant/rapport/jour → Rapport du jour ──────────────────────────

export const rapportJour = async (req, res) => {
  try {
    const debut = new Date()
    debut.setHours(0, 0, 0, 0)
    const fin = new Date()
    fin.setHours(23, 59, 59, 999)

    // Sessions du jour pour ce gérant
    const sessions = await prisma.session.findMany({
      where: {
        gerantId: req.user.id,
        debut: { gte: debut, lte: fin },
        statut: { in: ['TERMINEE', 'ARRETEE', 'ACTIVE'] }
      },
      include: {
        client: { select: { pseudo: true, telephone: true, estEnfant: true } },
        poste: { select: { nom: true, categorie: { select: { nom: true } } } },
        duree: { select: { libelle: true, secondes: true, prix: true } }
      },
      orderBy: { debut: 'asc' }
    })

    // Recharges du jour faites par ce gérant
    const recharges = await prisma.transaction.findMany({
      where: {
        gerantId: req.user.id,
        type: 'RECHARGE_GERANT',
        date: { gte: debut, lte: fin }
      },
      include: {
        client: {
          select: {
            pseudo: true,
            telephone: true,
            credits: {
              select: {
                solde: true,
                categorie: { select: { nom: true } }
              }
            }
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    // Stats sessions
    const totalSessions = sessions.length
    const totalMontantSessions = sessions.reduce((sum, s) => sum + (s.duree.prix || 0), 0)
    const totalSecondes = sessions.reduce((sum, s) => sum + (s.duree.secondes || 0), 0)
    const sessionBonus = sessions.filter(s => s.estBonus).length
    const sessionNormale = sessions.filter(s => !s.estBonus).length

    // Stats recharges
    const totalMontantRecharges = recharges.reduce((sum, r) => sum + r.montant, 0)

    // Grouper sessions par catégorie
    const parCategorie = {}
    sessions.forEach(s => {
      const cat = s.poste.categorie.nom
      if (!parCategorie[cat]) parCategorie[cat] = { nombre: 0, montant: 0, secondes: 0 }
      parCategorie[cat].nombre++
      parCategorie[cat].montant += s.duree.prix || 0
      parCategorie[cat].secondes += s.duree.secondes || 0
    })

    // Grouper sessions par client
    const parClient = {}
    sessions.forEach(s => {
      const pseudo = s.client.pseudo
      if (!parClient[pseudo]) parClient[pseudo] = { nombre: 0, montant: 0, telephone: s.client.telephone, estEnfant: s.client.estEnfant }
      parClient[pseudo].nombre++
      parClient[pseudo].montant += s.duree.prix || 0
    })

    return res.json({
      date: debut.toISOString().split('T')[0],
      gerant: req.user.pseudo,
      resume: {
        totalSessions,
        totalMontantSessions,
        totalMontantRecharges,
        totalMontantJour: totalMontantSessions + totalMontantRecharges,
        totalSecondes: Math.floor(totalSecondes / 60) + 'm',
        sessionNormale,
        sessionBonus
      },
      parCategorie,
      parClient,
      // Sessions avec statut détaillé
      sessions: sessions.map(s => ({
        id: s.id,
        client: s.client.pseudo,
        poste: s.poste.nom,
        categorie: s.poste.categorie.nom,
        duree: s.duree.libelle,
        montant: s.duree.prix,
        debut: s.debut,
        fin: s.fin,
        statut: s.statut,
        tempsRestant: s.tempsRestant,
        estBonus: s.estBonus
      })),
      // Recharges avec solde actuel du client
      recharges: recharges.map(r => ({
        id: r.id,
        client: r.client.pseudo,
        telephone: r.client.telephone,
        montant: r.montant,
        date: r.date,
        creditsActuels: r.client.credits.map(c => ({
          categorie: c.categorie.nom,
          soldeMinutes: Math.floor(c.solde / 60),
          soldeSecondes: c.solde
        }))
      }))
    })
  } catch (err) {
    console.error('[gerant/rapport/jour GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── GET /gerant/rapport/periode → Rapport sur une période ────────────────

export const rapportPeriode = async (req, res) => {
  const { debut, fin } = req.query

  // Validation
  if (!debut || !fin) {
    return res.status(400).json({
      message: 'Les paramètres debut et fin sont requis (format: YYYY-MM-DD)'
    })
  }

  try {
    const dateDebut = new Date(debut)
    const dateFin = new Date(fin)

    dateDebut.setHours(0, 0, 0, 0)
    dateFin.setHours(23, 59, 59, 999)

    const sessions = await prisma.session.findMany({
      where: {
        gerantId: req.user.id,
        debut: {
          gte: dateDebut,
          lte: dateFin
        },
        statut: { in: ['TERMINEE', 'ARRETEE'] }
      },
      include: {
        client: { select: { pseudo: true, telephone: true } },
        poste: { select: { nom: true, categorie: { select: { nom: true } } } },
        duree: { select: { libelle: true, secondes: true, prix: true } }
      },
      orderBy: { debut: 'asc' }
    })

    const totalSessions = sessions.length
    const totalMontant = sessions.reduce((sum, s) => sum + (s.duree.prix || 0), 0)

    return res.json({
      periode: `${debut} à ${fin}`,
      gerant: req.user.pseudo,
      resume: {
        totalSessions,
        totalMontant,
        bonusSessions: sessions.filter(s => s.estBonus).length
      },
      detail: sessions
    })
  } catch (err) {
    console.error('[gerant/rapport/periode GET]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}
