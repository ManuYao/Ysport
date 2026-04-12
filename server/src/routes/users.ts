import { Router, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { getLevel } from '../lib/levels'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const POINT_VALUES: Record<string, number> = {
  session:          20,
  sessionWithTimer: 45,
  eventCreated:    120,
  eventJoined:      30,
  presenceOnVenue:  10,
  reviewPosted:     15,
  streakBonus:      50,
}

const REASON_LABELS: Record<string, string> = {
  session:          'Session sportive',
  sessionWithTimer: 'Session avec timer',
  eventCreated:     'Événement organisé',
  eventJoined:      'Événement rejoint',
  presenceOnVenue:  'Présence sur lieu',
  reviewPosted:     'Avis publié',
  streakBonus:      'Bonus streak',
}

const REASON_ICONS: Record<string, string> = {
  session:          '🏃',
  sessionWithTimer: '🔥',
  eventCreated:     '🎯',
  eventJoined:      '🤝',
  presenceOnVenue:  '📍',
  reviewPosted:     '⭐',
  streakBonus:      '🔥',
}

// GET /api/user/profile
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single()

    if (profileError || !profile) {
      res.status(404).json({ error: 'Utilisateur introuvable' })
      return
    }

    const level = getLevel(profile.points)

    // 10 dernières transactions
    const { data: transactions } = await supabaseAdmin
      .from('point_transactions')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Stats globales
    const { data: allTx } = await supabaseAdmin
      .from('point_transactions')
      .select('reason')
      .eq('user_id', req.userId)

    const txList = allTx ?? []
    const sessionCount = txList.filter(t => t.reason === 'session' || t.reason === 'sessionWithTimer').length
    const eventCount   = txList.filter(t => t.reason === 'eventJoined' || t.reason === 'eventCreated').length

    // Activité formatée
    const activity = (transactions ?? []).map(t => ({
      id:     t.id,
      icon:   REASON_ICONS[t.reason] ?? '⚡',
      iconBg: '#C9A84C15',
      title:  t.label ?? REASON_LABELS[t.reason] ?? t.reason,
      sub:    timeAgo(new Date(t.created_at)),
      pts:    t.amount,
    }))

    const badges = computeBadges(profile, txList.length, sessionCount, eventCount)

    res.json({
      user: {
        id:              profile.id,
        name:            profile.name,
        handle:          profile.handle ?? '',
        initial:         profile.initial ?? '',
        level:           level.name,
        levelIcon:       level.icon,
        points:          profile.points,
        nextLevelPoints: level.next,
        sports:          profile.sports ?? [],
      },
      stats: {
        sessions: sessionCount,
        events:   eventCount,
        points:   profile.points,
        badges:   badges.filter((b: { earned: boolean }) => b.earned).length,
      },
      badges,
      activity,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/user/points
router.post('/points', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { reason, spotId, eventId, label } = req.body
    if (!reason || !POINT_VALUES[reason]) {
      res.status(400).json({ error: 'reason invalide' })
      return
    }

    const amount = POINT_VALUES[reason]

    // Récupérer les points actuels
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('points')
      .eq('id', req.userId)
      .single()

    if (profileError || !profile) {
      res.status(404).json({ error: 'Utilisateur introuvable' })
      return
    }

    // Enregistrer la transaction
    await supabaseAdmin.from('point_transactions').insert({
      user_id:  req.userId,
      amount,
      reason,
      spot_id:  spotId ?? null,
      event_id: eventId ?? null,
      label:    label ?? null,
    })

    // Mettre à jour les points
    const newPoints = (profile.points ?? 0) + amount
    await supabaseAdmin
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', req.userId)

    const level = getLevel(newPoints)
    res.json({ points: newPoints, level: level.name, levelIcon: level.icon, earned: amount })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ─── Helpers ──────────────────────────────────────────────
function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(min / 60)
  const d    = Math.floor(h / 24)
  if (d >= 7)  return `Il y a ${Math.floor(d / 7)} sem.`
  if (d >= 1)  return `Il y a ${d}j`
  if (h >= 1)  return `Il y a ${h}h`
  return `Il y a ${min} min`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeBadges(profile: Record<string, any>, txCount: number, sessionCount: number, eventCount: number) {
  const sports: string[] = profile.sports ?? []
  return [
    { id: 'b-org',      icon: '🏆', name: 'Organisateur', earned: eventCount >= 1   },
    { id: 'b-streak',   icon: '🔥', name: '7j de suite',  earned: txCount >= 7      },
    { id: 'b-hiit',     icon: '⚡', name: 'HIIT Master',  earned: sessionCount >= 5  },
    { id: 'b-runner',   icon: '🏃', name: 'Runner',        earned: sports.includes('athletisme') && sessionCount >= 3 },
    { id: 'b-events',   icon: '🎯', name: '10 events',     earned: eventCount >= 10  },
    { id: 'b-elite',    icon: '👑', name: 'Elite',         earned: (profile.points ?? 0) >= 2500 },
    { id: 'b-explorer', icon: '🌍', name: '5 villes',      earned: false             },
  ]
}

export default router
