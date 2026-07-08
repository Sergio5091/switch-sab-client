import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// POST /auth/login — login par téléphone ou pseudo
router.post('/login', async (req, res) => {
  const { telephone, pseudo, motDePasse } = req.body

  if (!motDePasse) {
    return res.status(400).json({ message: 'Mot de passe requis' })
  }
  if (!telephone && !pseudo) {
    return res.status(400).json({ message: 'Téléphone ou pseudo requis' })
  }

  try {
    const user = telephone
      ? await prisma.user.findUnique({ where: { telephone } })
      : await prisma.user.findUnique({ where: { pseudo } })

    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' })
    }

    const valid = await bcrypt.compare(motDePasse, user.motDePasse)
    if (!valid) {
      return res.status(401).json({ message: 'Identifiants invalides' })
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, salleId: user.salleId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    const { motDePasse: _, ...userSafe } = user
    res.json({ token, user: userSafe })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// GET /auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, pseudo: true, telephone: true, role: true,
        salleId: true, estEnfant: true, createdAt: true,
      },
    })
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
