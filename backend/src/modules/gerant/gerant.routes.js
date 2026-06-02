import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'

// Controllers
import {
  creerClient,
  listerClients,
  detailClient,
  modifierClient
} from './clients.controller.js'

import {
  creerRecharge,
  listerRechargesEnAttente,
  validerRecharge
} from './recharges.controller.js'

import {
  demarrerSession,
  arreterSession,
  listerSessions,
  detailSession
} from './sessions.controller.js'

import {
  rapportJour,
  rapportPeriode
} from './rapport.controller.js'

import { listerCategories } from '../admin/categories.controller.js'
import { listerPostes } from '../admin/postes.controller.js'
import { listerDurees } from '../admin/durees.controller.js'

const router = Router()

// Appliquer middlewares à toutes les routes gérant
router.use(verifyJwt, requireRole('GERANT'))

// ─── CLIENTS ──────────────────────────────────────────────────────────────

// POST /gerant/clients
router.post('/clients', creerClient)

// GET /gerant/clients
router.get('/clients', listerClients)

// GET /gerant/clients/:id
router.get('/clients/:id', detailClient)

// PATCH /gerant/clients/:id
router.patch('/clients/:id', modifierClient)

// ─── RECHARGES ────────────────────────────────────────────────────────────

// POST /gerant/recharges
router.post('/recharges', creerRecharge)

// GET /gerant/recharges/en-attente
router.get('/recharges/en-attente', listerRechargesEnAttente)

// POST /gerant/recharges/:id/valider
router.post('/recharges/:id/valider', validerRecharge)

// ─── SESSIONS ─────────────────────────────────────────────────────────────

// POST /gerant/sessions
router.post('/sessions', demarrerSession)

// GET /gerant/sessions
router.get('/sessions', listerSessions)

// GET /gerant/sessions/:id
router.get('/sessions/:id', detailSession)

// POST /gerant/sessions/:id/arreter
router.post('/sessions/:id/arreter', arreterSession)

// ─── CATALOGUE (lecture seule) ────────────────────────────────────────────

router.get('/categories', listerCategories)
router.get('/categories/:id/durees', listerDurees)
router.get('/postes', listerPostes)

// ─── RAPPORTS ─────────────────────────────────────────────────────────────

// GET /gerant/rapport/jour
router.get('/rapport/jour', rapportJour)

// GET /gerant/rapport/periode
router.get('/rapport/periode', rapportPeriode)

export default router
