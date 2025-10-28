import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Label, TextInput } from 'flowbite-react'
import { Flip } from '../../../shared/ui/Flip'
import { useAuth } from '../AuthProvider'
import { alpha, palette } from '../../../theme/palette'

type CardFace = 'signIn' | 'signUp'

export function AuthCard() {
  const [face, setFace] = useState<CardFace>('signIn')
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const isFlipped = face === 'signUp'

  const handleSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    signIn()
    navigate('/', { replace: true })
  }

  const handleSignUp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  const front = (
    <Card className="relative h-full min-h-[34rem] overflow-hidden rounded-[32px] border border-[rgba(31,111,74,0.16)] bg-[linear-gradient(145deg,rgba(248,252,248,0.98),rgba(239,250,243,0.96))] text-[color:var(--color-soil)] shadow-[0_34px_90px_rgba(9,22,16,0.28)] backdrop-blur">
      <div
        className="pointer-events-none absolute -right-24 -top-16 h-56 w-56 rounded-full blur-3xl"
        style={{ background: alpha(palette.sunlight, 0.22) }}
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-10 h-40 w-40 rounded-full blur-2xl"
        style={{ background: alpha(palette.moss, 0.18) }}
      />

      <div className="relative space-y-8">
        <div className="space-y-3 text-center">
          <span
            className="inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{
              background: alpha(palette.moss, 0.15),
              color: palette.evergreen,
            }}
          >
            Sign In
          </span>
          <h2 className="text-2xl font-semibold text-[color:var(--color-soil)]">Welcome back</h2>
          <p className="text-sm text-[color:var(--color-soil-70)]">
            Pick up where you left off and check on your greenhouse conditions.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSignIn}>
          <div className="space-y-2">
            <Label htmlFor="signin-email" className="text-[color:var(--color-soil)] font-medium">
              Email
            </Label>
            <TextInput
              id="signin-email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="!border-[rgba(31,111,74,0.22)] !bg-white !text-[color:var(--color-soil)] !placeholder:text-[color:var(--color-soil-60)] focus:!border-[rgba(31,111,74,0.6)] focus:!ring-[rgba(31,111,74,0.28)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signin-password" className="text-[color:var(--color-soil)] font-medium">
              Password
            </Label>
            <TextInput
              id="signin-password"
              type="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="!border-[rgba(31,111,74,0.22)] !bg-white !text-[color:var(--color-soil)] !placeholder:text-[color:var(--color-soil-60)] focus:!border-[rgba(31,111,74,0.6)] focus:!ring-[rgba(31,111,74,0.28)]"
            />
          </div>

          <Button
            type="submit"
            color="light"
            className="w-full !border-none !text-white !shadow-[0_20px_48px_rgba(31,111,74,0.32)] !transition !duration-200 hover:!-translate-y-0.5 hover:!shadow-[0_26px_60px_rgba(31,111,74,0.4)] hover:!bg-[color:var(--color-evergreen-dark)] focus-visible:!ring-4 focus-visible:!ring-[rgba(79,160,113,0.35)] focus-visible:!outline-none"
            style={{
              backgroundColor: palette.evergreen,
            }}
          >
            Sign in and continue
          </Button>
        </form>

        <div className="mt-10 space-y-4">
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[color:var(--color-soil-60)]">
            <span className="h-px flex-1 bg-[rgba(31,111,74,0.12)]" />
            Looking to join?
            <span className="h-px flex-1 bg-[rgba(31,111,74,0.12)]" />
          </div>
          <button
            type="button"
            className="w-full rounded-xl border border-[rgba(31,111,74,0.25)] px-4 py-2 text-sm font-semibold text-[color:var(--color-evergreen)] transition hover:-translate-y-0.5 hover:border-[rgba(31,111,74,0.4)] hover:bg-[rgba(79,160,113,0.08)]"
            onClick={() => setFace('signUp')}
          >
            Create an account
          </button>
        </div>
      </div>
    </Card>
  )

  const back = (
    <Card className="relative h-full min-h-[34rem] overflow-hidden rounded-[32px] border border-[rgba(31,111,74,0.16)] bg-[linear-gradient(145deg,rgba(239,250,243,0.98),rgba(255,255,255,0.95))] text-[color:var(--color-soil)] shadow-[0_34px_90px_rgba(9,22,16,0.28)] backdrop-blur">
      <div
        className="pointer-events-none absolute -left-20 top-16 h-52 w-52 rounded-full blur-3xl"
        style={{ background: alpha(palette.moss, 0.16) }}
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-8 h-48 w-48 rounded-full blur-3xl"
        style={{ background: alpha(palette.sunlight, 0.22) }}
      />

      <div className="relative space-y-8">
        <div className="space-y-3 text-center">
          <span
            className="inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{
              background: alpha(palette.evergreen, 0.1),
              color: palette.evergreen,
            }}
          >
            Sign Up
          </span>
          <h2 className="text-2xl font-semibold text-[color:var(--color-soil)]">Join tiny greenhouse</h2>
          <p className="text-sm text-[color:var(--color-soil-70)]">
            Create your account to unlock dashboards, automations, and seasonal insights.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSignUp}>
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-[color:var(--color-soil)] font-medium">
              Email
            </Label>
            <TextInput
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="!border-[rgba(31,111,74,0.22)] !bg-white !text-[color:var(--color-soil)] !placeholder:text-[color:var(--color-soil-60)] focus:!border-[rgba(31,111,74,0.6)] focus:!ring-[rgba(31,111,74,0.28)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-[color:var(--color-soil)] font-medium">
              Password
            </Label>
            <TextInput
              id="signup-password"
              type="password"
              placeholder="Create a secure password"
              required
              autoComplete="new-password"
              className="!border-[rgba(31,111,74,0.22)] !bg-white !text-[color:var(--color-soil)] !placeholder:text-[color:var(--color-soil-60)] focus:!border-[rgba(31,111,74,0.6)] focus:!ring-[rgba(31,111,74,0.28)]"
            />
          </div>

          <Button
            type="submit"
            color="light"
            className="w-full !border-none !text-white !shadow-[0_20px_48px_rgba(79,160,113,0.28)] !transition !duration-200 hover:!-translate-y-0.5 hover:!shadow-[0_26px_60px_rgba(79,160,113,0.35)] hover:!brightness-95 focus-visible:!ring-4 focus-visible:!ring-[rgba(79,160,113,0.35)] focus-visible:!outline-none"
            style={{
              backgroundColor: palette.moss,
            }}
          >
            Create account
          </Button>
        </form>

        <div className="mt-10 text-center text-sm text-[color:var(--color-soil-70)]">
          Already have an account?{' '}
          <button
            type="button"
            className="font-semibold text-[color:var(--color-evergreen)] hover:underline"
            onClick={() => setFace('signIn')}
          >
            Sign in instead
          </button>
        </div>
      </div>
    </Card>
  )

  return <Flip front={front} back={back} isFlipped={isFlipped} className="w-full max-w-xl" />
}
