import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'
import { getHome } from './client.controller.js'

const router = Router()

router.use(verifyJwt, requireRole('CLIENT'))

router.get('/home', getHome)

export default router
