import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'

import { creerClient, listerClients, detailClient, modifierClient } from './clients.controller.js'
import { creerRecharge, listerRechargesEnAttente, listerHistoriqueRecharges, validerRecharge, appliquerCouponGerant } from './recharges.controller.js'
import { demarrerSession, arreterSession, listerSessions, detailSession, prolongerSession } from './sessions.controller.js'
import { rapportJour, rapportPeriode } from './rapport.controller.js'
import { listerCategories } from '../admin/categories.controller.js'
import { listerPostesGerant } from '../admin/postes.controller.js'
import { listerDurees } from '../admin/durees.controller.js'
import { genererCoupons, listerCoupons } from '../admin/coupons.controller.js'
import { appairerPrise } from '../admin/zigbee.controller.js'

const router = Router()

router.use(verifyJwt, requireRole('GERANT'))

// ─── CLIENTS ──────────────────────────────────────────────────────────────
router.post('/clients',       creerClient)
router.get('/clients',        listerClients)
router.get('/clients/:id',    detailClient)
router.patch('/clients/:id',  modifierClient)

// ─── RECHARGES ────────────────────────────────────────────────────────────
router.post('/recharges',              creerRecharge)
router.get('/recharges',               listerHistoriqueRecharges)
router.get('/recharges/en-attente',    listerRechargesEnAttente)
router.post('/recharges/coupon',       appliquerCouponGerant)        // ← avant /:id
router.post('/recharges/:id/valider',  validerRecharge)

// ─── SESSIONS ─────────────────────────────────────────────────────────────
router.post('/sessions',               demarrerSession)
router.get('/sessions',                listerSessions)
router.get('/sessions/:id',            detailSession)
router.post('/sessions/:id/arreter',   arreterSession)
router.post('/sessions/:id/prolonger', prolongerSession)

// ─── CATALOGUE (lecture seule) ────────────────────────────────────────────
router.get('/categories',              listerCategories)
router.get('/categories/:id/durees',   listerDurees)
router.get('/postes',                  listerPostesGerant)

// ─── ZIGBEE — réappairage (postes déjà appairés uniquement) ──────────────
// Le garde-fou dans appairerPrise vérifie que req.user.role === 'GERANT'
// ne peut réappairer qu'un poste ayant déjà un zigbeeName.
router.post('/zigbee/appairer/:posteId', appairerPrise)

// ─── COUPONS (génération + lecture seule, pas de modif/suppression) ───────
router.post('/coupons/generer',  genererCoupons)
router.get('/coupons',           listerCoupons)

// ─── RAPPORTS ─────────────────────────────────────────────────────────────
router.get('/rapport/jour',     rapportJour)
router.get('/rapport/periode',  rapportPeriode)

export default router
