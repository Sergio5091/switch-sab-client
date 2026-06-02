import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'
import { getRapports } from './rapports.controller.js'

const router = Router()

router.use(verifyJwt, requireRole('ADMIN'))

router.get('/', getRapports)

export default router
