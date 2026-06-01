import prisma from '../../services/prismaClient.js'

// Charset sans O ni 0 — confusion visuelle
const CHARSET = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'

const genererCode = () => {
  const partie = (n) =>
    Array.from({ length: n }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]).join('')
  return `${partie(4)}-${partie(4)}`
}

const genererCodeUnique = async (salleId) => {
  let code
  let tentatives = 0
  do {
    code = genererCode()
    tentatives++
    if (tentatives > 100) throw new Error('Impossible de générer un code unique')
    const existant = await prisma.coupon.findUnique({ where: { code } })
    if (!existant) break
  } while (true)
  return code
}

// POST /admin/coupons/generer
export const genererCoupons = async (req, res) => {
  const { nombre, valeur } = req.body

  if (!nombre || !valeur) {
    return res.status(400).json({ message: 'nombre et valeur sont requis' })
  }
  if (nombre > 200) {
    return res.status(400).json({ message: 'Maximum 200 coupons par génération' })
  }

  try {
    const coupons = []
    for (let i = 0; i < Number(nombre); i++) {
      const code = await genererCodeUnique(req.user.salle_id)
      coupons.push({ code, valeur: Number(valeur), salleId: req.user.salle_id })
    }

    await prisma.coupon.createMany({ data: coupons })

    return res.status(201).json({
      message: `${nombre} coupon(s) générés`,
      coupons: coupons.map(c => ({ code: c.code, valeur: c.valeur }))
    })
  } catch (err) {
    console.error('[admin/coupons POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /admin/coupons?statut=actif|utilise
export const listerCoupons = async (req, res) => {
  const { statut } = req.query

  const where = { salleId: req.user.salle_id }
  if (statut === 'actif')   where.utilise = false
  if (statut === 'utilise') where.utilise = true

  try {
    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    return res.json(coupons)
  } catch (err) {
    console.error('[admin/coupons GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /admin/coupons/pdf  — TODO Phase 7
export const exportCouponsPdf = async (req, res) => {
  res.status(501).json({ message: 'Export PDF — À implémenter Phase 7' })
}
