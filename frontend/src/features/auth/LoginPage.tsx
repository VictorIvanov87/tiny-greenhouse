import { Navigate } from 'react-router-dom';
import { alpha, palette } from '../../theme/palette';
import { AuthCard } from './components/AuthCard';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from '../setup/hooks/useUserProfile';
import { Brand } from '../../shared/ui/Brand';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';

const LoginPage = () => {
  useDocumentTitle();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user ? user.uid : null);

  if (user && profileLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[color:var(--color-night)] text-[color:var(--color-sage)]">
        <span className="text-sm opacity-80">Preparing your dashboard...</span>
      </div>
    );
  }

  if (user && profile?.setupCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user && !profile?.setupCompleted) {
    return <Navigate to="/setup" replace />;
  }

  const heroBackground = [
    `radial-gradient(circle at 12% 18%, ${alpha(palette.sunlight, 0.18)} 0%, transparent 50%)`,
    `radial-gradient(circle at 88% 12%, ${alpha(palette.moss, 0.2)} 0%, transparent 55%)`,
    `linear-gradient(135deg, ${palette.night} 0%, ${alpha(palette.soil, 0.45)} 65%, ${
      palette.soil
    } 100%)`,
  ].join(', ');

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-y-auto"
      style={{
        background: heroBackground,
      }}
    >
      <div className="relative z-10 flex min-h-dvh flex-col items-center px-4 py-6 sm:px-6 sm:py-8 md:px-10 lg:justify-center">
        <div className="flex w-full max-w-5xl flex-col items-center gap-6 text-center sm:gap-8 lg:gap-10">
          <div className="w-full space-y-3 text-center sm:space-y-4">
            <Brand variant="dark" className="mb-2 justify-center" />
            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              Grow smarter with a live greenhouse companion
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-[color:var(--color-sage)]/85 sm:text-base">
              Keep every bed in balance and stay ahead of shifts in your environment with guided
              insights rooted in horticultural best practices.
            </p>
          </div>

          <div className="w-full max-w-xl pb-8">
            <AuthCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
