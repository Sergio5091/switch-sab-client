import prisma from '../../services/prismaClient.js'
import * as switchService from '../../switch/switchService.js'
import * as zigbee from '../../switch/zigbeeSwitch.js'
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

    // §34 — Vérifier que le client n'a pas déjà une session active
    const sessionExistante = await prisma.session.findFirst({
      where: { clientId: Number(clientId), statut: 'ACTIVE' }
    })
    if (sessionExistante) {
      return res.status(409).json({
        message: 'Ce client a déjà une session active en cours'
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
    // Si dureeId non fourni → démarrage rapide : prendre la durée max que le client peut payer
    let duree
    if (dureeId) {
      duree = await prisma.duree.findFirst({
        where: { id: Number(dureeId), categorieId: Number(categorieId) }
      })
      if (!duree) {
        return res.status(404).json({ message: 'Durée introuvable' })
      }
    }

    // 4. Déterminer quelle source de crédit utiliser (bonus ou crédit catégorie)
    let creditSource
    let estBonus = false

    if (useBonus) {
      // Vérifier bonus disponible
      const bonus = await prisma.bonus.findUnique({
        where: { clientId: Number(clientId) }
      })

      if (!bonus || !bonus.disponible || bonus.solde < (duree?.secondes ?? 0)) {
        return res.status(400).json({
          message: 'Bonus indisponible ou insuffisant'
        })
      }

      // Si pas de durée choisie, prendre la durée max avec le bonus
      if (!duree) {
        const toutesLesdurees = await prisma.duree.findMany({
          where: { categorieId: Number(categorieId) },
          orderBy: { secondes: 'desc' }
        })
        duree = toutesLesdurees.find(d => d.secondes <= bonus.solde)
        if (!duree) {
          return res.status(400).json({ message: 'Bonus insuffisant pour toute durée disponible' })
        }
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

      if (!credit || credit.solde <= 0) {
        return res.status(400).json({
          message: 'Crédit insuffisant pour cette catégorie'
        })
      }

      // Si pas de durée choisie → démarrage rapide : prendre la durée max que le crédit peut couvrir
      if (!duree) {
        const toutesLesDurees = await prisma.duree.findMany({
          where: { categorieId: Number(categorieId) },
          orderBy: { secondes: 'desc' }
        })
        duree = toutesLesDurees.find(d => d.secondes <= credit.solde)
        if (!duree) {
          return res.status(400).json({ message: 'Crédit insuffisant pour toute durée disponible' })
        }
      }

      if (credit.solde < duree.secondes) {
        return res.status(400).json({
          message: 'Crédit insuffisant pour cette catégorie'
        })
      }

      creditSource = credit
    }

    // 5. Trouver le poste — priorité au choix du gérant, sinon premier libre
    const { posteId } = req.body
    let posteLibre

    if (posteId) {
      posteLibre = await prisma.poste.findFirst({
        where: {
          id: Number(posteId),
          categorieId: Number(categorieId),
          statut: 'LIBRE'
        }
      })
      if (!posteLibre) {
        return res.status(400).json({ message: 'Le poste choisi est indisponible ou occupé' })
      }
    } else {
      posteLibre = await prisma.poste.findFirst({
        where: { categorieId: Number(categorieId), statut: 'LIBRE' }
      })
    }

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

    // 7. Appeler switch réel — allumer + verrouiller + countdown
    try {
      await switchService.allumerPoste(posteLibre.id)
    } catch (err) {
      logger.warn(`Impossible d'allumer poste ${posteLibre.id}:`, err.message)
    }

    // child_lock LOCK + countdown matériel (sécurité si backend crash)
    // Ces appels sont non-bloquants — une erreur ne doit pas planter la session
    if (process.env.USE_MOCK_SWITCH !== 'true') {
      Promise.allSettled([
        zigbee.verrouillerPoste(posteLibre.id),
        zigbee.programmerArret(posteLibre.id, duree.secondes),
      ]).then((results) => {
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            logger.warn(`[zigbee] Action démarrage ${i} échouée :`, r.reason?.message)
          }
        })
      })
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
      const tempsRestant = Math.max(0, Math.floor((new Date(session.fin).getTime() - Date.now()) / 1000))
      await tx.session.update({
        where: { id: sessionId },
        data: { statut: 'ARRETEE', fin: new Date(), tempsRestant }
      })
      await tx.poste.update({
        where: { id: session.poste.id },
        data: { statut: 'LIBRE' }
      })
    })

    // 4. Éteindre poste + déverrouiller + annuler countdown
    try {
      await switchService.eteindrePoste(session.poste.id)
    } catch (err) {
      logger.warn(`Impossible d'éteindre poste ${session.poste.id}:`, err.message)
    }

    if (process.env.USE_MOCK_SWITCH !== 'true') {
      Promise.allSettled([
        zigbee.deverrouillerPoste(session.poste.id),
        zigbee.annulerCountdown(session.poste.id),
      ]).then((results) => {
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            logger.warn(`[zigbee] Action arrêt ${i} échouée :`, r.reason?.message)
          }
        })
      })
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
        poste: { select: { id: true, nom: true, categorieId: true } },
        duree: { select: { libelle: true, secondes: true, prix: true, categorieId: true } },
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

    await prisma.$transaction(async (tx) => {
      // Inclure duree et client (pas bonus — relation inexistante sur Session)
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: {
          client: { select: { id: true, pseudo: true, salleId: true } },
          duree: { select: { secondes: true } }
        }
      })

      if (!session || session.statut !== 'ACTIVE') return

      await tx.session.update({
        where: { id: sessionId },
        data: { statut: 'TERMINEE', tempsRestant: 0, fin: new Date() }
      })

      await tx.poste.update({
        where: { id: posteId },
        data: { statut: 'LIBRE' }
      })

      // Bonus — uniquement si session normale (pas bonus)
      if (!session.estBonus && session.duree?.secondes) {
        const configBonus = await tx.configBonus.findUnique({
          where: { salleId: session.client.salleId }
        })

        if (configBonus) {
          const heuresJouees = session.duree.secondes / 3600
          const bonusGagne = Math.floor(configBonus.ratioSecondes * heuresJouees)

          if (bonusGagne > 0) {
            const bonus = await tx.bonus.findUnique({
              where: { clientId: session.clientId }
            })

            if (bonus) {
              const nouveauSolde = bonus.solde + bonusGagne
              await tx.bonus.update({
                where: { id: bonus.id },
                data: {
                  solde: nouveauSolde,
                  disponible: bonus.disponible || nouveauSolde >= configBonus.seuilDeblocage,
                  derniereActivite: new Date()
                }
              })
            }
          }
        }
      }
    })

    try { await switchService.eteindrePoste(posteId) } catch (e) {
      logger.warn(`Impossible d'éteindre poste ${posteId}:`, e.message)
    }

    if (process.env.USE_MOCK_SWITCH !== 'true') {
      Promise.allSettled([
        zigbee.deverrouillerPoste(posteId),
        zigbee.annulerCountdown(posteId),
      ]).catch(() => {})
    }

    io.emit('session:end', { sessionId, posteId })
    logger.info(`Session ${sessionId} terminée automatiquement`)
  } catch (err) {
    logger.error(`Erreur fin auto session ${sessionId}:`, err.message)
  }
}

// ─── Exporter pour utilisation externe ─────────────────────────────────

export const getSessionTimeouts = () => sessionTimeouts

// ─── POST /gerant/sessions/:id/prolonger → Prolonger une session active ──────
// Ajoute du temps à une session en cours (modifie session.fin + relance le timer)

export const prolongerSession = async (req, res) => {
  const sessionId = Number(req.params.id)
  const { dureeId } = req.body

  if (!dureeId) return res.status(400).json({ message: 'dureeId requis' })

  try {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, statut: 'ACTIVE', gerant: { salleId: req.user.salle_id } },
      include: { client: true, poste: true, duree: true }
    })
    if (!session) return res.status(404).json({ message: 'Session active introuvable' })

    // §35 — vérifier que la durée appartient bien à la catégorie du poste
    const dureeSupp = await prisma.duree.findFirst({
      where: { id: Number(dureeId), categorieId: session.poste.categorieId }
    })
    if (!dureeSupp) return res.status(404).json({ message: 'Durée introuvable pour cette catégorie' })

    // Vérifier le crédit (bonus ou crédit catégorie selon le type de session)
    let creditSource
    if (session.estBonus) {
      const bonus = await prisma.bonus.findUnique({ where: { clientId: session.clientId } })
      if (!bonus || bonus.solde < dureeSupp.secondes) {
        return res.status(400).json({ message: 'Bonus insuffisant pour prolonger' })
      }
      creditSource = { type: 'bonus', data: bonus }
    } else {
      const credit = await prisma.credit.findFirst({
        where: { clientId: session.clientId, categorieId: session.poste.categorieId }
      })
      if (!credit || credit.solde < dureeSupp.secondes) {
        return res.status(400).json({ message: 'Crédit insuffisant pour prolonger' })
      }
      creditSource = { type: 'credit', data: credit }
    }

    // Calculer la nouvelle fin
    const tempsRestantActuel = Math.max(0, Math.floor((new Date(session.fin).getTime() - Date.now()) / 1000))
    const nouvelleFin = new Date(Date.now() + (tempsRestantActuel + dureeSupp.secondes) * 1000)

    await prisma.$transaction(async (tx) => {
      // Débiter la bonne source
      if (creditSource.type === 'bonus') {
        await tx.bonus.update({
          where: { id: creditSource.data.id },
          data: { solde: creditSource.data.solde - dureeSupp.secondes }
        })
      } else {
        await tx.credit.update({
          where: { id: creditSource.data.id },
          data: { solde: creditSource.data.solde - dureeSupp.secondes }
        })
      }
      // Mettre à jour la fin de session
      await tx.session.update({
        where: { id: sessionId },
        data: { fin: nouvelleFin, tempsRestant: tempsRestantActuel + dureeSupp.secondes }
      })
    })

    // Annuler l'ancien timer et en lancer un nouveau
    if (sessionTimeouts[sessionId]) {
      clearTimeout(sessionTimeouts[sessionId])
      delete sessionTimeouts[sessionId]
    }
    scheduleSessionEnd(sessionId, session.poste.id, (tempsRestantActuel + dureeSupp.secondes) * 1000)

    // Notifier le frontend
    getIO().emit('session:prolonged', {
      sessionId,
      posteId: session.poste.id,
      nouvelleFin,
      dureeAjoutee: dureeSupp.libelle
    })

    logger.info(`Session ${sessionId} prolongée de ${dureeSupp.libelle} pour ${session.client.pseudo}`)

    return res.json({
      message: `Session prolongée de ${dureeSupp.libelle}`,
      nouvelleFin,
      tempsRestant: tempsRestantActuel + dureeSupp.secondes
    })
  } catch (err) {
    console.error('[gerant/sessions/:id/prolonger POST]', err)
    return res.status(500).json({ message: `Erreur serveur : ${err.message}` })
  }
}
