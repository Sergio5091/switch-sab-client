import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import corsOptions from './config/cors.js'
import authRoutes from './routes/auth.js'

dotenv.config()

const app = express()

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.json({ message: 'Switch SAB Local — API opérationnelle ✅' })
})

app.use('/auth', authRoutes)

// Routes à venir
// app.use('/categories', categoriesRoutes)
// app.use('/postes', postesRoutes)
// app.use('/sessions', sessionsRoutes)
// app.use('/credits', creditsRoutes)
// app.use('/users', usersRoutes)
// app.use('/rapports', rapportsRoutes)
// app.use('/coupons', couponsRoutes)
// app.use('/bonus', bonusRoutes)
// app.use('/promos', promosRoutes)
// app.use('/salle', salleRoutes)

export default app
