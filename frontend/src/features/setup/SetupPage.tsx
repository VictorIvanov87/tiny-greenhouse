import { Navigate, useNavigate } from 'react-router-dom'
import { Card } from 'flowbite-react'
import { alpha, palette } from '../../theme/palette'
import { useAuth } from '../auth/hooks/useAuth'
import { SetupWizard } from './components/SetupWizard'
import { useUserProfile } from './hooks/useUserProfile'
import { defaultWizardData } from './state'

const SetupPage = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading, refresh } = useUserProfile(user ? user.uid : null)

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-night)] text-[color:var(--color-sage)]">
        <span className="text-sm opacity-80">Loading setup wizard...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profile?.setupCompleted) {
    return <Navigate to="/dashboard" replace />
  }

  const initialData = {
    language: profile?.language ?? defaultWizardData.language,
    plantType: profile?.plantType ?? defaultWizardData.plantType,
    notifications: {
      email: profile?.notifications?.email ?? defaultWizardData.notifications.email,
      push: profile?.notifications?.push ?? defaultWizardData.notifications.push,
    },
  }

  const backgroundStyle = [
    `radial-gradient(circle at 12% 18%, ${alpha(palette.sunlight, 0.2)} 0%, transparent 55%)`,
    `radial-gradient(circle at 80% 8%, ${alpha(palette.moss, 0.18)} 0%, transparent 60%)`,
    `linear-gradient(135deg, ${palette.night} 0%, ${alpha(palette.soil, 0.5)} 65%, ${palette.soil} 100%)`,
  ].join(', ')

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-10"
      style={{ background: backgroundStyle }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div
          className="absolute -left-20 top-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: alpha(palette.evergreen, 0.2) }}
        />
        <div
          className="absolute bottom-10 right-0 h-64 w-64 rounded-full blur-3xl"
          style={{ background: alpha(palette.sunlight, 0.25) }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 text-center text-[color:var(--color-sage)]">
        <Card className="w-full rounded-3xl border border-white/20 bg-white/10 text-left shadow-[0_28px_80px_rgba(8,16,12,0.28)] backdrop-blur">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              First-time setup
            </span>
            <h1 className="text-3xl font-semibold text-[color:var(--color-evergreen)] sm:text-4xl">
              Let’s tune Tiny Greenhouse for your crops
            </h1>
            <p className="text-sm text-[color:var(--color-soil-60)] sm:text-base">
              We’ll ask a few quick questions to shape insights and alerts around your greenhouse goals.
            </p>
          </div>
        </Card>

        <SetupWizard
          uid={user.uid}
          initialData={initialData}
          onCompleted={() => {
            refresh()
            navigate('/dashboard', { replace: true })
          }}
        />
      </div>
    </div>
  )
}

export default SetupPage
