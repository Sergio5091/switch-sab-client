import prisma from '../../services/prismaClient.js'
import bcrypt from 'bcryptjs'
import logger from '../../config/logger.js'

// ─── POST /gerant/clients → Créer client ──────────────────────────────────

export const creerClient = async (req, res) => {
  const { pseudo, motDePasse, telephone, estEnfant, codeParental } = req.body

  if (!pseudo || !motDePasse) {
    return res.status(400).json({ message: 'pseudo et motDePasse requis' })
  }

  if (motDePasse.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' })
  }

  if (estEnfant && !codeParental) {
    return res.status(400).json({ message: 'Code parental requis pour les enfants' })
  }

  try {
    const pseudoExistant = await prisma.user.findUnique({ where: { pseudo } })
    if (pseudoExistant) {
      return res.status(409).json({ message: 'Ce pseudo est déjà utilisé' })
    }

    const hash = await bcrypt.hash(motDePasse, 10)

    const client = await prisma.user.create({
      data: {
        pseudo,
        telephone: telephone || `auto-${Date.now()}`,
        motDePasse: hash,
        role: 'CLIENT',
        estEnfant: estEnfant || false,
        codeParental: codeParental || null,
        salleId: req.user.salle_id,
        active: true
      }
    })

    // Créer crédit pour chaque catégorie de la salle
    const categories = await prisma.categorie.findMany({
      where: { salleId: req.user.salle_id }
    })

    for (const cat of categories) {
      await prisma.credit.create({
        data: {
          clientId: client.id,
          categorieId: cat.id,
          solde: 0
        }
      })
    }

    // Créer bonus
    await prisma.bonus.create({
      data: {
        clientId: client.id,
        solde: 0,
        disponible: false
      }
    })

    logger.info(`Client créé : ${pseudo} (${client.telephone})`)

    return res.status(201).json({
      id: client.id,
      pseudo: client.pseudo,
      telephone: client.telephone,
      role: client.role,
      estEnfant: client.estEnfant,
      salleId: client.salleId,
      motDePasseTemporaire: motDePasse // À communiquer au client
    })
  } catch (err) {
    console.error('[gerant/clients POST]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}

// ─── GET /gerant/clients → Lister clients ─────────────────────────────────

export const listerClients = async (req, res) => {
  try {
    const clients = await prisma.user.findMany({
      where: {
        salleId: req.user.salle_id,
        role: 'CLIENT'
      },
      select: {
        id: true,
        pseudo: true,
        telephone: true,
        email: true,
        estEnfant: true,
        active: true,
        createdAt: true,
        credits: {
          select: {
            id: true,
            solde: true,
            categorie: { select: { id: true, nom: true } }
          }
        },
        bonus: {
          select: { solde: true, disponible: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json(clients)
  } catch (err) {
    console.error('[gerant/clients GET]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}

// ─── GET /gerant/clients/:id → Détail client ──────────────────────────────

export const detailClient = async (req, res) => {
  const clientId = Number(req.params.id)

  try {
    const client = await prisma.user.findFirst({
      where: {
        id: clientId,
        salleId: req.user.salle_id,
        role: 'CLIENT'
      },
      select: {
        id: true,
        pseudo: true,
        telephone: true,
        email: true,
        nom: true,
        prenom: true,
        estEnfant: true,
        active: true,
        createdAt: true,
        credits: {
          select: {
            id: true,
            solde: true,
            categorie: { select: { id: true, nom: true } }
          }
        },
        bonus: {
          select: { solde: true, disponible: true, derniereActivite: true }
        },
        sessions: {
          where: { statut: { in: ['ACTIVE', 'ARRETEE'] } },
          select: {
            id: true,
            debut: true,
            fin: true,
            tempsRestant: true,
            statut: true,
            estBonus: true,
            poste: { select: { nom: true } },
            duree: { select: { libelle: true, secondes: true } }
          },
          orderBy: { debut: 'desc' },
          take: 10
        }
      }
    })

    if (!client) {
      return res.status(404).json({
        message: 'Client introuvable'
      })
    }

    return res.json(client)
  } catch (err) {
    console.error('[gerant/clients/:id GET]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}

// ─── PATCH /gerant/clients/:id → Modifier client ─────────────────────────

export const modifierClient = async (req, res) => {
  const clientId = Number(req.params.id)
  const { pseudo, email, nom, prenom, estEnfant, codeParental, active } = req.body

  try {
    // Vérifier que le client existe et appartient à la salle
    const clientExistant = await prisma.user.findFirst({
      where: {
        id: clientId,
        salleId: req.user.salle_id,
        role: 'CLIENT'
      }
    })

    if (!clientExistant) {
      return res.status(404).json({
        message: 'Client introuvable'
      })
    }

    // Vérifier unicité pseudo si modifié
    if (pseudo && pseudo !== clientExistant.pseudo) {
      const pseudoExistant = await prisma.user.findUnique({
        where: { pseudo }
      })
      if (pseudoExistant) {
        return res.status(409).json({
          message: 'Ce pseudo est déjà utilisé'
        })
      }
    }

    // Modifier
    const client = await prisma.user.update({
      where: { id: clientId },
      data: {
        ...(pseudo !== undefined && { pseudo }),
        ...(email !== undefined && { email }),
        ...(nom !== undefined && { nom }),
        ...(prenom !== undefined && { prenom }),
        ...(estEnfant !== undefined && { estEnfant }),
        ...(codeParental !== undefined && { codeParental }),
        ...(active !== undefined && { active })
      },
      select: {
        id: true,
        pseudo: true,
        telephone: true,
        email: true,
        nom: true,
        prenom: true,
        estEnfant: true,
        active: true,
        createdAt: true
      }
    })

    logger.info(`Client modifié : ${client.pseudo}`)

    return res.json(client)
  } catch (err) {
    console.error('[gerant/clients/:id PATCH]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}
