import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'flowbite-react';
import type { SetupProfile } from '../features/setup/state';
import { SidebarNav } from '../shared/ui/SidebarNav';
import { Brand } from '../shared/ui/Brand';
import { useDocumentTitle } from '../shared/hooks/useDocumentTitle';

type AppShellProps = PropsWithChildren<{
  profile: SetupProfile;
}>;

export const AppShell = ({ children, profile }: AppShellProps) => {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useDocumentTitle();

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative min-h-dvh w-full bg-[#0b1220] text-slate-200 md:flex">
      <SidebarNav
        profile={profile}
        isMobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex min-h-dvh flex-1 flex-col bg-[#0f1729]">
        <div className="flex items-center gap-3 border-b border-[#1f2a3d] bg-[#111c2d] px-4 py-3 text-slate-200 md:hidden">
          <Button
            color="gray"
            outline={true}
            onClick={() => setIsMobileSidebarOpen((open) => !open)}
            aria-label={isMobileSidebarOpen ? 'Close navigation' : 'Open navigation'}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" d="M5 7h14M5 12h14M5 17h14" />
            </svg>
          </Button>
          <Brand variant="dark" />
        </div>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:px-12 md:py-12">
          <div className="mx-auto w-full max-w-6xl text-slate-200">{children}</div>
        </main>
      </div>
    </div>
  );
};
