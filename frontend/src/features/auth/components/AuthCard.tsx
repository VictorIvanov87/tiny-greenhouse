import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, HelperText, Label, TextInput } from 'flowbite-react';
import { Flip } from '../../../shared/ui/Flip';
import { AuthError, signInWithEmail, signInWithGoogle, signUpWithEmail } from '../api';
import { alpha, palette } from '../../../theme/palette';

type CardFace = 'signIn' | 'signUp';

type FormState = {
  email: string;
  password: string;
};

const PASSWORD_MIN_LENGTH = 8;
const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';
const EMPTY_FORM: FormState = { email: '', password: '' };

const isPasswordValid = (value: string) => value.length >= PASSWORD_MIN_LENGTH;
const resolveErrorMessage = (error: unknown) =>
  error instanceof AuthError ? error.message : DEFAULT_ERROR_MESSAGE;

export function AuthCard() {
  const [face, setFace] = useState<CardFace>('signIn');
  const [signInForm, setSignInForm] = useState<FormState>(EMPTY_FORM);
  const [signUpForm, setSignUpForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const isFlipped = face === 'signUp';

  const handleFlip = (nextFace: CardFace) => {
    setFace(nextFace);
    setError(null);
  };

  const handleInputChange =
    (mode: CardFace, field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const { value } = event.target;

      if (mode === 'signIn') {
        setSignInForm((prev) => ({ ...prev, [field]: value }));
      } else {
        setSignUpForm((prev) => ({ ...prev, [field]: value }));
      }
    };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isPasswordValid(signInForm.password)) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await signInWithEmail(signInForm.email, signInForm.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isPasswordValid(signUpForm.password)) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await signUpWithEmail(signUpForm.email, signUpForm.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await signInWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (
        err instanceof AuthError &&
        (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request')
      ) {
        return;
      }
      setError(resolveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const signInPasswordValid = isPasswordValid(signInForm.password);
  const signUpPasswordValid = isPasswordValid(signUpForm.password);

  const front = (
    <Card className="relative h-full min-h-[36rem] overflow-hidden rounded-[32px] border border-[rgba(31,111,74,0.16)] bg-[linear-gradient(145deg,rgba(248,252,248,0.98),rgba(239,250,243,0.96))] text-[color:var(--color-soil)] shadow-[0_34px_90px_rgba(9,22,16,0.28)] backdrop-blur">
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
          {error && face === 'signIn' ? (
            <Alert color="failure" className="border border-red-200 bg-red-50 text-sm text-red-700">
              <span>{error}</span>
            </Alert>
          ) : null}

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
              value={signInForm.email}
              onChange={handleInputChange('signIn', 'email')}
              disabled={submitting}
              className="!border-[rgba(31,111,74,0.22)] !bg-white !text-[color:var(--color-soil)] !placeholder:text-[color:var(--color-soil-60)] focus:!border-[rgba(31,111,74,0.6)] focus:!ring-[rgba(31,111,74,0.28)] disabled:!cursor-not-allowed disabled:!bg-[rgba(239,250,243,0.6)]"
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
              value={signInForm.password}
              onChange={handleInputChange('signIn', 'password')}
              disabled={submitting}
              className="!border-[rgba(31,111,74,0.22)] !bg-white !text-[color:var(--color-soil)] !placeholder:text-[color:var(--color-soil-60)] focus:!border-[rgba(31,111,74,0.6)] focus:!ring-[rgba(31,111,74,0.28)] disabled:!cursor-not-allowed disabled:!bg-[rgba(239,250,243,0.6)]"
            />
            <HelperText
              className={`text-xs ${signInPasswordValid ? 'text-emerald-600' : 'text-red-600'}`}
            >
              Password must be at least 8 characters.
            </HelperText>
          </div>

          <Button
            type="submit"
            disabled={submitting || !signInPasswordValid}
            color="light"
            className="w-full !border-none !text-white !shadow-[0_20px_48px_rgba(31,111,74,0.32)] !transition !duration-200 hover:!-translate-y-0.5 hover:!shadow-[0_26px_60px_rgba(31,111,74,0.4)] hover:!bg-[color:var(--color-evergreen-dark)] focus-visible:!ring-4 focus-visible:!ring-[rgba(79,160,113,0.35)] focus-visible:!outline-none disabled:!cursor-not-allowed disabled:!opacity-80"
            style={{
              backgroundColor: palette.evergreen,
            }}
          >
            {submitting && face === 'signIn' ? 'Signing in...' : 'Sign in and continue'}
          </Button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[color:var(--color-soil-60)]">
            <span className="h-px flex-1 bg-[rgba(31,111,74,0.12)]" />
            Or
            <span className="h-px flex-1 bg-[rgba(31,111,74,0.12)]" />
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            color="light"
            className="w-full !border !border-[rgba(31,111,74,0.2)] !bg-white !text-[color:var(--color-soil)] !transition !duration-200 hover:!-translate-y-0.5 hover:!border-[rgba(31,111,74,0.35)] hover:!bg-[rgba(79,160,113,0.08)] focus-visible:!ring-4 focus-visible:!ring-[rgba(79,160,113,0.25)] focus-visible:!outline-none disabled:!cursor-not-allowed disabled:!opacity-80"
          >
            {submitting && face === 'signIn' ? 'Connecting...' : 'Continue with Google'}
          </Button>
        </form>

        <div className="text-center text-sm text-[color:var(--color-soil-70)]">
          Looking to join?
          <button
            type="button"
            className="ml-2 font-semibold text-[color:var(--color-evergreen)] hover:underline"
            onClick={() => handleFlip('signUp')}
            disabled={submitting}
          >
            Create an account
          </button>
        </div>
      </div>
    </Card>
  );

  const back = (
    <Card className="relative h-full min-h-[36rem] overflow-hidden rounded-[32px] border border-[rgba(31,111,74,0.16)] bg-[linear-gradient(145deg,rgba(239,250,243,0.98),rgba(255,255,255,0.95))] text-[color:var(--color-soil)] shadow-[0_34px_90px_rgba(9,22,16,0.28)] backdrop-blur">
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
          <h2 className="text-2xl font-semibold text-[color:var(--color-soil)]">
            Join tiny greenhouse
          </h2>
          <p className="text-sm text-[color:var(--color-soil-70)]">
            Create your account to unlock dashboards, automations, and seasonal insights.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSignUp}>
          {error && face === 'signUp' ? (
            <Alert color="failure" className="border border-red-200 bg-red-50 text-sm text-red-700">
              <span>{error}</span>
            </Alert>
          ) : null}

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
              value={signUpForm.email}
              onChange={handleInputChange('signUp', 'email')}
              disabled={submitting}
              className="!border-[rgba(31,111,74,0.22)] !bg-white !text-[color:var(--color-soil)] !placeholder:text-[color:var(--color-soil-60)] focus:!border-[rgba(31,111,74,0.6)] focus:!ring-[rgba(31,111,74,0.28)] disabled:!cursor-not-allowed disabled:!bg-[rgba(239,250,243,0.6)]"
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
              value={signUpForm.password}
              onChange={handleInputChange('signUp', 'password')}
              disabled={submitting}
              className="!border-[rgba(31,111,74,0.22)] !bg-white !text-[color:var(--color-soil)] !placeholder:text-[color:var(--color-soil-60)] focus:!border-[rgba(31,111,74,0.6)] focus:!ring-[rgba(31,111,74,0.28)] disabled:!cursor-not-allowed disabled:!bg-[rgba(239,250,243,0.6)]"
            />
            <HelperText
              className={`text-xs ${signUpPasswordValid ? 'text-emerald-600' : 'text-red-600'}`}
            >
              Password must be at least 8 characters.
            </HelperText>
          </div>

          <Button
            type="submit"
            disabled={submitting || !signUpPasswordValid}
            color="light"
            className="w-full !border-none !text-white !shadow-[0_20px_48px_rgba(79,160,113,0.28)] !transition !duration-200 hover:!-translate-y-0.5 hover:!shadow-[0_26px_60px_rgba(79,160,113,0.35)] hover:!brightness-95 focus-visible:!ring-4 focus-visible:!ring-[rgba(79,160,113,0.35)] focus-visible:!outline-none disabled:!cursor-not-allowed disabled:!opacity-80"
            style={{
              backgroundColor: palette.moss,
            }}
          >
            {submitting && face === 'signUp' ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <div className="text-center text-sm text-[color:var(--color-soil-70)]">
          Already have an account?
          <button
            type="button"
            className="ml-2 font-semibold text-[color:var(--color-evergreen)] hover:underline"
            onClick={() => handleFlip('signIn')}
            disabled={submitting}
          >
            Sign in instead
          </button>
        </div>
      </div>
    </Card>
  );

  return <Flip front={front} back={back} isFlipped={isFlipped} className="w-full max-w-xl" />;
}
