import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'

const router = Router()

router.use(verifyJwt, requireRole('CLIENT'))

// TODO Phase 4 — recharges, coupons, sessions, bonus, promo

export default router
