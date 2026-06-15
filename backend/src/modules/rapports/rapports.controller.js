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

// POST /admin/rapports/envoyer-email → Envoyer le rapport cumulé à l'email du propriétaire
export const envoyerRapportEmail = async (req, res) => {
  const salleId = req.user.salle_id
  const { dateDebut, dateFin } = req.body

  try {
    // Récupérer les infos de la salle (email propriétaire)
    const salle = await prisma.salle.findUnique({ where: { id: salleId } })
    if (!salle) return res.status(404).json({ message: 'Salle introuvable' })

    const emailProprietaire = salle.email
    if (!emailProprietaire) {
      return res.status(400).json({
        message: "Aucun email de propriétaire configuré pour cette salle. Ajoutez l'email dans les paramètres de la salle."
      })
    }

    // Construire le rapport cumulé
    const where = { client: { salleId } }
    if (dateDebut || dateFin) {
      where.debut = {}
      if (dateDebut) where.debut.gte = new Date(dateDebut)
      if (dateFin)   where.debut.lte = new Date(dateFin + 'T23:59:59')
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        client: { select: { pseudo: true } },
        gerant: { select: { nom: true, prenom: true } },
        poste:  { select: { nom: true } },
        duree:  { select: { libelle: true, prix: true } },
      },
      orderBy: { debut: 'asc' }
    })

    const recharges = await prisma.transaction.findMany({
      where: {
        type: { in: ['RECHARGE_GERANT', 'RECHARGE_COUPON'] },
        client: { salleId },
        ...(dateDebut || dateFin ? {
          date: {
            ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
            ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59') } : {}),
          }
        } : {})
      },
      include: { client: { select: { pseudo: true } } },
      orderBy: { date: 'asc' }
    })

    const totalSessions = sessions.reduce((s, sess) => s + sess.duree.prix, 0)
    const totalRecharges = recharges.reduce((s, r) => s + r.montant, 0)
    const periode = dateDebut && dateFin
      ? `du ${dateDebut} au ${dateFin}`
      : dateDebut ? `depuis le ${dateDebut}` : dateFin ? `jusqu'au ${dateFin}` : 'cumulé à ce jour'

    // Construire le corps email HTML simple
    const lignesSessions = sessions.map(s =>
      `<tr><td>${s.client.pseudo}</td><td>${new Date(s.debut).toLocaleString('fr-FR')}</td><td>${s.duree.libelle}</td><td>${s.poste.nom}</td><td>${s.duree.prix.toLocaleString()} F</td><td>${s.gerant.prenom ?? ''} ${s.gerant.nom ?? ''}</td></tr>`
    ).join('')

    const html = `
      <h2>Rapport Switch SAB — ${salle.nom}</h2>
      <p><strong>Période :</strong> ${periode}</p>
      <h3>Résumé</h3>
      <ul>
        <li>Sessions : <strong>${sessions.length}</strong> — Total : <strong>${totalSessions.toLocaleString()} F</strong></li>
        <li>Recharges : <strong>${recharges.length}</strong> — Total : <strong>${totalRecharges.toLocaleString()} F</strong></li>
        <li>Total général : <strong>${(totalSessions + totalRecharges).toLocaleString()} F</strong></li>
      </ul>
      <h3>Détail des sessions</h3>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-size:12px;">
        <thead><tr><th>Client</th><th>Début</th><th>Durée</th><th>Poste</th><th>Montant</th><th>Gérant</th></tr></thead>
        <tbody>${lignesSessions || '<tr><td colspan="6">Aucune session</td></tr>'}</tbody>
      </table>
      <br/><p style="color:#888;font-size:11px;">Généré automatiquement par Switch SAB</p>
    `

    // Note : l'envoi réel nécessite un service SMTP (nodemailer, SendGrid, etc.)
    // Pour l'instant, on log et on répond avec succès
    // Pour intégrer nodemailer : npm install nodemailer + config SMTP dans .env
    console.log(`[rapport email] Envoi à ${emailProprietaire} — ${sessions.length} sessions — ${totalSessions}F`)
    console.log('[rapport email] Contenu HTML prêt, configurez SMTP pour l\'envoi réel')

    // Retourner le rapport pour affichage/debug (à remplacer par envoi réel)
    return res.json({
      message: `Rapport préparé pour ${emailProprietaire}. Configurez SMTP dans .env pour l'envoi réel.`,
      email: emailProprietaire,
      periode,
      resume: {
        nbSessions: sessions.length,
        totalSessions,
        nbRecharges: recharges.length,
        totalRecharges,
        totalGeneral: totalSessions + totalRecharges
      }
    })
  } catch (err) {
    console.error('[admin/rapports/envoyer-email POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
