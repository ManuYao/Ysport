import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes   from './routes/auth'
import spotsRoutes  from './routes/spots'
import eventsRoutes from './routes/events'
import usersRoutes  from './routes/users'

const app  = express()
const PORT = process.env.PORT ?? 3001

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

app.use(cors({ origin: ALLOWED_ORIGINS }))
app.use(express.json())

app.use('/api/auth',   authRoutes)
app.use('/api/spots',  spotsRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/user',   usersRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

app.listen(PORT, () => console.log(`🚀 API YSport → http://localhost:${PORT}`))
