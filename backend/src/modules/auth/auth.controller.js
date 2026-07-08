import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../services/prismaClient.js'
import { normaliserOuEchouer } from '../../services/phoneService.js'

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
// Body : { identifiant: "pseudo ou email", motDePasse: "..." }

export const login = async (req, res) => {
  const { identifiant, motDePasse } = req.body

  if (!identifiant || !motDePasse) {
    return res.status(400).json({ message: 'Identifiant (pseudo ou email) et mot de passe requis' })
  }

  try {
    const estEmail = identifiant.includes('@')

    const user = await prisma.user.findFirst({
      where: estEmail
        ? { email: identifiant }
        : { pseudo: identifiant },
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
    const pseudoExistant = await prisma.user.findUnique({ where: { pseudo } })
    if (pseudoExistant) {
      return res.status(409).json({ message: 'Ce pseudo est déjà utilisé' })
    }

    // Récupérer la salle pour l'indicatif pays
    const salle = await prisma.salle.findFirst()

    // Normaliser le téléphone au format E.164
    let telephoneNormalise = telephone
    try {
      telephoneNormalise = normaliserOuEchouer(telephone, salle?.indicatifPays ?? 'BJ')
    } catch (phoneErr) {
      return res.status(400).json({ message: phoneErr.message })
    }

    const telExistant = await prisma.user.findUnique({ where: { telephone: telephoneNormalise } })
    if (telExistant) {
      return res.status(409).json({ message: 'Ce numéro de téléphone est déjà utilisé' })
    }

    const hash = await bcrypt.hash(motDePasse, 10)

    // Contexte mono-salle : rattacher automatiquement à la salle existante
    const user = await prisma.user.create({
      data: { pseudo, telephone: telephoneNormalise, motDePasse: hash, role: 'CLIENT', salleId: salle?.id ?? null },
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
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })

    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })
    if (!user.active) return res.status(403).json({ message: 'Compte désactivé' })

    return res.json({ user: userPublic(user) })
  } catch (err) {
    console.error('[auth/me]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
