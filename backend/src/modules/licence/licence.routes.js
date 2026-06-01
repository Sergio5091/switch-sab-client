import { Router } from 'express'
import { getStatut, activer } from './licence.controller.js'

const router = Router()

// GET /licence/statut — public (vérifié dans requireLicence)
router.get('/statut', getStatut)

// POST /licence/activer — public (installation d'une nouvelle licence)
router.post('/activer', activer)

export default router
