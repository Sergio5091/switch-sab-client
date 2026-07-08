import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'
<<<<<<< HEAD
import { getHome, getSessions, getLeaderboard, utiliserCoupon, startSession, stopSession, acheterCredit } from './client.controller.js'
=======
import { getHome, getSessions, getLeaderboard, utiliserCoupon, startSession, stopSession, getCategorieSession, prolongerSession, reprendreSession } from './client.controller.js'
>>>>>>> origin/dev/ok
import { listerCategories } from '../admin/categories.controller.js'
import { listerDurees } from '../admin/durees.controller.js'

const router = Router()
router.use(verifyJwt, requireRole('CLIENT'))

router.get('/home', getHome)
router.get('/sessions', getSessions)
router.get('/leaderboard', getLeaderboard)
router.get('/categories', listerCategories)
router.get('/categories/:id/durees', listerDurees)
router.post('/session/start', startSession)
router.post('/session/:id/stop', stopSession)
router.post('/session/:id/reprendre', reprendreSession)
router.get ('/session/:id/categorie', getCategorieSession)
router.post('/session/:id/prolonger', prolongerSession)
router.post('/coupon', utiliserCoupon)
router.post('/acheter-credit', acheterCredit)

export default router
