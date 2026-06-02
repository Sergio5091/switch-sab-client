import prisma from '../../services/prismaClient.js'
import * as switchService from '../../switch/switchService.js'
import { getIO } from '../../socket.js'
import logger from '../../config/logger.js'

// ─── POST /gerant/sessions → Démarrer session ────────────────────────────

export const demarrerSession = async (req, res) => {
  const { clientId, categorieId, dureeId, useBonus } = req.body

  // Validation
  if (!clientId || !categorieId || !dureeId) {
    return res.status(400).json({
      message: 'clientId, categorieId et dureeId requis'
    })
  }

  try {
    // 1. Vérifier client existe et appartient à la salle
    const client = await prisma.user.findFirst({
      where: {
        id: Number(clientId),
        salleId: req.user.salle_id,
        role: 'CLIENT'
      }
    })

    if (!client) {
      return res.status(404).json({
        message: 'Client introuvable'
      })
    }

    // 2. Vérifier catégorie existe et appartient à la salle
    const categorie = await prisma.categorie.findFirst({
      where: {
        id: Number(categorieId),
        salleId: req.user.salle_id
      },
      include: { postes: true }
    })

    if (!categorie) {
      return res.status(404).json({
        message: 'Catégorie introuvable'
      })
    }

    // 3. Vérifier durée existe et appartient à la catégorie
    const duree = await prisma.duree.findFirst({
      where: {
        id: Number(dureeId),
        categorieId: Number(categorieId)
      }
    })

    if (!duree) {
      return res.status(404).json({
        message: 'Durée introuvable'
      })
    }

    // 4. Déterminer quelle source de crédit utiliser (bonus ou crédit catégorie)
    let creditSource
    let estBonus = false

    if (useBonus) {
      // Vérifier bonus disponible
      const bonus = await prisma.bonus.findUnique({
        where: { clientId: Number(clientId) }
      })

      if (!bonus || !bonus.disponible || bonus.solde < duree.secondes) {
        return res.status(400).json({
          message: 'Bonus indisponible ou insuffisant'
        })
      }

      creditSource = bonus
      estBonus = true
    } else {
      // Vérifier crédit catégorie
      const credit = await prisma.credit.findFirst({
        where: {
          clientId: Number(clientId),
          categorieId: Number(categorieId)
        }
      })

      if (!credit || credit.solde < duree.secondes) {
        return res.status(400).json({
          message: 'Crédit insuffisant pour cette catégorie'
        })
      }

      creditSource = credit
    }

    // 5. Trouver un poste libre dans la catégorie
    const posteLibre = await prisma.poste.findFirst({
      where: {
        categorieId: Number(categorieId),
        statut: 'LIBRE'
      }
    })

    if (!posteLibre) {
      return res.status(400).json({
        message: 'Aucun poste libre dans cette catégorie'
      })
    }

    // 6. TRANSACTION : débiter crédit + créer session + marquer poste occupé
    const session = await prisma.$transaction(async (tx) => {
      // Débiter crédit
      if (estBonus) {
        await tx.bonus.update({
          where: { id: creditSource.id },
          data: { solde: creditSource.solde - duree.secondes }
        })
      } else {
        await tx.credit.update({
          where: { id: creditSource.id },
          data: { solde: creditSource.solde - duree.secondes }
        })
      }

      // Créer session avec finPrevue
      const finPrevue = new Date(Date.now() + duree.secondes * 1000)
      const newSession = await tx.session.create({
        data: {
          clientId: Number(clientId),
          gerantId: req.user.id,
          posteId: posteLibre.id,
          dureeId: Number(dureeId),
          tempsRestant: duree.secondes,
          fin: finPrevue,
          statut: 'ACTIVE',
          estBonus
        },
        include: { client: true, poste: true, duree: true }
      })

      // Marquer poste comme occupé
      await tx.poste.update({
        where: { id: posteLibre.id },
        data: { statut: 'OCCUPE' }
      })

      return newSession
    })

    // 7. Appeler switch réel
    try {
      await switchService.allumerPoste(posteLibre.id)
    } catch (err) {
      logger.warn(`Impossible d'allumer poste ${posteLibre.id}:`, err.message)
      // On continue quand même (mock mode)
    }

    // 8. Émettre Socket.io session:start
    const io = getIO()
    io.emit('session:start', {
      sessionId: session.id,
      posteId: posteLibre.id,
      clientId: Number(clientId),
      finPrevue: session.fin,
      estBonus
    })

    // 9. setTimeout pour fin automatique
    scheduleSessionEnd(session.id, posteLibre.id, duree.secondes * 1000)

    logger.info(
      `Session démarrée : Client ${client.pseudo} sur ${categorie.nom} (${duree.libelle})`
    )

    return res.status(201).json({
      message: 'Session démarrée',
      session: {
        id: session.id,
        clientId: session.clientId,
        clientPseudo: session.client.pseudo,
        posteId: session.posteId,
        dureeId: session.dureeId,
        finPrevue: session.fin,
        statut: session.statut,
        estBonus: session.estBonus,
        debut: session.debut
      }
    })
  } catch (err) {
    console.error('[gerant/sessions POST]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}

// ─── POST /gerant/sessions/:id/arreter → Arrêter session ─────────────────

export const arreterSession = async (req, res) => {
  const sessionId = Number(req.params.id)

  try {
    // 1. Récupérer session et vérifier appartenance salle
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        gerant: { salleId: req.user.salle_id }
      },
      include: { poste: true, client: true }
    })

    if (!session) {
      return res.status(404).json({
        message: 'Session introuvable'
      })
    }

    if (session.statut !== 'ACTIVE') {
      return res.status(400).json({
        message: 'La session n\'est pas active'
      })
    }

    // 2. Annuler le setTimeout
    if (sessionTimeouts[sessionId]) {
      clearTimeout(sessionTimeouts[sessionId])
      delete sessionTimeouts[sessionId]
    }

    // 3. TRANSACTION : mettre à jour session + libérer poste
    await prisma.$transaction(async (tx) => {
      // Mettre à jour session en ARRETEE
      await tx.session.update({
        where: { id: sessionId },
        data: {
          statut: 'ARRETEE',
          fin: new Date()
        }
      })

      // Libérer poste
      await tx.poste.update({
        where: { id: session.poste.id },
        data: { statut: 'LIBRE' }
      })
    })

    // 4. Éteindre poste
    try {
      await switchService.eteindrePoste(session.poste.id)
    } catch (err) {
      logger.warn(`Impossible d'éteindre poste ${session.poste.id}:`, err.message)
    }

    // 5. Émettre Socket.io
    const io = getIO()
    io.emit('session:stop', {
      sessionId,
      posteId: session.poste.id,
      tempsRestantConserve: session.tempsRestant
    })

    logger.info(`Session arrêtée : ${session.client.pseudo} (temps conservé : ${session.tempsRestant}s)`)

    return res.json({
      message: 'Session arrêtée',
      tempsRestantConserve: session.tempsRestant
    })
  } catch (err) {
    console.error('[gerant/sessions/:id/arreter POST]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}

// ─── GET /gerant/sessions → Lister sessions actives ──────────────────────

export const listerSessions = async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        gerant: { salleId: req.user.salle_id },
        statut: { in: ['ACTIVE', 'ARRETEE'] }
      },
      select: {
        id: true,
        clientId: true,
        posteId: true,
        client: { select: { pseudo: true, telephone: true } },
        poste: { select: { id: true, nom: true } },
        duree: { select: { libelle: true, secondes: true, prix: true } },
        fin: true,
        statut: true,
        estBonus: true,
        debut: true
      },
      orderBy: { debut: 'desc' }
    })

    return res.json(sessions)
  } catch (err) {
    console.error('[gerant/sessions GET]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}

// ─── GET /gerant/sessions/:id → Détail session ──────────────────────────

export const detailSession = async (req, res) => {
  const sessionId = Number(req.params.id)

  try {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        gerant: { salleId: req.user.salle_id }
      },
      include: {
        client: { select: { pseudo: true, telephone: true, estEnfant: true } },
        poste: true,
        duree: true,
        gerant: { select: { pseudo: true } }
      }
    })

    if (!session) {
      return res.status(404).json({
        message: 'Session introuvable'
      })
    }

    return res.json(session)
  } catch (err) {
    console.error('[gerant/sessions/:id GET]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}

// ─── Fonction interne : Planifier fin automatique ────────────────────────

const sessionTimeouts = {}

export function scheduleSessionEnd(sessionId, posteId, delayMs) {
  sessionTimeouts[sessionId] = setTimeout(() => {
    delete sessionTimeouts[sessionId]
    endSessionAuto(sessionId, posteId)
  }, delayMs)
}

// ─── Fonction interne : Fin automatique session ────────────────────────

async function endSessionAuto(sessionId, posteId) {
  try {
    const io = getIO()

    // TRANSACTION : marquer TERMINEE + libérer poste
    await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: { client: true, bonus: true }
      })

      if (!session) return

      // Mettre à jour session
      await tx.session.update({
        where: { id: sessionId },
        data: {
          statut: 'TERMINEE',
          tempsRestant: 0,
          fin: new Date()
        }
      })

      // Libérer poste
      await tx.poste.update({
        where: { id: posteId },
        data: { statut: 'LIBRE' }
      })

      // Calculer et créditer bonus (si applicable)
      const configBonus = await tx.configBonus.findUnique({
        where: { salleId: session.client.salleId }
      })

      if (configBonus && !session.estBonus) {
        // Calculer bonus : ratioSecondes par heure jouée
        const heuresJouees = (session.duree.secondes - 0) / 3600
        const bonusGagne = Math.floor(configBonus.ratioSecondes * heuresJouees)

        if (bonusGagne > 0) {
          const bonus = await tx.bonus.findUnique({
            where: { clientId: session.clientId }
          })

          if (bonus) {
            const nouveauSolde = bonus.solde + bonusGagne
            const disponible =
              bonus.disponible || nouveauSolde >= configBonus.seuilDeblocage

            await tx.bonus.update({
              where: { id: bonus.id },
              data: {
                solde: nouveauSolde,
                disponible,
                derniereActivite: new Date()
              }
            })
          }
        }
      }
    })

    // Éteindre poste
    try {
      await switchService.eteindrePoste(posteId)
    } catch (err) {
      logger.warn(`Impossible d'éteindre poste ${posteId}:`, err.message)
    }

    // Émettre Socket.io
    io.emit('session:end', { sessionId, posteId })

    logger.info(`Session terminée automatiquement : ${sessionId}`)
  } catch (err) {
    logger.error(`Erreur fin auto session ${sessionId}:`, err.message)
  }
}

// ─── Exporter pour utilisation externe ─────────────────────────────────

export const getSessionTimeouts = () => sessionTimeouts
