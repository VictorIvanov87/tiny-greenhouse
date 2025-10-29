import type { MouseEvent, PropsWithChildren } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ListGroup,
  ListGroupItem,
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarLink,
  NavbarToggle,
} from 'flowbite-react';
import { Brand } from '../shared/ui/Brand';
import { UserMenu } from '../shared/ui/UserMenu';
import type { SetupProfile } from '../features/setup/state';

type AppShellProps = PropsWithChildren<{
  profile: SetupProfile;
}>;

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/setup', label: 'Setup Wizard' },
];

export const AppShell = ({ children, profile }: AppShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    navigate(path);
  };

  return (
    <div className="flex min-h-screen bg-[color:var(--color-sage-soft)] text-[color:var(--color-soil)]">
      <aside className="relative hidden w-64 flex-shrink-0 flex-col border-r border-[color:var(--color-evergreen-soft)] bg-white/60 px-6 py-8 backdrop-blur md:flex">
        <div className="mb-8">
          <Brand
            orientation="vertical"
            subtitle={
              profile.currentGreenhouseId ? `Greenhouse ${profile.currentGreenhouseId}` : undefined
            }
          />
        </div>
        <ListGroup className="flex flex-1 flex-col gap-2 bg-transparent">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <ListGroupItem
                key={item.to}
                href={item.to}
                onClick={handleNavigation(item.to)}
                className={[
                  'flex items-center gap-3 rounded-2xl border-none px-4 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-[color:var(--color-evergreen)] text-white shadow-[0_12px_32px_rgba(31,111,74,0.25)]'
                    : 'bg-transparent text-[color:var(--color-soil-70)] hover:bg-[rgba(31,111,74,0.08)]',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-lg">•</span>
                <span>{item.label}</span>
              </ListGroupItem>
            );
          })}
        </ListGroup>
        <div className="mt-auto text-xs uppercase tracking-[0.25em] text-[color:var(--color-soil-60)]">
          Tiny Greenhouse
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <Navbar
          fluid
          rounded
          className="border-b border-[color:var(--color-evergreen-soft)] bg-white/70 px-4 py-3 backdrop-blur md:px-6"
        >
          <NavbarBrand href="/dashboard" onClick={handleNavigation('/dashboard')} className="gap-3">
            <Brand />
          </NavbarBrand>
          <div className="flex items-center gap-3 md:order-2">
            <UserMenu />
            <NavbarToggle />
          </div>
          <NavbarCollapse>
            {navItems.map((item) => (
              <NavbarLink
                key={item.to}
                href={item.to}
                onClick={handleNavigation(item.to)}
                active={location.pathname === item.to}
              >
                {item.label}
              </NavbarLink>
            ))}
          </NavbarCollapse>
        </Navbar>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
};
