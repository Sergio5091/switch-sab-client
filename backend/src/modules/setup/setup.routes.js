import { Router } from 'express'
import { getStatut, creerSalle } from './setup.controller.js'

const router = Router()

// Routes publiques — exemptées du middleware requireLicence dans index.js
router.get('/statut', getStatut)
router.post('/salle', creerSalle)

export default router
