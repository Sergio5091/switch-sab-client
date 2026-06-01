import bcrypt from 'bcryptjs'
import prisma from '../../services/prismaClient.js'

// POST /admin/gerants
export const creerGerant = async (req, res) => {
  const { pseudo, telephone, email, nom, prenom, telUrgence, motDePasse } = req.body

  if (!pseudo || !telephone || !motDePasse) {
    return res.status(400).json({ message: 'pseudo, telephone et motDePasse sont requis' })
  }

  try {
    const pseudoExistant = await prisma.user.findUnique({ where: { pseudo } })
    if (pseudoExistant) return res.status(409).json({ message: 'Ce pseudo est déjà utilisé' })

    const telExistant = await prisma.user.findUnique({ where: { telephone } })
    if (telExistant) return res.status(409).json({ message: 'Ce téléphone est déjà utilisé' })

    const hash = await bcrypt.hash(motDePasse, 10)

    const gerant = await prisma.user.create({
      data: {
        pseudo,
        telephone,
        email:      email     || null,
        nom:        nom       || null,
        prenom:     prenom    || null,
        telUrgence: telUrgence || null,
        motDePasse: hash,
        role:       'GERANT',
        salleId:    req.user.salle_id,
      }
    })

    const { motDePasse: _, ...gerantPublic } = gerant
    return res.status(201).json(gerantPublic)
  } catch (err) {
    console.error('[admin/gerants POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /admin/gerants
export const listerGerants = async (req, res) => {
  try {
    const gerants = await prisma.user.findMany({
      where: { salleId: req.user.salle_id, role: 'GERANT' },
      select: {
        id: true, pseudo: true, email: true, nom: true, prenom: true,
        telephone: true, telUrgence: true, active: true, createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return res.json(gerants)
  } catch (err) {
    console.error('[admin/gerants GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// PATCH /admin/gerants/:id
export const modifierGerant = async (req, res) => {
  const id = Number(req.params.id)
  const { nom, prenom, telephone, email, telUrgence, active, motDePasse } = req.body

  try {
    const gerant = await prisma.user.findFirst({
      where: { id, salleId: req.user.salle_id, role: 'GERANT' }
    })
    if (!gerant) return res.status(404).json({ message: 'Gérant introuvable' })

    const data = {
      ...(nom        !== undefined && { nom }),
      ...(prenom     !== undefined && { prenom }),
      ...(telephone  !== undefined && { telephone }),
      ...(email      !== undefined && { email }),
      ...(telUrgence !== undefined && { telUrgence }),
      ...(active     !== undefined && { active }),
    }

    if (motDePasse) {
      data.motDePasse = await bcrypt.hash(motDePasse, 10)
    }

    const updated = await prisma.user.update({ where: { id }, data })
    const { motDePasse: _, ...gerantPublic } = updated
    return res.json(gerantPublic)
  } catch (err) {
    console.error('[admin/gerants PATCH]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
