import prisma from '../../services/prismaClient.js'
import { verifierLicence, getLicenceActive } from '../../services/licenceService.js'
import { reloadLicence } from '../../middlewares/licence.middleware.js'
import { getMachineId } from '../../services/machineId.js'
import logger from '../../config/logger.js'

// ─── GET /licence/statut ──────────────────────────────────────────────────────

export const getStatut = async (req, res) => {
  try {
    const machineId = getMachineId()
    const licence = await getLicenceActive()

    if (!licence) {
      return res.json({
        statut:       'AUCUNE',
        message:      'Aucune licence active. Fournissez ce machineId au Super Admin.',
        machineId,
        joursRestants: 0,
      })
    }

    const resultat = verifierLicence(licence)

    return res.json({
      statut:        resultat.valide ? 'ACTIVE' : 'INVALIDE',
      message:       resultat.valide
        ? `Licence valide — ${resultat.joursRestants} jour(s) restant(s)`
        : resultat.raison,
      machineId,
      joursRestants: resultat.valide ? resultat.joursRestants : 0,
      licenceId:     licence.licenceId,
      expiresAt:     licence.expiresAt,
    })
  } catch (err) {
    logger.error('[licence/statut]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── POST /licence/activer ────────────────────────────────────────────────────
// Body attendu (JSON signé par le Projet 1) :
// {
//   "licenceId": "XXXX-XXXX-XXXX",
//   "salleId": 1,
//   "machineId": "abc123",
//   "issuedAt": "2026-06-01T00:00:00.000Z",
//   "expiresAt": "2027-06-01T00:00:00.000Z",
//   "signature": "<base64>"
// }

export const activer = async (req, res) => {
  const { licenceId, salleId, machineId, issuedAt, expiresAt, signature } = req.body

  if (!licenceId || !salleId || !machineId || !issuedAt || !expiresAt || !signature) {
    return res.status(400).json({ message: 'Tous les champs de la licence sont requis' })
  }

  try {
    // Vérifier la signature avant d'enregistrer
    const { verifySignature } = await import('../../services/licenceService.js')
    const signatureValide = verifySignature(
      { licenceId, salleId, machineId, issuedAt, expiresAt },
      signature
    )

    if (!signatureValide) {
      return res.status(400).json({ message: 'Licence invalide — signature incorrecte' })
    }

    // Désactiver les anciennes licences
    await prisma.licenceLocale.updateMany({
      where: { status: 'ACTIVE' },
      data:  { status: 'REMPLACEE' }
    })

    // Enregistrer la nouvelle licence
    const licence = await prisma.licenceLocale.create({
      data: {
        licenceId,
        salleId:   Number(salleId),
        machineId,
        issuedAt:  new Date(issuedAt),
        expiresAt: new Date(expiresAt),
        signature,
        status:    'ACTIVE',
      }
    })

    // Recharger l'état du middleware licence
    await reloadLicence()

    logger.info(`Licence activée : ${licenceId} — expire le ${expiresAt}`)

    return res.status(201).json({
      message:      'Licence activée avec succès',
      licenceId:    licence.licenceId,
      expiresAt:    licence.expiresAt,
      joursRestants: Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    })
  } catch (err) {
    logger.error('[licence/activer]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
