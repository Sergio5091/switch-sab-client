import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'

const router = Router()

router.use(verifyJwt, requireRole('ADMIN'))

// TODO Phase 5 — rapports avec filtres + export

export default router
