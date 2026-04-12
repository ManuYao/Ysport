import { useState, useEffect } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'
import MapPage from '@/pages/MapPage'
import OnboardingPage from '@/pages/OnboardingPage'
import LandingPage from '@/pages/LandingPage'

const ONBOARDING_KEY = 'ysport_onboarding_done'

type Screen = 'landing' | 'onboarding' | 'app'

function AppInner() {
  const [screen, setScreen] = useState<Screen>('landing')
  const { user, loading: authLoading } = useAuth()

  // Redirection automatique vers l'app quand l'utilisateur se connecte
  useEffect(() => {
    if (!authLoading && user && screen !== 'app') {
      setScreen('app')
    }
  }, [user?.id, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Accès direct à la map — anonyme ou connecté
  function handleOpenMap() {
    setScreen('app')
  }

  // Inscription explicite — onboarding si première visite, sinon map directe
  function handleSignup() {
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') {
      setScreen('app')
    } else {
      setScreen('onboarding')
    }
  }

  function handleOnboardingDone() {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setScreen('app')
  }

  if (screen === 'landing')    return <LandingPage onStart={handleOpenMap} onSignup={handleSignup} onGoToApp={() => setScreen('app')} />
  if (screen === 'onboarding') return <OnboardingPage onDone={handleOnboardingDone} onGoToLanding={() => setScreen('landing')} />
  return <MapPage onGoToLanding={() => setScreen('landing')} onGoToOnboarding={() => setScreen('onboarding')} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
