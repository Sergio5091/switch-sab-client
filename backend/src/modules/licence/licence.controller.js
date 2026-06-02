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
// Body attendu : le JSON signé généré par le Super Admin
// { licenceId, salleId, machineId, issuedAt, expiresAt, signature }

export const activer = async (req, res) => {
  const { licenceId, salleId, machineId, issuedAt, expiresAt, signature } = req.body

  if (!licenceId || !salleId || !machineId || !issuedAt || !expiresAt || !signature) {
    return res.status(400).json({ message: 'JSON de licence incomplet. Champs requis : licenceId, salleId, machineId, issuedAt, expiresAt, signature' })
  }

  // Vérifier que le machineId correspond à cette machine
  const currentMachineId = getMachineId()
  if (machineId !== currentMachineId) {
    return res.status(403).json({ message: `Cette licence est liée à une autre machine (attendu: ${currentMachineId})` })
  }

  // Vérifier la signature RSA
  const resultat = verifierLicence({ licenceId, salleId, machineId, issuedAt, expiresAt, signature, status: 'ACTIVE' })
  if (!resultat.valide) {
    return res.status(400).json({ message: `Licence invalide : ${resultat.raison}` })
  }

  try {
    // Désactiver les anciennes licences
    await prisma.licenceLocale.updateMany({
      where: { status: 'ACTIVE' },
      data:  { status: 'REMPLACEE' }
    })

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

    await reloadLicence()

    logger.info(`Licence activée : ${licenceId}`)

    return res.status(201).json({
      message:       'Licence activée avec succès',
      licenceId:     licence.licenceId,
      expiresAt:     licence.expiresAt,
      joursRestants: resultat.joursRestants,
    })
  } catch (err) {
    logger.error('[licence/activer]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}