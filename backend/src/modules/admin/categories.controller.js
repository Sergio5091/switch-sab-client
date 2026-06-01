import prisma from '../../services/prismaClient.js'

// POST /admin/categories
export const creerCategorie = async (req, res) => {
  const { nom } = req.body
  if (!nom) return res.status(400).json({ message: 'Le nom est requis' })

  try {
    const categorie = await prisma.categorie.create({
      data: { nom, salleId: req.user.salle_id }
    })
    return res.status(201).json(categorie)
  } catch (err) {
    console.error('[admin/categories POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /admin/categories
export const listerCategories = async (req, res) => {
  try {
    const categories = await prisma.categorie.findMany({
      where: { salleId: req.user.salle_id },
      include: { durees: true, _count: { select: { postes: true } } },
      orderBy: { id: 'asc' }
    })
    return res.json(categories)
  } catch (err) {
    console.error('[admin/categories GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// PATCH /admin/categories/:id
export const modifierCategorie = async (req, res) => {
  const id = Number(req.params.id)
  const { nom } = req.body

  try {
    const existante = await prisma.categorie.findFirst({
      where: { id, salleId: req.user.salle_id }
    })
    if (!existante) return res.status(404).json({ message: 'Catégorie introuvable' })

    const categorie = await prisma.categorie.update({
      where: { id },
      data: { nom }
    })
    return res.json(categorie)
  } catch (err) {
    console.error('[admin/categories PATCH]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// DELETE /admin/categories/:id
export const supprimerCategorie = async (req, res) => {
  const id = Number(req.params.id)

  try {
    const existante = await prisma.categorie.findFirst({
      where: { id, salleId: req.user.salle_id }
    })
    if (!existante) return res.status(404).json({ message: 'Catégorie introuvable' })

    await prisma.categorie.delete({ where: { id } })
    return res.json({ message: 'Catégorie supprimée' })
  } catch (err) {
    console.error('[admin/categories DELETE]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
