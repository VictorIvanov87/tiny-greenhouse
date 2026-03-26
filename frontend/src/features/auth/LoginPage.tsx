import { Navigate } from 'react-router-dom';
import { alpha, palette } from '../../theme/palette';
import { AuthCard } from './components/AuthCard';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from '../setup/hooks/useUserProfile';
import { Brand } from '../../shared/ui/Brand';

const LoginPage = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user ? user.uid : null);

  if (user && profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-night)] text-[color:var(--color-sage)]">
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
      className="relative flex h-screen flex-col overflow-hidden"
      style={{
        background: heroBackground,
      }}
    >
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 py-10 md:px-10">
        <div className="flex w-full max-w-5xl flex-col justify-start items-center h-full gap-10 text-center lg:gap-12">
          <div className="w-full space-y-4 text-center pb-10 pt-10">
            <Brand variant="dark" className="mb-2 justify-center" />
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl mt-5">
              Grow smarter with a live greenhouse companion
            </h1>
            <p className="text-sm text-[color:var(--color-sage)]/85 sm:text-base">
              Keep every bed in balance and stay ahead of shifts in your environment with guided
              insights rooted in horticultural best practices.
            </p>
          </div>

          <div className="w-full max-w-xl pt-10">
            <AuthCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
