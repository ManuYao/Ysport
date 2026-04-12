import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { getLevel } from '../lib/levels'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// ─── GET /api/spots/:id/reviews ───────────────────────────
router.get('/:id/reviews', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('spot_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      res.status(500).json({ error: 'Erreur serveur' })
      return
    }

    // Remappe les champs snake_case → camelCase pour le client
    const mapped = (data ?? []).map(r => ({
      id:          r.id,
      userId:      r.user_id,
      userName:    r.user_name,
      userInitial: r.user_initial,
      userLevel:   r.user_level,
      rating:      r.rating,
      text:        r.text,
      sport:       r.sport,
      createdAt:   r.created_at,
    }))

    res.json(mapped)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ─── POST /api/spots/:id/reviews ──────────────────────────
router.post('/:id/reviews', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, text, sport } = req.body
    if (!rating || !text) {
      res.status(400).json({ error: 'rating et text requis' })
      return
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('name, initial, points')
      .eq('id', req.userId)
      .single()

    if (profileError || !profile) {
      res.status(404).json({ error: 'Utilisateur introuvable' })
      return
    }

    const level = getLevel(profile.points ?? 0)
    const levelLabel = `${level.icon} ${level.name}`

    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .insert({
        spot_id:      req.params.id,
        user_id:      req.userId,
        user_name:    profile.name,
        user_initial: profile.initial ?? '',
        user_level:   levelLabel,
        rating,
        text,
        sport:        sport ?? null,
      })
      .select()
      .single()

    if (reviewError || !review) {
      res.status(500).json({ error: 'Erreur création avis' })
      return
    }

    res.status(201).json({
      id:          review.id,
      userId:      review.user_id,
      userName:    review.user_name,
      userInitial: review.user_initial,
      userLevel:   review.user_level,
      rating:      review.rating,
      text:        review.text,
      sport:       review.sport,
      createdAt:   review.created_at,
    })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
