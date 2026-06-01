import { Router } from 'express'
import { login, register, me } from './auth.controller.js'
import { verifyJwt } from '../../middlewares/auth.middleware.js'

const router = Router()

// POST /auth/login
router.post('/login', login)

// POST /auth/register
router.post('/register', register)

// GET /auth/me
router.get('/me', verifyJwt, me)

export default router
