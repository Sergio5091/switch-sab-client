import prisma from '../../services/prismaClient.js'

// Helper — vérifie que la catégorie appartient à la salle
const getCategorieOuErreur = async (categorieId, salleId, res) => {
  const cat = await prisma.categorie.findFirst({
    where: { id: Number(categorieId), salleId }
  })
  if (!cat) {
    res.status(404).json({ message: 'Catégorie introuvable' })
    return null
  }
  return cat
}

// POST /admin/categories/:id/durees
export const creerDuree = async (req, res) => {
  const categorieId = Number(req.params.id)
  const { libelle, secondes, prix } = req.body

  if (!libelle || !secondes || !prix) {
    return res.status(400).json({ message: 'libelle, secondes et prix sont requis' })
  }

  try {
    const cat = await getCategorieOuErreur(categorieId, req.user.salle_id, res)
    if (!cat) return

    const duree = await prisma.duree.create({
      data: { libelle, secondes: Number(secondes), prix: Number(prix), categorieId }
    })
    return res.status(201).json(duree)
  } catch (err) {
    console.error('[admin/durees POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /admin/categories/:id/durees
export const listerDurees = async (req, res) => {
  const categorieId = Number(req.params.id)

  try {
    const cat = await getCategorieOuErreur(categorieId, req.user.salle_id, res)
    if (!cat) return

    const durees = await prisma.duree.findMany({
      where: { categorieId },
      orderBy: { secondes: 'asc' }
    })
    return res.json(durees)
  } catch (err) {
    console.error('[admin/durees GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// PATCH /admin/durees/:id
export const modifierDuree = async (req, res) => {
  const id = Number(req.params.id)
  const { libelle, secondes, prix } = req.body

  try {
    // Vérifie que la durée appartient à une catégorie de cette salle
    const duree = await prisma.duree.findFirst({
      where: { id },
      include: { categorie: true }
    })
    if (!duree || duree.categorie.salleId !== req.user.salle_id) {
      return res.status(404).json({ message: 'Durée introuvable' })
    }

    const updated = await prisma.duree.update({
      where: { id },
      data: {
        ...(libelle  !== undefined && { libelle }),
        ...(secondes !== undefined && { secondes: Number(secondes) }),
        ...(prix     !== undefined && { prix: Number(prix) }),
      }
    })
    return res.json(updated)
  } catch (err) {
    console.error('[admin/durees PATCH]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// DELETE /admin/durees/:id
export const supprimerDuree = async (req, res) => {
  const id = Number(req.params.id)

  try {
    const duree = await prisma.duree.findFirst({
      where: { id },
      include: { categorie: true }
    })
    if (!duree || duree.categorie.salleId !== req.user.salle_id) {
      return res.status(404).json({ message: 'Durée introuvable' })
    }

    await prisma.duree.delete({ where: { id } })
    return res.json({ message: 'Durée supprimée' })
  } catch (err) {
    console.error('[admin/durees DELETE]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
