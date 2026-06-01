import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'

const router = Router()

router.use(verifyJwt, requireRole('ADMIN'))

// TODO Phase 2 — catégories, durées, postes, gérants, bonus, coupons, promotions

export default router
