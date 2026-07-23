import { Router } from 'express'
import { getStatus, scanReseaux, connecter } from './network.controller.js'

const router = Router()

// Ces routes sont intentionnellement publiques (pas de verifyJwt) :
// le provisioning réseau doit fonctionner avant toute authentification,
// et indépendamment de la licence et de la base de données.
router.get('/status',  getStatus)
router.get('/scan',    scanReseaux)
router.post('/connect', connecter)

export default router
