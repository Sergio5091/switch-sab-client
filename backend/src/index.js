import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import corsOptions from './config/cors.js'
import { checkLicenceAtStartup, requireLicence } from './middlewares/licence.middleware.js'

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

// Vérification licence au démarrage
await checkLicenceAtStartup()

// Middleware licence sur toutes les routes (sauf /auth/login, /licence/*)
app.use(requireLicence)

// ─── Routes ───────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Switch SAB App — API opérationnelle ✅' })
})

app.use('/api/auth',     authRoutes)
app.use('/api/admin',    adminRoutes)
app.use('/api/gerant',   gerantRoutes)
app.use('/api/client',   clientRoutes)
app.use('/api/rapports', rapportsRoutes)
app.use('/api/licence',  licenceRoutes)
app.use('/api/setup',    setupRoutes)

export default app