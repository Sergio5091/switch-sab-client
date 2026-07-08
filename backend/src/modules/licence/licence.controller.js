import prisma from '../../services/prismaClient.js'
import { verifierLicence, getLicenceActive, computeHash } from '../../services/licenceService.js'
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
// { licenceId, salleId, machineId, issuedAt, expiresAt, status, signature }

export const activer = async (req, res) => {
  const { licenceId, salleId, machineId, issuedAt, expiresAt, signature } = req.body

  if (!licenceId || !machineId || !issuedAt || !expiresAt || !signature) {
    return res.status(400).json({
      message: 'JSON de licence incomplet. Champs requis : licenceId, salleId, machineId, issuedAt, expiresAt, signature'
    })
  }

  // Vérifier que le machineId correspond à cette machine
  const currentMachineId = getMachineId()
  if (machineId !== currentMachineId) {
    return res.status(403).json({
      message: `Cette licence est liée à une autre machine.\nMachine attendue : ${currentMachineId}\nMachine reçue    : ${machineId}`
    })
  }

  // Normaliser les dates en ISO string pour la vérification (comme lors de la signature)
  const issuedAtStr  = new Date(issuedAt).toISOString()
  const expiresAtStr = new Date(expiresAt).toISOString()

  // Vérifier la signature RSA avec le même format que le superadmin
  const resultat = verifierLicence({
    licenceId,
    salleId:   salleId ?? 0,
    machineId,
    issuedAt:  issuedAtStr,
    expiresAt: expiresAtStr,
    signature,
    status:    'ACTIVE',
    hash:      null, // pas encore de hash, on ne vérifie pas encore
  })

  if (!resultat.valide) {
    return res.status(400).json({ message: `Licence invalide : ${resultat.raison}` })
  }

  try {
    // Désactiver les anciennes licences
    await prisma.licenceLocale.updateMany({
      where: { status: 'ACTIVE' },
      data:  { status: 'REMPLACEE' }
    })

    const issuedAtDate  = new Date(issuedAt)
    const expiresAtDate = new Date(expiresAt)

    // Calculer le hash anti-fraude (avec les ISO strings pour cohérence)
    const hash = computeHash({
      licenceId,
      salleId:   salleId ?? 0,
      machineId,
      issuedAt:  issuedAtStr,
      expiresAt: expiresAtStr,
      signature,
    })

    const licenceData = {
      licenceId,
      salleId:   salleId ?? 0,
      machineId,
      issuedAt:  issuedAtDate,
      expiresAt: expiresAtDate,
      signature,
      status:    'ACTIVE',
      hash,
    }

    // upsert : crée ou met à jour si le licenceId existe déjà
    const licence = await prisma.licenceLocale.upsert({
      where:  { licenceId },
      update: licenceData,
      create: licenceData,
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
    return res.status(500).json({ message: `Erreur serveur : ${err.message}` })
  }
}