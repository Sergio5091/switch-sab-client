import { Router } from 'express'
import { verifyJwt, requireRole } from '../../middlewares/auth.middleware.js'

import { creerCategorie, listerCategories, modifierCategorie, supprimerCategorie } from './categories.controller.js'
import { creerDuree, listerDurees, modifierDuree, supprimerDuree } from './durees.controller.js'
import { creerPoste, listerPostes, modifierPoste, supprimerPoste } from './postes.controller.js'
import { creerGerant, listerGerants, modifierGerant } from './gerants.controller.js'
import { creerConfigBonus, getConfigBonus, modifierConfigBonus } from './bonus.controller.js'
import { getPromoConfig, modifierPromoConfig } from './promoConfig.controller.js'
import { genererCoupons, listerCoupons, exportCouponsPdf } from './coupons.controller.js'
import { creerPromotion, listerPromotions, envoyerPromotion } from './promotions.controller.js'

const router = Router()

// Toutes les routes admin nécessitent JWT + rôle ADMIN
router.use(verifyJwt, requireRole('ADMIN'))

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

export default router
