import prisma from './prismaClient.js'
import { envoyerEmail } from './mailService.js'
import logger from '../config/logger.js'

/**
 * Construit les données du rapport pour une plage de dates donnée.
 */
async function buildRapportData(salleId, dateDebut, dateFin) {
  const debutDT = new Date(dateDebut)
  const finDT   = new Date(dateFin)
  finDT.setHours(23, 59, 59, 999)

  const [salle, sessions, recharges] = await Promise.all([
    prisma.salle.findUnique({ where: { id: salleId } }),

    prisma.session.findMany({
      where: {
        client: { salleId },
        debut: { gte: debutDT, lte: finDT },
      },
      include: {
        client: { select: { pseudo: true } },
        gerant: { select: { nom: true, prenom: true } },
        poste:  { select: { nom: true } },
        duree:  { select: { libelle: true, prix: true, secondes: true } },
      },
      orderBy: { debut: 'asc' },
    }),

    prisma.transaction.findMany({
      where: {
        type: { in: ['RECHARGE_GERANT', 'RECHARGE_COUPON', 'RECHARGE_CLIENT'] },
        client: { salleId },
        date: { gte: debutDT, lte: finDT },
      },
      include: { client: { select: { pseudo: true } } },
      orderBy: { date: 'asc' },
    }),
  ])

  const totalSessions  = sessions.reduce((s, sess) => s + sess.duree.prix, 0)
  const totalRecharges = recharges.reduce((s, r) => s + r.montant, 0)

  return { salle, sessions, recharges, totalSessions, totalRecharges }
}

/**
 * Construit le HTML du rapport.
 */
function buildHtml({ salle, sessions, recharges, totalSessions, totalRecharges, dateLabel }) {
  const fmt = (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  const money = (n) => n.toLocaleString('fr-FR') + ' FCFA'

  const rowsSessions = sessions.map(s => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${s.client.pseudo}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${fmt(s.debut)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${s.duree.libelle}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${s.poste.nom}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#4f46e5">${money(s.duree.prix)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;color:#6b7280">${[s.gerant.prenom, s.gerant.nom].filter(Boolean).join(' ') || '—'}</td>
    </tr>`).join('')

  const rowsRecharges = recharges.map(r => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${r.client.pseudo}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${fmt(r.date)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#059669">${money(r.montant)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;color:#6b7280">${r.type.replace('RECHARGE_', '')}</td>
    </tr>`).join('')

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;color:#111827">
  <div style="max-width:700px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">

    <!-- Header -->
    <div style="background:#4f46e5;padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px">📊 Rapport journalier — ${salle.nom}</h1>
      <p style="margin:6px 0 0;color:#c7d2fe;font-size:13px">${dateLabel}</p>
    </div>

    <!-- Résumé -->
    <div style="padding:24px 32px;background:#f5f3ff;border-bottom:1px solid #e5e7eb">
      <h2 style="margin:0 0 16px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280">Résumé</h2>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px;background:#fff;border-radius:8px;padding:16px;border:1px solid #e5e7eb">
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Sessions</div>
          <div style="font-size:22px;font-weight:700;color:#4f46e5">${sessions.length}</div>
          <div style="font-size:12px;color:#374151;margin-top:4px">${money(totalSessions)}</div>
        </div>
        <div style="flex:1;min-width:140px;background:#fff;border-radius:8px;padding:16px;border:1px solid #e5e7eb">
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Recharges</div>
          <div style="font-size:22px;font-weight:700;color:#059669">${recharges.length}</div>
          <div style="font-size:12px;color:#374151;margin-top:4px">${money(totalRecharges)}</div>
        </div>
        <div style="flex:1;min-width:140px;background:#4f46e5;border-radius:8px;padding:16px">
          <div style="font-size:11px;color:#c7d2fe;margin-bottom:4px">Total général</div>
          <div style="font-size:22px;font-weight:700;color:#fff">${money(totalSessions + totalRecharges)}</div>
        </div>
      </div>
    </div>

    <!-- Sessions -->
    <div style="padding:24px 32px">
      <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280">Détail des sessions</h2>
      ${sessions.length === 0
        ? '<p style="color:#9ca3af;font-size:13px">Aucune session ce jour</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Client</th>
                <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Début</th>
                <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Durée</th>
                <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Poste</th>
                <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Montant</th>
                <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Gérant</th>
              </tr>
            </thead>
            <tbody>${rowsSessions}</tbody>
          </table>`
      }
    </div>

    <!-- Recharges -->
    <div style="padding:0 32px 24px">
      <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280">Recharges</h2>
      ${recharges.length === 0
        ? '<p style="color:#9ca3af;font-size:13px">Aucune recharge ce jour</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Client</th>
                <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Date</th>
                <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Montant</th>
                <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Type</th>
              </tr>
            </thead>
            <tbody>${rowsRecharges}</tbody>
          </table>`
      }
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
      <p style="margin:0;font-size:11px;color:#9ca3af">Rapport généré automatiquement par Switch SAB · ${new Date().toLocaleString('fr-FR')}</p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Envoie le rapport de la veille pour toutes les salles ayant un email configuré.
 * Appelé par le scheduler chaque matin.
 */
export async function envoyerRapportVeille() {
  const hier = new Date()
  hier.setDate(hier.getDate() - 1)
  const dateStr = hier.toISOString().split('T')[0] // YYYY-MM-DD
  const dateLabel = hier.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const salles = await prisma.salle.findMany({
    where: { email: { not: null }, disabled: false },
    select: { id: true, nom: true, email: true },
  })

  if (salles.length === 0) {
    logger.info('[rapport-auto] Aucune salle avec email configuré')
    return
  }

  for (const salle of salles) {
    try {
      const data = await buildRapportData(salle.id, dateStr, dateStr)
      const html = buildHtml({ ...data, dateLabel })

      await envoyerEmail({
        to:      salle.email,
        subject: `📊 Rapport du ${dateLabel} — ${salle.nom}`,
        html,
        text:    `Rapport Switch SAB — ${salle.nom}\n${dateLabel}\nSessions: ${data.sessions.length} (${data.totalSessions.toLocaleString('fr-FR')} FCFA)\nRecharges: ${data.recharges.length} (${data.totalRecharges.toLocaleString('fr-FR')} FCFA)\nTotal: ${(data.totalSessions + data.totalRecharges).toLocaleString('fr-FR')} FCFA`,
      })

      logger.info(`[rapport-auto] Rapport envoyé à ${salle.email} (${salle.nom})`)
    } catch (err) {
      logger.error(`[rapport-auto] Échec envoi pour salle ${salle.id} (${salle.nom}) : ${err.message}`)
    }
  }
}

/**
 * Envoie le rapport d'une période donnée pour une salle spécifique.
 * Appelé manuellement depuis l'endpoint admin.
 */
export async function envoyerRapportPeriode(salleId, dateDebut, dateFin) {
  const data = await buildRapportData(salleId, dateDebut, dateFin)

  if (!data.salle?.email) {
    throw new Error("Aucun email configuré pour cette salle")
  }

  const debut = new Date(dateDebut).toLocaleDateString('fr-FR')
  const fin   = new Date(dateFin).toLocaleDateString('fr-FR')
  const dateLabel = debut === fin ? `le ${debut}` : `du ${debut} au ${fin}`
  const html = buildHtml({ ...data, dateLabel })

  await envoyerEmail({
    to:      data.salle.email,
    subject: `📊 Rapport ${dateLabel} — ${data.salle.nom}`,
    html,
    text: `Rapport Switch SAB — ${data.salle.nom}\n${dateLabel}\nSessions: ${data.sessions.length} (${data.totalSessions.toLocaleString('fr-FR')} FCFA)\nRecharges: ${data.recharges.length} (${data.totalRecharges.toLocaleString('fr-FR')} FCFA)`,
  })

  return data
}
