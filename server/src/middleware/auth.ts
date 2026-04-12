import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'

export interface AuthRequest extends Request {
  userId?: string
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Non authentifié' })
    return
  }
  const token = header.slice(7)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ error: 'Token invalide' })
    return
  }
  req.userId = user.id
  next()
}
