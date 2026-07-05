import prisma from '../../services/prismaClient.js'

// GET /admin/promo/config  (réutilise ConfigBonus — les champs promo y sont)
export const getPromoConfig = async (req, res) => {
  try {
    const config = await prisma.configBonus.findUnique({
      where: { salleId: req.user.salle_id },
      select: { reductionInvite: true, bonusParrain: true, bonusFilleul: true, salleId: true }
    })
    if (!config) return res.status(404).json({ message: 'Aucune configuration promo trouvée' })
    return res.json(config)
  } catch (err) {
    console.error('[admin/promo/config GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// PATCH /admin/promo/config
export const modifierPromoConfig = async (req, res) => {
  const { reductionInvite, bonusParrain, bonusFilleul } = req.body

  try {
    const config = await prisma.configBonus.upsert({
      where: { salleId: req.user.salle_id },
      update: {
        ...(reductionInvite !== undefined && { reductionInvite: Number(reductionInvite) }),
        ...(bonusParrain    !== undefined && { bonusParrain:    Number(bonusParrain) }),
        ...(bonusFilleul    !== undefined && { bonusFilleul:    Number(bonusFilleul) }),
      },
      create: {
        salleId:         req.user.salle_id,
        ratioSecondes:   300,
        seuilDeblocage:  3600,
        validitejours:   30,
        reductionInvite: Number(reductionInvite || 0),
        bonusParrain:    Number(bonusParrain    || 0),
        bonusFilleul:    Number(bonusFilleul    || 0),
      }
    })
    return res.json({
      reductionInvite: config.reductionInvite,
      bonusParrain:    config.bonusParrain,
      bonusFilleul:    config.bonusFilleul,
      salleId:         config.salleId,
    })
  } catch (err) {
    console.error('[admin/promo/config PATCH]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
