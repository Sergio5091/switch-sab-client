import prisma from '../../services/prismaClient.js'

// POST /admin/postes
export const creerPoste = async (req, res) => {
  const { nom, categorieId, image } = req.body

  if (!nom || !categorieId) {
    return res.status(400).json({ message: 'nom et categorieId sont requis' })
  }

  try {
    // Vérifie que la catégorie appartient à cette salle
    const cat = await prisma.categorie.findFirst({
      where: { id: Number(categorieId), salleId: req.user.salle_id }
    })
    if (!cat) return res.status(404).json({ message: 'Catégorie introuvable' })

    const poste = await prisma.poste.create({
      data: { nom, categorieId: Number(categorieId), image: image || null }
    })
    return res.status(201).json(poste)
  } catch (err) {
    console.error('[admin/postes POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /admin/postes
export const listerPostes = async (req, res) => {
  try {
    const postes = await prisma.poste.findMany({
      where: { categorie: { salleId: req.user.salle_id } },
      include: { categorie: { select: { id: true, nom: true } } },
      orderBy: { id: 'asc' }
    })
    return res.json(postes)
  } catch (err) {
    console.error('[admin/postes GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// PATCH /admin/postes/:id
export const modifierPoste = async (req, res) => {
  const id = Number(req.params.id)
  const { nom, image, categorieId } = req.body

  try {
    const poste = await prisma.poste.findFirst({
      where: { id },
      include: { categorie: true }
    })
    if (!poste || poste.categorie.salleId !== req.user.salle_id) {
      return res.status(404).json({ message: 'Poste introuvable' })
    }

    // Si on change de catégorie, vérifier qu'elle appartient à la salle
    if (categorieId) {
      const cat = await prisma.categorie.findFirst({
        where: { id: Number(categorieId), salleId: req.user.salle_id }
      })
      if (!cat) return res.status(404).json({ message: 'Catégorie introuvable' })
    }

    const updated = await prisma.poste.update({
      where: { id },
      data: {
        ...(nom         !== undefined && { nom }),
        ...(image       !== undefined && { image }),
        ...(categorieId !== undefined && { categorieId: Number(categorieId) }),
      }
    })
    return res.json(updated)
  } catch (err) {
    console.error('[admin/postes PATCH]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// DELETE /admin/postes/:id
export const supprimerPoste = async (req, res) => {
  const id = Number(req.params.id)

  try {
    const poste = await prisma.poste.findFirst({
      where: { id },
      include: { categorie: true }
    })
    if (!poste || poste.categorie.salleId !== req.user.salle_id) {
      return res.status(404).json({ message: 'Poste introuvable' })
    }

    await prisma.poste.delete({ where: { id } })
    return res.json({ message: 'Poste supprimé' })
  } catch (err) {
    console.error('[admin/postes DELETE]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
