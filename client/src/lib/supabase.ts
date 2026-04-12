import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  console.warn('⚠️  Supabase non configuré — ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans client/.env.local')
}

export const supabase = createClient(
  url  ?? 'https://placeholder.supabase.co',
  key  ?? 'placeholder-key',
)
