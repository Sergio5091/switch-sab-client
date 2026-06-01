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

app.use('/auth',     authRoutes)
app.use('/admin',    adminRoutes)
app.use('/gerant',   gerantRoutes)
app.use('/client',   clientRoutes)
app.use('/rapports', rapportsRoutes)
app.use('/licence',  licenceRoutes)

export default app
