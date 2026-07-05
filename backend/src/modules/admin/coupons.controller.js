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

// GET /admin/coupons/pdf  — Génère un HTML imprimable avec QR codes
export const exportCouponsPdf = async (req, res) => {
  const { statut, limite } = req.query
  const where = { salleId: req.user.salle_id }
  if (statut === 'actif') where.utilise = false

  try {
    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limite) || 40
    })

    if (coupons.length === 0) {
      return res.status(404).json({ message: 'Aucun coupon trouvé' })
    }

    const QRCode = (await import('qrcode')).default

    const rows = await Promise.all(
      coupons.map(async c => {
        const svgString = await QRCode.toString(c.code, {
          type: 'svg', width: 90, margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        })
        return `
          <div class="coupon">
            <div class="valeur">${c.valeur.toLocaleString()} FCFA</div>
            <div class="qr">${svgString}</div>
            <div class="code">${c.code}</div>
            <div class="label">Switch SAB</div>
          </div>`
      })
    )

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Coupons Switch SAB</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: monospace; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; width: 100%; }
    .coupon { border: 1.5px dashed #f97316; border-radius: 6px; padding: 6px 4px; text-align: center; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .valeur { font-size: 12px; font-weight: bold; color: #f97316; }
    .qr svg { width: 90px; height: 90px; display: block; }
    .code { font-size: 10px; font-weight: bold; letter-spacing: 1.5px; }
    .label { font-size: 8px; color: #888; }
  </style>
</head>
<body>
  <div class="grid">${rows.join('')}</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', 'inline; filename="coupons-switch-sab.html"')
    return res.send(html)
  } catch (err) {
    console.error('[admin/coupons/pdf GET]', err)
    return res.status(500).json({ message: 'Erreur génération PDF' })
  }
}
