import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabase'
import { getLevel } from '../lib/levels'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// Client anon pour les opérations de connexion (signInWithPassword nécessite le rôle anon)
const supabaseAnon = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_ANON_KEY ?? '',
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeUser(profile: Record<string, any>) {
  const level = getLevel(profile.points ?? 0)
  return {
    id:              profile.id,
    name:            profile.name,
    handle:          profile.handle ?? '',
    initial:         profile.initial ?? '',
    email:           profile.email ?? '',
    points:          profile.points ?? 0,
    sports:          profile.sports ?? [],
    badges:          profile.badges ?? [],
    level:           level.name,
    levelIcon:       level.icon,
    nextLevelPoints: level.next,
  }
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, sports = [], location } = req.body
    if (!email || !password || !name) {
      res.status(400).json({ error: 'email, password et name sont requis' })
      return
    }

    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError || !authData.user) {
      if (authError?.message?.toLowerCase().includes('already')) {
        res.status(409).json({ error: 'Email déjà utilisé' })
      } else {
        res.status(500).json({ error: authError?.message ?? 'Erreur création compte' })
      }
      return
    }

    const userId = authData.user.id

    // 2. Créer le profil
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id:           userId,
      name,
      sports,
      location_lat: location?.lat ?? null,
      location_lng: location?.lng ?? null,
    })
    if (profileError) {
      // Rollback : supprimer l'utilisateur créé
      await supabaseAdmin.auth.admin.deleteUser(userId)
      res.status(500).json({ error: 'Erreur création profil' })
      return
    }

    // 3. Connecter pour obtenir un access_token valide côté client
    const { data: sessionData, error: sessionError } = await supabaseAnon.auth.signInWithPassword({ email, password })
    if (sessionError || !sessionData.session) {
      res.status(500).json({ error: 'Compte créé mais connexion impossible' })
      return
    }

    // 4. Récupérer le profil créé
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    res.status(201).json({
      token: sessionData.session.access_token,
      user:  safeUser({ ...profile, email }),
    })
  } catch (err) {
    console.error('register error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single()

    if (error || !profile) {
      res.status(404).json({ error: 'Utilisateur introuvable' })
      return
    }

    // Récupérer l'email depuis auth.users
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(req.userId!)
    const email = authUser?.user?.email ?? ''

    res.json({ user: safeUser({ ...profile, email }) })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
