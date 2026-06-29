import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import corsOptions from './config/cors.js'
import { checkLicenceAtStartup, requireLicence } from './middlewares/licence.middleware.js'
import prisma from './services/prismaClient.js'
import logger from './config/logger.js'
import { initSessionScheduler } from './services/sessionScheduler.js'
import { demarrerSchedulerRapport } from './services/rapportScheduler.js'
import { verifierSMTP } from './services/mailService.js'

// Routes
import authRoutes     from './modules/auth/auth.routes.js'
import adminRoutes    from './modules/admin/admin.routes.js'
import gerantRoutes   from './modules/gerant/gerant.routes.js'
import clientRoutes   from './modules/client/client.routes.js'
import rapportsRoutes from './modules/rapports/rapports.routes.js'
import licenceRoutes  from './modules/licence/licence.routes.js'
import setupRoutes    from './modules/setup/setup.routes.js'

dotenv.config()

const app = express()

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Nettoyage au démarrage ───────────────────────────────────────────────────
// Si le serveur redémarre avec des sessions ACTIVE en base, on les marque ARRETEE
// et on libère les postes correspondants
async function cleanupSessionsAuDemarrage() {
  try {
    // Sessions normales bloquées
    const sessionsBloquees = await prisma.session.findMany({
      where: { statut: 'ACTIVE' },
      include: { poste: true }
    })
    if (sessionsBloquees.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const s of sessionsBloquees) {
          await tx.session.update({ where: { id: s.id }, data: { statut: 'ARRETEE', fin: new Date() } })
          await tx.poste.update({ where: { id: s.poste.id }, data: { statut: 'LIBRE' } })
        }
      })
      logger.warn(`[startup] ${sessionsBloquees.length} session(s) bloquée(s) nettoyée(s)`)
    }

    // Sessions coupon bloquées
    if (prisma.sessionAnonymeCoupon) {
      const couponBloquees = await prisma.sessionAnonymeCoupon.findMany({
        where: { statut: 'ACTIVE' },
        include: { poste: true }
      })
      if (couponBloquees.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const s of couponBloquees) {
            await tx.sessionAnonymeCoupon.update({ where: { id: s.id }, data: { statut: 'ARRETEE', fin: new Date() } })
            await tx.poste.update({ where: { id: s.poste.id }, data: { statut: 'LIBRE' } })
          }
        })
        logger.warn(`[startup] ${couponBloquees.length} session(s) coupon bloquée(s) nettoyée(s)`)
      }
    }
  } catch (err) {
    logger.error('[startup cleanup]', err.message)
  }
}

// Vérification licence au démarrage
await checkLicenceAtStartup()

// Nettoyage sessions bloquées
await cleanupSessionsAuDemarrage()

// Reprise des timers de session (fin automatique)
await initSessionScheduler()

// Scheduler rapport journalier (envoi mail veille chaque matin)
demarrerSchedulerRapport()

// Vérification SMTP (non bloquante)
verifierSMTP()

// Middleware licence sur toutes les routes (sauf /auth/login, /licence/*)
app.use(requireLicence)

// ─── Routes ───────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Switch SAB App — API opérationnelle ✅' })
})

// ─── Route de debug (dev uniquement) ──────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/debug/reset-sessions', async (req, res) => {
    try {
      const sessions = await prisma.session.findMany({ where: { statut: 'ACTIVE' }, include: { poste: true } })
      const coupons = prisma.sessionAnonymeCoupon
        ? await prisma.sessionAnonymeCoupon.findMany({ where: { statut: 'ACTIVE' }, include: { poste: true } })
        : []

      await prisma.$transaction(async (tx) => {
        for (const s of sessions) {
          await tx.session.update({ where: { id: s.id }, data: { statut: 'ARRETEE', fin: new Date() } })
          await tx.poste.update({ where: { id: s.poste.id }, data: { statut: 'LIBRE' } })
        }
        for (const s of coupons) {
          await tx.sessionAnonymeCoupon.update({ where: { id: s.id }, data: { statut: 'ARRETEE', fin: new Date() } })
          await tx.poste.update({ where: { id: s.poste.id }, data: { statut: 'LIBRE' } })
        }
      })

      return res.json({
        message: 'Sessions nettoyées',
        sessionsNormales: sessions.length,
        sessionsCoupon: coupons.length,
      })
    } catch (err) {
      return res.status(500).json({ message: err.message })
    }
  })
}

app.use('/api/auth',     authRoutes)
app.use('/api/admin',    adminRoutes)
app.use('/api/gerant',   gerantRoutes)
app.use('/api/client',   clientRoutes)
app.use('/api/rapports', rapportsRoutes)
app.use('/api/licence',  licenceRoutes)
app.use('/api/setup',    setupRoutes)

export default app