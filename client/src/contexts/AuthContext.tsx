import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { register as apiRegister, login as apiLogin, fetchMe, logout as apiLogout } from '@/lib/api'
import type { ApiUser } from '@/lib/api'

interface AuthContextValue {
  user: ApiUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, sports?: string[], location?: { lat: number; lng: number }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Restaurer la session existante au démarrage
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const u = await fetchMe()
        setUser(u)
      }
      setLoading(false)
    })

    // 2. Écouter les changements d'état auth (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const u = await fetchMe()
          setUser(u)
        }
        if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    await apiLogin(email, password)
    // onAuthStateChange('SIGNED_IN') déclenche le setUser automatiquement
  }

  async function register(
    email: string,
    password: string,
    name: string,
    sports: string[] = [],
    location?: { lat: number; lng: number },
  ) {
    await apiRegister(email, password, name, sports, location)
    // La session Supabase est créée côté serveur — on force un rafraîchissement
    // onAuthStateChange se déclenche si le SDK détecte la session, sinon on fetchMe directement
    const u = await fetchMe()
    if (u) setUser(u)
  }

  function logout() {
    apiLogout() // appelle supabase.auth.signOut() → déclenche SIGNED_OUT
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
