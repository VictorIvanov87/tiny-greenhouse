import { Button, Card } from 'flowbite-react';
import { alpha, palette } from '../../theme/palette';
import { useAuth } from '../auth/hooks/useAuth';

const HomePage = () => {
  const { signOut } = useAuth();

  return (
    <div
      className="flex min-h-screen h-screen items-center justify-center px-4 py-16"
      style={{
        background: `linear-gradient(135deg, ${palette.sageSoft} 0%, #ffffff 35%, ${alpha(
          palette.sunlight,
          0.22
        )} 100%)`,
      }}
    >
      <Card className="w-full max-w-xl space-y-5 rounded-3xl border border-[color:var(--color-evergreen-soft)] bg-[color:var(--color-card)] shadow-[0_28px_80px_var(--color-evergreen-shadow)] backdrop-blur">
        <h1 className="text-3xl font-semibold" style={{ color: palette.evergreen }}>
          Protected area
        </h1>
        <p className="text-base" style={{ color: palette.soil70 }}>
          This placeholder dashboard is only visible while you are signed in. Use it to confirm that
          the route guard is working before live greenhouse data is wired up.
        </p>
        <Button
          color="light"
          onClick={() => {
            void signOut();
          }}
          className="w-full sm:w-auto !border-none !text-white !shadow-[0_18px_45px_var(--color-evergreen-shadow)] hover:!-translate-y-0.5 hover:!shadow-[0_24px_55px_var(--color-evergreen-shadow)] hover:!bg-[color:var(--color-evergreen-dark)] focus-visible:!ring-4 focus-visible:!ring-[color:var(--color-moss-soft)] focus-visible:!outline-none"
          style={{ backgroundColor: palette.evergreen }}
        >
          Sign out
        </Button>
      </Card>
    </div>
  );
};

export default HomePage;
