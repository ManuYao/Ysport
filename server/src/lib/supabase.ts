import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('⚠️  SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans server/.env')
}

export const supabaseAdmin = createClient(url ?? '', key ?? '', {
  auth: { autoRefreshToken: false, persistSession: false },
})
