import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'
import { getHome, getSessions, getLeaderboard, utiliserCoupon, startSession, stopSession, acheterCredit } from './client.controller.js'
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
router.post('/coupon', utiliserCoupon)
router.post('/acheter-credit', acheterCredit)

export default router
