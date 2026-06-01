import jwt from 'jsonwebtoken'

/**
 * Vérifie le JWT dans le header Authorization.
 * Injecte req.user = { id, role, salle_id }
 */
export const verifyJwt = (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' })
  }

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Token invalide ou expiré' })
  }
}

/**
 * Vérifie que l'utilisateur a l'un des rôles autorisés.
 * Usage : requireRole('ADMIN') ou requireRole('ADMIN', 'GERANT')
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Non authentifié' })
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé' })
  }
  next()
}
