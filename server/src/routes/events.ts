import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(e: Record<string, any>) {
  return {
    id:               e.id,
    spotId:           e.spot_id,
    name:             e.name,
    type:             e.type,
    sport:            e.sport,
    organizer:        e.organizer_name ?? 'Anonyme',
    participantCount: (e.participants ?? []).length,
    maxParticipants:  e.max_participants,
    scheduledAt:      e.scheduled_at ? formatDate(new Date(e.scheduled_at)) : undefined,
    isLive:           e.is_live,
    description:      e.description,
    isSponsor:        e.is_sponsor,
    sponsorName:      e.sponsor_name,
  }
}

// GET /api/events?spotId=
router.get('/', async (req: Request, res: Response) => {
  try {
    const { spotId } = req.query

    let query = supabaseAdmin
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (spotId) {
      query = query.eq('spot_id', String(spotId))
    }

    const { data, error } = await query
    if (error) {
      res.status(500).json({ error: 'Erreur serveur' })
      return
    }

    res.json((data ?? []).map(mapEvent))
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/events
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { spotId, spotName, name, type, sport, maxParticipants, scheduledAt, description } = req.body
    if (!spotId || !name || !sport) {
      res.status(400).json({ error: 'spotId, name et sport requis' })
      return
    }

    // Récupérer le profil pour le nom de l'organisateur
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('name, points')
      .eq('id', req.userId)
      .single()

    if (profileError || !profile) {
      res.status(404).json({ error: 'Utilisateur introuvable' })
      return
    }

    // Créer l'événement
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .insert({
        spot_id:         spotId,
        spot_name:       spotName ?? null,
        name,
        type:            type ?? 'manual',
        sport,
        organizer_id:    req.userId,
        organizer_name:  profile.name,
        participants:    [req.userId],
        max_participants: maxParticipants ?? null,
        scheduled_at:    scheduledAt ? new Date(scheduledAt).toISOString() : null,
        is_live:         false,
        description:     description ?? null,
      })
      .select()
      .single()

    if (eventError || !event) {
      res.status(500).json({ error: 'Erreur création événement' })
      return
    }

    // Points pour avoir créé un event
    await supabaseAdmin.from('point_transactions').insert({
      user_id:  req.userId,
      amount:   120,
      reason:   'eventCreated',
      event_id: event.id,
      label:    name,
    })
    await supabaseAdmin
      .from('profiles')
      .update({ points: (profile.points ?? 0) + 120 })
      .eq('id', req.userId)

    res.status(201).json(mapEvent(event))
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/events/:id/join
router.post('/:id/join', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('participants')
      .eq('id', req.params.id)
      .single()

    if (eventError || !event) {
      res.status(404).json({ error: 'Événement introuvable' })
      return
    }

    const participants: string[] = event.participants ?? []
    if (participants.includes(req.userId!)) {
      res.status(409).json({ error: 'Déjà inscrit' })
      return
    }

    await supabaseAdmin
      .from('events')
      .update({ participants: [...participants, req.userId] })
      .eq('id', req.params.id)

    // Points pour avoir rejoint un event
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('points')
      .eq('id', req.userId)
      .single()

    await supabaseAdmin.from('point_transactions').insert({
      user_id:  req.userId,
      amount:   30,
      reason:   'eventJoined',
      event_id: req.params.id,
    })
    await supabaseAdmin
      .from('profiles')
      .update({ points: ((profile?.points ?? 0) + 30) })
      .eq('id', req.userId)

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

function formatDate(d: Date): string {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const h    = d.getHours()
  const m    = d.getMinutes()
  return `${days[d.getDay()]} ${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`
}

export default router
