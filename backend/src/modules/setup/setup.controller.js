import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'

// ─── GET /api/setup/statut ────────────────────────────────────────────────────
// Indique si la salle initiale existe déjà (pour le wizard frontend)

export const getStatut = async (req, res) => {
  try {
    const salle = await prisma.salle.findFirst()
    return res.json({ salleConfiguree: !!salle })
  } catch (err) {
    logger.error('[setup/statut]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── POST /api/setup/salle ────────────────────────────────────────────────────
// Crée la salle initiale — accessible sans licence (route exemptée)
// Protégé : échoue si une salle existe déjà

export const creerSalle = async (req, res) => {
  try {
    // Empêcher la création d'une deuxième salle
    const salleExistante = await prisma.salle.findFirst()
    if (salleExistante) {
      return res.status(409).json({ message: 'Une salle est déjà configurée.' })
    }

    const { nom, pays, indicatifPays, ville, quartier, telephone, switchType, switchConfig } = req.body

    if (!nom || !pays || !indicatifPays || !ville || !quartier || !telephone) {
      return res.status(400).json({
        message: 'Champs requis : nom, pays, indicatifPays, ville, quartier, telephone'
      })
    }

    const result = await prisma.$transaction(async (tx) => {
      const salle = await tx.salle.create({
        data: {
          nom,
          pays,
          indicatifPays: indicatifPays.toUpperCase(),
          ville,
          quartier,
          telephone,
          switchType:   switchType   || 'WIFI',
          switchConfig: switchConfig || null,
        }
      })

      // 2. Mettre à jour tous les admins sans salle (salleId = null)
      await tx.user.updateMany({
        where: { role: 'ADMIN', salleId: null },
        data: { salleId: salle.id }
      })

      return salle
    })

    logger.info(`Salle créée : ${result.nom} (id=${result.id}) — Admins mis à jour`)
    
    // Retourner un message indiquant qu'il faut se reconnecter
    return res.status(201).json({ 
      message: 'Salle créée avec succès. Veuillez vous reconnecter pour actualiser votre session.', 
      salle: result,
      requireReconnect: true  // Flag pour le frontend
    })
  } catch (err) {
    logger.error('[setup/salle]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
