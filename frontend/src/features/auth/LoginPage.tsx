import { Navigate } from 'react-router-dom';
import { Card, ListGroup, ListGroupItem } from 'flowbite-react';
import { alpha, palette } from '../../theme/palette';
import { AuthCard } from './components/AuthCard';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from '../setup/hooks/useUserProfile';

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

  const featureItems = [
    {
      id: 'insights',
      accent: palette.moss,
      copy: 'Realtime vitals tuned to your greenhouse microclimate with signal-based recommendations.',
    },
    {
      id: 'balance',
      accent: palette.sunlight,
      copy: 'Adaptive lighting and irrigation cues that balance sunlight, humidity, and nutrient delivery.',
    },
    {
      id: 'alerts',
      accent: palette.chili,
      copy: 'Early alerts before conditions slip so you can respond with confidence and keep crops thriving.',
    },
  ];

  const heroBackground = [
    `radial-gradient(circle at 12% 18%, ${alpha(palette.sunlight, 0.18)} 0%, transparent 50%)`,
    `radial-gradient(circle at 88% 12%, ${alpha(palette.moss, 0.2)} 0%, transparent 55%)`,
    `linear-gradient(135deg, ${palette.night} 0%, ${alpha(palette.soil, 0.45)} 65%, ${
      palette.soil
    } 100%)`,
  ].join(', ');

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{
        background: heroBackground,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div
          className="absolute -left-24 top-32 h-72 w-72 rounded-full blur-3xl"
          style={{ background: alpha(palette.evergreen, 0.2) }}
        />
        <div
          className="absolute bottom-10 right-0 h-80 w-80 rounded-full blur-3xl"
          style={{ background: alpha(palette.sunlight, 0.28) }}
        />
        <div
          className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: alpha(palette.moss, 0.18) }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-6 md:px-10">
        <div className="flex w-full max-w-5xl flex-col items-center gap-10 text-center lg:gap-12">
          <Card className="w-full rounded-3xl border border-white/30 bg-white/15 text-left text-[color:var(--color-sage)] shadow-[0_28px_80px_rgba(8,16,12,0.3)] backdrop-blur">
            <div className="space-y-4">
              <span
                className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em]"
                style={{
                  background: alpha(palette.evergreen, 0.2),
                  color: palette.sage,
                }}
              >
                Tiny greenhouse
              </span>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Grow smarter with a live greenhouse companion
              </h1>
              <p className="text-sm text-[color:var(--color-sage)]/85 sm:text-base">
                Keep every bed in balance and stay ahead of shifts in your environment with guided
                insights rooted in horticultural best practices.
              </p>
            </div>
          </Card>

          <div className="w-full max-w-xl">
            <AuthCard />
          </div>

          <Card className="w-full rounded-3xl border border-white/25 bg-white/15 text-left text-[color:var(--color-sage)] shadow-[0_24px_70px_rgba(8,16,12,0.28)] backdrop-blur">
            <ListGroup className="divide-y divide-white/20">
              {featureItems.map((feature) => (
                <ListGroupItem
                  key={feature.id}
                  className="flex items-start gap-3 border-none bg-transparent text-sm text-[color:var(--color-sage)]/90 hover:bg-white/5 focus-visible:ring-emerald-200"
                >
                  <span
                    className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full"
                    style={{ backgroundColor: feature.accent }}
                  />
                  <span>{feature.copy}</span>
                </ListGroupItem>
              ))}
            </ListGroup>
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-[color:var(--color-sage)]/60">
              Sign in above to preview the upcoming dashboard experience.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
