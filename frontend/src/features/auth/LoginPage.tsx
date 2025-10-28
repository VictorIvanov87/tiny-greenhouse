import { Navigate } from 'react-router-dom';
import { alpha, palette } from '../../theme/palette';
import { AuthCard } from './components/AuthCard';
import { useAuth } from './hooks/useAuth';

const LoginPage = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
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
      className="relative flex min-h-screen h-screen flex-col overflow-hidden"
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
        <div className="flex w-full max-w-5xl flex-col items-center gap-12 text-center lg:gap-16">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium uppercase tracking-wide text-[color:var(--color-sage)] shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
            style={{
              background: alpha(palette.evergreen, 0.25),
            }}
          >
            Tiny Greenhouse
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-[color:var(--color-sage)] sm:text-5xl">
            Grow smarter with a live greenhouse companion
          </h1>
          <p className="text-lg text-[color:var(--color-sage)]/85 md:max-w-xl">
            Keep every bed in balance and stay ahead of shifts in your environment with guided
            insights rooted in horticultural best practices.
          </p>
          <div className="w-full max-w-xl">
            <AuthCard />
          </div>

          <div className="w-full max-w-4xl space-y-6 text-[color:var(--color-sage)]/85">
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featureItems.map((feature) => (
                <li
                  key={feature.id}
                  className="flex h-full flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-5 text-sm leading-relaxed text-[color:var(--color-sage)]/90 shadow-[0_12px_35px_rgba(8,16,12,0.25)] backdrop-blur"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: feature.accent }}
                  />
                  <span>{feature.copy}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-[color:var(--color-sage)]/70">
              Sign in above to explore the dashboard experience while we finish connecting live
              sensor data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
