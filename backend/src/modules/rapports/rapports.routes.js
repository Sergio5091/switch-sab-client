import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'
import { getRapports, envoyerRapportEmail } from './rapports.controller.js'

const router = Router()

router.use(verifyJwt, requireRole('ADMIN'))

router.get('/', getRapports)
router.post('/envoyer-email', envoyerRapportEmail)

export default router
