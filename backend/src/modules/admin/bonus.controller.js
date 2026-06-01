import prisma from '../../services/prismaClient.js'

// POST /admin/bonus/config
export const creerConfigBonus = async (req, res) => {
  const { ratioSecondes, seuilDeblocage, validitejours, reductionInvite, bonusParrain } = req.body

  if (!ratioSecondes || !seuilDeblocage) {
    return res.status(400).json({ message: 'ratioSecondes et seuilDeblocage sont requis' })
  }

  try {
    const existante = await prisma.configBonus.findUnique({
      where: { salleId: req.user.salle_id }
    })
    if (existante) {
      return res.status(409).json({ message: 'Une config bonus existe déjà. Utilisez PATCH pour la modifier.' })
    }

    const config = await prisma.configBonus.create({
      data: {
        salleId:        req.user.salle_id,
        ratioSecondes:  Number(ratioSecondes),
        seuilDeblocage: Number(seuilDeblocage),
        validitejours:  validitejours  ? Number(validitejours)  : 30,
        reductionInvite: reductionInvite ? Number(reductionInvite) : 0,
        bonusParrain:   bonusParrain   ? Number(bonusParrain)   : 0,
      }
    })
    return res.status(201).json(config)
  } catch (err) {
    console.error('[admin/bonus POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /admin/bonus/config
export const getConfigBonus = async (req, res) => {
  try {
    const config = await prisma.configBonus.findUnique({
      where: { salleId: req.user.salle_id }
    })
    if (!config) return res.status(404).json({ message: 'Aucune configuration bonus trouvée' })
    return res.json(config)
  } catch (err) {
    console.error('[admin/bonus GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// PATCH /admin/bonus/config
export const modifierConfigBonus = async (req, res) => {
  const { ratioSecondes, seuilDeblocage, validitejours, reductionInvite, bonusParrain } = req.body

  try {
    const config = await prisma.configBonus.upsert({
      where: { salleId: req.user.salle_id },
      update: {
        ...(ratioSecondes   !== undefined && { ratioSecondes:   Number(ratioSecondes) }),
        ...(seuilDeblocage  !== undefined && { seuilDeblocage:  Number(seuilDeblocage) }),
        ...(validitejours   !== undefined && { validitejours:   Number(validitejours) }),
        ...(reductionInvite !== undefined && { reductionInvite: Number(reductionInvite) }),
        ...(bonusParrain    !== undefined && { bonusParrain:    Number(bonusParrain) }),
      },
      create: {
        salleId:         req.user.salle_id,
        ratioSecondes:   Number(ratioSecondes  || 300),
        seuilDeblocage:  Number(seuilDeblocage || 3600),
        validitejours:   Number(validitejours  || 30),
        reductionInvite: Number(reductionInvite || 0),
        bonusParrain:    Number(bonusParrain   || 0),
      }
    })
    return res.json(config)
  } catch (err) {
    console.error('[admin/bonus PATCH]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
