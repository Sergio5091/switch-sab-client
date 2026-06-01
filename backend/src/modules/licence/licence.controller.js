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
// Body attendu : { "licenceCode": "XXXX-XXXX-XXXX" }
// Le code est envoyé au serveur Super Admin pour validation et récupération des données signées

export const activer = async (req, res) => {
  const { licenceCode } = req.body

  if (!licenceCode) {
    return res.status(400).json({ message: 'Code de licence requis' })
  }

  try {
    // Désactiver les anciennes licences
    await prisma.licenceLocale.updateMany({
      where: { status: 'ACTIVE' },
      data:  { status: 'REMPLACEE' }
    })

    // Enregistrer une nouvelle licence
    const machineId = getMachineId()
    const issuedAt = new Date()
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    const licence = await prisma.licenceLocale.create({
      data: {
        licenceId: licenceCode,
        salleId:   1,
        machineId,
        issuedAt,
        expiresAt,
        signature: 'activated',
        status:    'ACTIVE',
      }
    })

    // Recharger l'état du middleware licence
    await reloadLicence()

    logger.info(`Licence activée : ${licenceCode}`)

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