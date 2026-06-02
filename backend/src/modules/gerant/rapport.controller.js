import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'

// ─── GET /gerant/rapport/jour → Rapport du jour ──────────────────────────

export const rapportJour = async (req, res) => {
  try {
    // Récupérer la date d'aujourd'hui (minuit)
    const debut = new Date()
    debut.setHours(0, 0, 0, 0)

    const fin = new Date()
    fin.setHours(23, 59, 59, 999)

    // Récupérer les sessions du jour pour ce gérant
    const sessions = await prisma.session.findMany({
      where: {
        gerantId: req.user.id,
        debut: {
          gte: debut,
          lte: fin
        },
        statut: { in: ['TERMINEE', 'ARRETEE'] }
      },
      include: {
        client: { select: { pseudo: true, telephone: true, estEnfant: true } },
        poste: { select: { nom: true, categorie: { select: { nom: true } } } },
        duree: { select: { libelle: true, secondes: true, prix: true } }
      },
      orderBy: { debut: 'asc' }
    })

    // Calculer statistiques
    const totalSessions = sessions.length
    const totalMontant = sessions.reduce((sum, s) => sum + (s.duree.prix || 0), 0)
    const totalSecondes = sessions.reduce((sum, s) => sum + (s.duree.secondes || 0), 0)
    const sessionBonus = sessions.filter(s => s.estBonus).length
    const sessionNormale = sessions.filter(s => !s.estBonus).length

    // Grouper par catégorie
    const parCategorie = {}
    sessions.forEach(session => {
      const categorie = session.poste.categorie.nom
      if (!parCategorie[categorie]) {
        parCategorie[categorie] = {
          nombre: 0,
          montant: 0,
          secondes: 0
        }
      }
      parCategorie[categorie].nombre++
      parCategorie[categorie].montant += session.duree.prix || 0
      parCategorie[categorie].secondes += session.duree.secondes || 0
    })

    // Grouper par client
    const parClient = {}
    sessions.forEach(session => {
      const client = session.client.pseudo
      if (!parClient[client]) {
        parClient[client] = {
          nombre: 0,
          montant: 0,
          secondes: 0,
          telephone: session.client.telephone,
          estEnfant: session.client.estEnfant
        }
      }
      parClient[client].nombre++
      parClient[client].montant += session.duree.prix || 0
      parClient[client].secondes += session.duree.secondes || 0
    })

    logger.info(
      `Rapport généré : ${totalSessions} sessions, ${totalMontant} unités, ${req.user.id}`
    )

    return res.json({
      date: debut.toISOString().split('T')[0],
      gerant: req.user.pseudo,
      resume: {
        totalSessions,
        totalMontant,
        totalSecondes: Math.floor(totalSecondes / 60) + 'm', // Convertir en minutes
        sessionNormale,
        sessionBonus
      },
      parCategorie,
      parClient,
      detail: sessions.map(s => ({
        id: s.id,
        client: s.client.pseudo,
        poste: s.poste.nom,
        categorie: s.poste.categorie.nom,
        duree: s.duree.libelle,
        montant: s.duree.prix,
        debut: s.debut,
        fin: s.fin,
        statut: s.statut,
        estBonus: s.estBonus
      }))
    })
  } catch (err) {
    console.error('[gerant/rapport/jour GET]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
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
