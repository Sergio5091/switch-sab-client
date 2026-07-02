import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'

// ─── POST /gerant/recharges → Effectuer recharge ────────────────────────

export const creerRecharge = async (req, res) => {
  const { clientId, categorieId, dureeId, montant } = req.body

  // Validation
  if (!clientId || !categorieId || !dureeId || montant === undefined) {
    return res.status(400).json({
      message: 'clientId, categorieId, dureeId et montant requis'
    })
  }

  try {
    // Vérifier que le client existe et appartient à la salle
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

    // Vérifier que la catégorie existe et appartient à la salle
    const categorie = await prisma.categorie.findFirst({
      where: {
        id: Number(categorieId),
        salleId: req.user.salle_id
      }
    })

    if (!categorie) {
      return res.status(404).json({
        message: 'Catégorie introuvable'
      })
    }

    // Vérifier que la durée existe et appartient à la catégorie
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

    // TRANSACTION : créer ou mettre à jour le crédit + enregistrer transaction
    const recharge = await prisma.$transaction(async (tx) => {
      // Upsert : crée la ligne si elle n'existe pas, sinon incrémente
      await tx.credit.upsert({
        where: {
          clientId_categorieId: {
            clientId: Number(clientId),
            categorieId: Number(categorieId)
          }
        },
        create: {
          clientId: Number(clientId),
          categorieId: Number(categorieId),
          solde: duree.secondes
        },
        update: {
          solde: { increment: duree.secondes }
        }
      })

      // Enregistrer transaction
      const transaction = await tx.transaction.create({
        data: {
          clientId: Number(clientId),
          montant: Number(montant),
          type: 'RECHARGE_GERANT',
          gerantId: req.user.id
        }
      })

      return transaction
    })

    logger.info(
      `Recharge effectuée : Client ${client.pseudo} + ${duree.libelle} (${duree.secondes}s)`
    )

    return res.status(201).json({
      message: 'Recharge effectuée',
      transaction: recharge,
    })
  } catch (err) {
    console.error('[gerant/recharges POST]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}

// ─── GET /gerant/recharges/en-attente → Lister recharges client ───────────

export const listerRechargesEnAttente = async (req, res) => {
  try {
    const recharges = await prisma.transaction.findMany({
      where: {
        type: 'RECHARGE_CLIENT',
        client: { salleId: req.user.salle_id }
      },
      select: {
        id: true,
        clientId: true,
        client: { select: { pseudo: true, telephone: true } },
        montant: true,
        date: true,
        type: true
      },
      orderBy: { date: 'asc' }
    })

    return res.json(recharges)
  } catch (err) {
    console.error('[gerant/recharges/en-attente GET]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}

// ─── GET /gerant/recharges → Historique complet des recharges ─────────────

export const listerHistoriqueRecharges = async (req, res) => {
  try {
    const { clientId, date } = req.query

    const where = {
      type: { in: ['RECHARGE_GERANT', 'RECHARGE_CLIENT', 'RECHARGE_COUPON'] },
      client: { salleId: req.user.salle_id }
    }

    if (clientId) where.clientId = Number(clientId)

    if (date) {
      const debut = new Date(date)
      debut.setHours(0, 0, 0, 0)
      const fin = new Date(date)
      fin.setHours(23, 59, 59, 999)
      where.date = { gte: debut, lte: fin }
    }

    const recharges = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        clientId: true,
        client: {
          select: {
            pseudo: true,
            telephone: true,
            credits: {
              select: {
                solde: true,
                categorie: { select: { id: true, nom: true } }
              }
            }
          }
        },
        montant: true,
        date: true,
        type: true,
        gerantId: true,
      },
      orderBy: { date: 'desc' }
    })

    // Enrichir avec le solde actuel par catégorie du client
    const result = recharges.map(r => ({
      ...r,
      creditsClient: r.client.credits.map(c => ({
        categorie: c.categorie.nom,
        soldeSecondes: c.solde,
        soldMinutes: Math.floor(c.solde / 60),
      }))
    }))

    return res.json(result)
  } catch (err) {
    console.error('[gerant/recharges GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── POST /gerant/recharges/:id/valider → Valider recharge client ─────────

export const validerRecharge = async (req, res) => {
  const transactionId = Number(req.params.id)

  try {
    // Récupérer transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { client: true }
    })

    if (!transaction) {
      return res.status(404).json({
        message: 'Recharge introuvable'
      })
    }

    // Vérifier que c'est une recharge client et qu'elle appartient à la salle
    if (
      transaction.type !== 'RECHARGE_CLIENT' ||
      transaction.client.salleId !== req.user.salle_id
    ) {
      return res.status(403).json({
        message: 'Accès refusé'
      })
    }

    // Créditer le client du montant
    const categories = await prisma.categorie.findMany({
      where: { salleId: req.user.salle_id },
      select: { id: true }
    })

    if (categories.length === 0) {
      return res.status(400).json({
        message: 'Aucune catégorie trouvée pour cette salle'
      })
    }

    // Créditer la première catégorie (ou répartir)
    const mainCategory = categories[0]

    // Vérifier crédit
    let credit = await prisma.credit.findFirst({
      where: {
        clientId: transaction.clientId,
        categorieId: mainCategory.id
      }
    })

    if (!credit) {
      credit = await prisma.credit.create({
        data: {
          clientId: transaction.clientId,
          categorieId: mainCategory.id,
          solde: 0
        }
      })
    }

    // Convertir montant en secondes (exemple : 1000 FCFA = 600 secondes / 2000 FCFA)
    // Rapport : montant / prix de base
    const dureesCategorie = await prisma.duree.findMany({
      where: { categorieId: mainCategory.id },
      orderBy: { prix: 'asc' },
      take: 1
    })

    const secondesGagnes = dureesCategorie.length > 0
      ? Math.floor((transaction.montant / dureesCategorie[0].prix) * dureesCategorie[0].secondes)
      : Math.floor(transaction.montant * 10) // Fallback : 10 secondes par unité monétaire

    // TRANSACTION : créditer + mettre à jour transaction
    await prisma.$transaction(async (tx) => {
      await tx.credit.update({
        where: { id: credit.id },
        data: { solde: credit.solde + secondesGagnes }
      })

      // Marquer comme validée (créer nouvelle transaction de confirmation)
      // On ne modifie pas l'originale mais on en créé une de confirmation
      await tx.transaction.create({
        data: {
          clientId: transaction.clientId,
          montant: transaction.montant,
          type: 'RECHARGE_GERANT', // Marque comme validée
          gerantId: req.user.id
        }
      })
    })

    logger.info(`Recharge validée : Client ${transaction.client.pseudo} + ${secondesGagnes}s`)

    return res.json({
      message: 'Recharge validée',
      secondesGagnes,
      nouveauSolde: credit.solde + secondesGagnes
    })
  } catch (err) {
    console.error('[gerant/recharges/:id/valider POST]', err)
    return res.status(500).json({
      message: 'Erreur serveur'
    })
  }
}

// ─── POST /gerant/recharges/coupon → Gérant applique un coupon pour un client ──

export const appliquerCouponGerant = async (req, res) => {
  const { code, clientId } = req.body

  if (!code || !clientId) {
    return res.status(400).json({ message: 'Code coupon et clientId requis' })
  }

  try {
    const client = await prisma.user.findFirst({
      where: { id: Number(clientId), salleId: req.user.salle_id, role: 'CLIENT' }
    })
    if (!client) return res.status(404).json({ message: 'Client introuvable' })

    const coupon = await prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), salleId: req.user.salle_id, utilise: false }
    })
    if (!coupon) return res.status(404).json({ message: 'Coupon invalide ou déjà utilisé' })

    await prisma.$transaction(async (tx) => {
      await tx.coupon.update({ where: { id: coupon.id }, data: { utilise: true } })
      // Créditer User.solde — les coupons ne touchent que le solde FCFA
      await tx.user.update({
        where: { id: Number(clientId) },
        data: { solde: { increment: coupon.valeur } }
      })
      await tx.transaction.create({
        data: { clientId: Number(clientId), montant: coupon.valeur, type: 'RECHARGE_COUPON', gerantId: req.user.id }
      })
    })

    logger.info(`Coupon ${coupon.code} (${coupon.valeur}F) → client ${client.pseudo} : +${coupon.valeur.toLocaleString()} FCFA sur solde`)

    return res.json({
      message: `Coupon appliqué — +${coupon.valeur.toLocaleString()} FCFA crédités sur le solde de ${client.pseudo}`,
      valeur: coupon.valeur,
    })
  } catch (err) {
    console.error('[gerant/recharges/coupon POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
