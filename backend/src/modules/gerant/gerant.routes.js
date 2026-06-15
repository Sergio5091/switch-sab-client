import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'

import { creerClient, listerClients, detailClient, modifierClient } from './clients.controller.js'
import { creerRecharge, listerRechargesEnAttente, listerHistoriqueRecharges, validerRecharge, appliquerCouponGerant } from './recharges.controller.js'
import { demarrerSession, arreterSession, listerSessions, detailSession, prolongerSession } from './sessions.controller.js'
import { demarrerSessionCoupon, arreterSessionCoupon, getSoldeCoupon } from './sessionCoupon.controller.js'
import { rapportJour, rapportPeriode } from './rapport.controller.js'
import { listerCategories } from '../admin/categories.controller.js'
import { listerPostes } from '../admin/postes.controller.js'
import { listerDurees } from '../admin/durees.controller.js'
import { genererCoupons, listerCoupons } from './coupons.controller.js'

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

// ─── SESSIONS ANONYMES (coupon sans compte) — AVANT /:id ──────────────────
router.get('/sessions/coupon/solde',        getSoldeCoupon)
router.post('/sessions/coupon',             demarrerSessionCoupon)
router.post('/sessions/coupon/:id/arreter', arreterSessionCoupon)

// ─── SESSIONS ─────────────────────────────────────────────────────────────
router.post('/sessions',               demarrerSession)
router.get('/sessions',                listerSessions)
router.get('/sessions/:id',            detailSession)
router.post('/sessions/:id/arreter',   arreterSession)
router.post('/sessions/:id/prolonger', prolongerSession)

// ─── CATALOGUE (lecture seule) ────────────────────────────────────────────
router.get('/categories',              listerCategories)
router.get('/categories/:id/durees',   listerDurees)
router.get('/postes',                  listerPostes)

// ─── COUPONS (génération + lecture seule, pas de modif/suppression) ───────
router.post('/coupons/generer',  genererCoupons)
router.get('/coupons',           listerCoupons)

// ─── RAPPORTS ─────────────────────────────────────────────────────────────
router.get('/rapport/jour',     rapportJour)
router.get('/rapport/periode',  rapportPeriode)

export default router
