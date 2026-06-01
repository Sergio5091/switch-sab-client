import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../services/prismaClient.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, salle_id: user.salleId },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  )

const userPublic = (user) => ({
  id:        user.id,
  pseudo:    user.pseudo,
  email:     user.email,
  nom:       user.nom,
  prenom:    user.prenom,
  telephone: user.telephone,
  role:      user.role,
  salleId:   user.salleId,
  active:    user.active,
  createdAt: user.createdAt,
})

// ─── POST /auth/login ─────────────────────────────────────────────────────────

export const login = async (req, res) => {
  const { telephone, email, motDePasse } = req.body

  // Au moins un identifiant requis
  if ((!telephone && !email) || !motDePasse) {
    return res.status(400).json({ message: 'Identifiant (téléphone ou email) et mot de passe requis' })
  }

  try {
    // Recherche par téléphone OU email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          telephone ? { telephone } : undefined,
          email     ? { email }     : undefined,
        ].filter(Boolean),
      },
    })

    if (!user) {
      return res.status(401).json({ message: 'Identifiants incorrects' })
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Compte désactivé. Contactez votre administrateur.' })
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, user.motDePasse)
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Identifiants incorrects' })
    }

    const token = signToken(user)

    return res.json({ token, user: userPublic(user) })
  } catch (err) {
    console.error('[auth/login]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── POST /auth/register ──────────────────────────────────────────────────────

export const register = async (req, res) => {
  const { pseudo, telephone, motDePasse } = req.body

  if (!pseudo || !telephone || !motDePasse) {
    return res.status(400).json({ message: 'pseudo, téléphone et mot de passe requis' })
  }

  if (motDePasse.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' })
  }

  try {
    // Vérification unicité pseudo
    const pseudoExistant = await prisma.user.findUnique({ where: { pseudo } })
    if (pseudoExistant) {
      return res.status(409).json({ message: 'Ce pseudo est déjà utilisé' })
    }

    // Vérification unicité téléphone
    const telExistant = await prisma.user.findUnique({ where: { telephone } })
    if (telExistant) {
      return res.status(409).json({ message: 'Ce numéro de téléphone est déjà utilisé' })
    }

    const hash = await bcrypt.hash(motDePasse, 10)

    const user = await prisma.user.create({
      data: {
        pseudo,
        telephone,
        motDePasse: hash,
        role: 'CLIENT',
      },
    })

    const token = signToken(user)

    return res.status(201).json({ token, user: userPublic(user) })
  } catch (err) {
    console.error('[auth/register]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' })
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Compte désactivé' })
    }

    return res.json({ user: userPublic(user) })
  } catch (err) {
    console.error('[auth/me]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
