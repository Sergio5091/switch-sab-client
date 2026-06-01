import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'

const router = Router()

router.use(verifyJwt, requireRole('GERANT'))

// TODO Phase 3 — clients, recharges, sessions, rapport-jour

export default router
