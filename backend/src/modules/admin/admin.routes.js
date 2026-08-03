import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'

import { getDashboardStats } from './dashboard.controller.js'
import { getSalle, modifierSalle } from './salle.controller.js'
import { creerCategorie, listerCategories, modifierCategorie, supprimerCategorie } from './categories.controller.js'
import { creerDuree, listerDurees, modifierDuree, supprimerDuree } from './durees.controller.js'
import { creerPoste, listerPostes, modifierPoste, supprimerPoste } from './postes.controller.js'
import { creerGerant, listerGerants, modifierGerant } from './gerants.controller.js'
import { creerConfigBonus, getConfigBonus, modifierConfigBonus } from './bonus.controller.js'
import { getPromoConfig, modifierPromoConfig } from './promoConfig.controller.js'
import { genererCoupons, listerCoupons, exportCouponsPdf } from './coupons.controller.js'
import { creerPromotion, listerPromotions, envoyerPromotion, exportContacts, exportNouveauxContacts, statutContacts } from './promotions.controller.js'
import { appairerPrise, desappairerPrise, identifierPrise, verrouillerPrise, deverrouillerPrise, statutPrise } from './zigbee.controller.js'
import { detecter, configurer, statut as statutUsb, tester, associerRelais } from './usb.controller.js'

const router = Router()

// Toutes les routes admin nécessitent JWT + rôle ADMIN
router.use(verifyJwt, requireRole('ADMIN'))

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboardStats)

// ─── Salle (config switch + infos) ───────────────────────────────────────────
router.get  ('/salle', getSalle)
router.patch('/salle', modifierSalle)

// ─── Catégories ───────────────────────────────────────────────────────────────
router.post  ('/categories',     creerCategorie)
router.get   ('/categories',     listerCategories)
router.patch ('/categories/:id', modifierCategorie)
router.delete('/categories/:id', supprimerCategorie)

// ─── Durées ───────────────────────────────────────────────────────────────────
router.post  ('/categories/:id/durees', creerDuree)
router.get   ('/categories/:id/durees', listerDurees)
router.patch ('/durees/:id',            modifierDuree)
router.delete('/durees/:id',            supprimerDuree)

// ─── Postes ───────────────────────────────────────────────────────────────────
router.post  ('/postes',     creerPoste)
router.get   ('/postes',     listerPostes)
router.patch ('/postes/:id', modifierPoste)
router.delete('/postes/:id', supprimerPoste)

// ─── Gérants ──────────────────────────────────────────────────────────────────
router.post  ('/gerants',     creerGerant)
router.get   ('/gerants',     listerGerants)
router.patch ('/gerants/:id', modifierGerant)

// ─── Config Bonus ─────────────────────────────────────────────────────────────
router.post  ('/bonus/config', creerConfigBonus)
router.get   ('/bonus/config', getConfigBonus)
router.patch ('/bonus/config', modifierConfigBonus)

// ─── Config Promo ─────────────────────────────────────────────────────────────
router.get   ('/promo/config', getPromoConfig)
router.patch ('/promo/config', modifierPromoConfig)

// ─── Coupons ──────────────────────────────────────────────────────────────────
router.post('/coupons/generer', genererCoupons)
router.get ('/coupons',         listerCoupons)
router.get ('/coupons/pdf',     exportCouponsPdf)

// ─── Promotions ───────────────────────────────────────────────────────────────
router.post('/promotions',              creerPromotion)
router.get ('/promotions',              listerPromotions)
router.post('/promotions/:id/envoyer',  envoyerPromotion)

// ─── Contacts (export VCF WhatsApp) ───────────────────────────────────────────
router.get('/contacts/statut',          statutContacts)
router.get('/contacts/export',          exportContacts)
router.get('/contacts/export/nouveaux', exportNouveauxContacts)

// ─── Zigbee — appairage des prises ───────────────────────────────────────────
router.get   ('/zigbee/statut/:posteId',        statutPrise)
router.post  ('/zigbee/appairer/:posteId',      appairerPrise)
router.delete('/zigbee/desappairer/:posteId',   desappairerPrise)
router.post  ('/zigbee/identifier/:posteId',    identifierPrise)
router.post  ('/zigbee/verrouiller/:posteId',   verrouillerPrise)
router.post  ('/zigbee/deverrouiller/:posteId', deverrouillerPrise)

// ─── USB — switch série multi-relais ─────────────────────────────────────────
router.get   ('/usb/detecter',              detecter)
router.post  ('/usb/configurer',            configurer)
router.get   ('/usb/statut',                statutUsb)
router.post  ('/usb/tester/:relais',        tester)
router.patch ('/usb/poste/:posteId',        associerRelais)

export default router
