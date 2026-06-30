import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'

// ─── GET /gerant/rapport/jour → Rapport du jour ──────────────────────────

export const rapportJour = async (req, res) => {
  try {
    const debut = new Date()
    debut.setHours(0, 0, 0, 0)
    const fin = new Date()
    fin.setHours(23, 59, 59, 999)

    // ── Recharges du jour (encaissements réels) ──────────────────────────
    const recharges = await prisma.transaction.findMany({
      where: {
        client: { salleId: req.user.salle_id },
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

    // ── Sessions du jour (indicateurs d'activité/consommation) ───────────
    const sessions = await prisma.session.findMany({
      where: {
        gerant: { salleId: req.user.salle_id },
        debut: { gte: debut, lte: fin }
      },
      include: {
        client: { select: { pseudo: true, telephone: true, estEnfant: true } },
        poste: { select: { nom: true, categorie: { select: { nom: true } } } },
        duree: { select: { libelle: true, secondes: true, prix: true } }
      },
      orderBy: { debut: 'asc' }
    })

    // ── Revenus = uniquement les recharges ───────────────────────────────
    const revenuJour = recharges.reduce((sum, r) => sum + r.montant, 0)

    // ── Stats sessions par statut ────────────────────────────────────────
    const sessionsTerminees = sessions.filter(s => s.statut === 'TERMINEE')
    const sessionsEnPause   = sessions.filter(s => s.statut === 'ARRETEE')
    const sessionsActives   = sessions.filter(s => s.statut === 'ACTIVE')
    const sessionsBonus     = sessions.filter(s => s.estBonus)
    const sessionsNormales  = sessions.filter(s => !s.estBonus)

    // Temps total consommé (sessions terminées uniquement)
    const tempsConsommeSecondes = sessionsTerminees.reduce((sum, s) => sum + (s.duree.secondes || 0), 0)

    // Temps encore en pause (conservé pour reprise)
    const tempsEnPauseSecondes = sessionsEnPause.reduce((sum, s) => sum + (s.tempsRestant || 0), 0)

    // ── Stats par catégorie ──────────────────────────────────────────────
    const parCategorie = {}
    sessions.forEach(s => {
      const cat = s.poste.categorie.nom
      if (!parCategorie[cat]) parCategorie[cat] = { nombre: 0, terminees: 0, enPause: 0, actives: 0, tempsConsommeMin: 0 }
      parCategorie[cat].nombre++
      if (s.statut === 'TERMINEE') { parCategorie[cat].terminees++; parCategorie[cat].tempsConsommeMin += Math.floor(s.duree.secondes / 60) }
      if (s.statut === 'ARRETEE')  parCategorie[cat].enPause++
      if (s.statut === 'ACTIVE')   parCategorie[cat].actives++
    })

    // ── Stats par client ─────────────────────────────────────────────────
    const parClient = {}
    sessions.forEach(s => {
      const pseudo = s.client.pseudo
      if (!parClient[pseudo]) parClient[pseudo] = { nbSessions: 0, telephone: s.client.telephone, estEnfant: s.client.estEnfant }
      parClient[pseudo].nbSessions++
    })

    const gerant = await prisma.user.findUnique({ where: { id: req.user.id }, select: { pseudo: true } })

    return res.json({
      date: debut.toISOString().split('T')[0],
      gerant: gerant?.pseudo ?? '',
      resume: {
        // Revenus réels
        revenuJour,
        nbRecharges: recharges.length,
        // Activité sessions
        totalSessions: sessions.length,
        sessionsTerminees: sessionsTerminees.length,
        sessionsEnPause: sessionsEnPause.length,
        sessionsActives: sessionsActives.length,
        sessionsBonus: sessionsBonus.length,
        sessionsNormales: sessionsNormales.length,
        // Temps
        tempsConsomme: Math.floor(tempsConsommeSecondes / 60) + 'min',
        tempsEnPause: Math.floor(tempsEnPauseSecondes / 60) + 'min',
      },
      parCategorie,
      parClient,
      sessions: sessions.map(s => ({
        id: s.id,
        client: s.client.pseudo,
        poste: s.poste.nom,
        categorie: s.poste.categorie.nom,
        duree: s.duree.libelle,
        debut: s.debut,
        fin: s.fin,
        statut: s.statut,
        tempsRestant: s.tempsRestant,
        estBonus: s.estBonus
      })),
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

    // Recharges de la période (revenus réels)
    const recharges = await prisma.transaction.findMany({
      where: {
        client: { salleId: req.user.salle_id },
        type: 'RECHARGE_GERANT',
        date: { gte: dateDebut, lte: dateFin }
      },
      include: {
        client: { select: { pseudo: true, telephone: true } }
      },
      orderBy: { date: 'asc' }
    })

    // Sessions de la période (activité)
    const sessions = await prisma.session.findMany({
      where: {
        gerantId: req.user.id,
        debut: { gte: dateDebut, lte: dateFin }
      },
      include: {
        client: { select: { pseudo: true, telephone: true } },
        poste: { select: { nom: true, categorie: { select: { nom: true } } } },
        duree: { select: { libelle: true, secondes: true, prix: true } }
      },
      orderBy: { debut: 'asc' }
    })

    const revenuPeriode = recharges.reduce((sum, r) => sum + r.montant, 0)

    return res.json({
      periode: `${debut} à ${fin}`,
      gerant: req.user.pseudo,
      resume: {
        revenuPeriode,
        nbRecharges: recharges.length,
        totalSessions: sessions.length,
        sessionsTerminees: sessions.filter(s => s.statut === 'TERMINEE').length,
        sessionsEnPause: sessions.filter(s => s.statut === 'ARRETEE').length,
        sessionsBonus: sessions.filter(s => s.estBonus).length,
      },
      recharges: recharges.map(r => ({
        id: r.id,
        client: r.client.pseudo,
        telephone: r.client.telephone,
        montant: r.montant,
        date: r.date
      })),
      sessions
    })
  } catch (err) {
    console.error('[gerant/rapport/periode GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
