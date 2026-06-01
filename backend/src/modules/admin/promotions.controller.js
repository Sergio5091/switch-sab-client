import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'

// POST /admin/promotions
export const creerPromotion = async (req, res) => {
  const { titre, message, image } = req.body

  if (!titre) return res.status(400).json({ message: 'Le titre est requis' })

  try {
    const promo = await prisma.promo.create({
      data: {
        titre,
        message: message || null,
        image:   image   || null,
        salleId: req.user.salle_id,
      }
    })
    return res.status(201).json(promo)
  } catch (err) {
    console.error('[admin/promotions POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /admin/promotions
export const listerPromotions = async (req, res) => {
  try {
    const promos = await prisma.promo.findMany({
      where: { salleId: req.user.salle_id },
      orderBy: { createdAt: 'desc' }
    })
    return res.json(promos)
  } catch (err) {
    console.error('[admin/promotions GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// POST /admin/promotions/:id/envoyer — TODO Phase 2.8 Twilio
export const envoyerPromotion = async (req, res) => {
  const id = Number(req.params.id)

  try {
    const promo = await prisma.promo.findFirst({
      where: { id, salleId: req.user.salle_id }
    })
    if (!promo) return res.status(404).json({ message: 'Promotion introuvable' })

    // Récupérer tous les clients de la salle avec un téléphone
    const clients = await prisma.user.findMany({
      where: { salleId: req.user.salle_id, role: 'CLIENT', active: true },
      select: { telephone: true }
    })

    // TODO Phase 2.8 — intégration Twilio SMS/WhatsApp
    logger.info(`[promotions] Envoi à ${clients.length} clients — Twilio non configuré`)

    await prisma.promo.update({
      where: { id },
      data: { envoyee: true }
    })

    return res.json({
      message: `Promotion marquée comme envoyée (${clients.length} clients)`,
      note:    'Intégration Twilio à configurer en Phase 2.8'
    })
  } catch (err) {
    console.error('[admin/promotions/envoyer]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
