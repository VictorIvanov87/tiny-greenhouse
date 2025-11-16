import type { MouseEvent, SVGProps, ReactElement, ReactNode } from 'react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarItems,
  SidebarItemGroup,
  SidebarItem,
  Dropdown,
  DropdownItem,
  Avatar,
} from 'flowbite-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import type { SetupProfile } from '../../features/setup/state';
import { Brand } from './Brand';
import { useAlerts } from '../../features/alerts/AlertsProvider';

type SidebarNavProps = {
  profile: SetupProfile;
  isMobileOpen: boolean;
  onClose: () => void;
};

type IconProps = SVGProps<SVGSVGElement>;

type NavItem = {
  to: string;
  label: ReactNode;
  icon: (props: IconProps) => ReactElement;
};

const DashboardIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <path d="M4 12h6V5H4v7Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V3h-6Z" />
  </svg>
);

const BellIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <path d="M12 21a2.25 2.25 0 0 0 2.25-2.25h-4.5A2.25 2.25 0 0 0 12 21Z" />
    <path
      strokeLinecap="round"
      d="M5.25 17.25h13.5m-1.5-6a5.25 5.25 0 1 0-10.5 0c0 3.5-1.5 4.5-1.5 4.5h13.5s-1.5-1-1.5-4.5Z"
    />
  </svg>
);

const CameraIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 7h-.8A2.2 2.2 0 0 0 4 9.2v7.6A2.2 2.2 0 0 0 6.2 19h11.6A2.2 2.2 0 0 0 20 16.8V9.2A2.2 2.2 0 0 0 17.8 7H17l-1.2-2H8.2Z"
    />
    <circle cx={12} cy={13} r={3.25} />
  </svg>
);

const TableIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <rect x={3} y={5} width={18} height={14} rx={1.5} />
    <path d="M3 10h18M8.5 19V5m7 14V5" />
  </svg>
);

const SettingsIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m6.75 4.5 1.1 1.91a1.5 1.5 0 0 0 1.3.79h5.7a1.5 1.5 0 0 0 1.3-.79l1.1-1.91 1.84 1.06-1.1 1.91a1.5 1.5 0 0 0 0 1.5l1.1 1.9-1.84 1.06-1.1-1.9a1.5 1.5 0 0 0-1.3-.79h-5.7a1.5 1.5 0 0 0-1.3.79l-1.1 1.9-1.84-1.06 1.1-1.9a1.5 1.5 0 0 0 0-1.5l-1.1-1.91 1.84-1.06Zm5.25 6a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5Zm0 0"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17.5a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v2.25H9Z"
    />
  </svg>
);

const ChatIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 18.5v-11A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v5A2.5 2.5 0 0 1 16.5 15h-4.38L7.5 19v-3.5Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 10.75h4.5m-4.5 2.5H12" />
  </svg>
);

const navBlueprint: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/alerts', label: 'Alerts', icon: BellIcon },
  { to: '/notifications', label: 'Notifications', icon: BellIcon },
  { to: '/timelapse', label: 'Timelapse', icon: CameraIcon },
  { to: '/sensor-data', label: 'Sensor Data', icon: TableIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/assistant', label: 'Assistant', icon: ChatIcon },
];

const SetupIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 9h16M4 15h16M8 9v10m4-10v10m4-10v10"
    />
    <path strokeLinecap="round" d="M6 5h12a1 1 0 0 1 1 1v0H5v0a1 1 0 0 1 1-1Z" />
  </svg>
);

const getInitials = (displayName?: string | null, email?: string | null) => {
  const source = displayName || email || '';
  if (!source) {
    return 'TG';
  }

  const parts = source.includes('@') ? source.split('@')[0] : source;
  const [first = '', second = ''] = parts.split(/[.\s\-_]/);
  const initials = (first.charAt(0) + (second.charAt(0) || '')).toUpperCase();
  return initials || 'TG';
};

export const SidebarNav = ({ profile, isMobileOpen, onClose }: SidebarNavProps) => {
  const { user } = useAuth();
  const { active } = useAlerts();
  const location = useLocation();
  const navigate = useNavigate();

  const displayName = user?.displayName?.trim();
  const email = user?.email ?? undefined;
  const initials = useMemo(() => getInitials(displayName, email), [displayName, email]);

  const navItems = useMemo(() => {
    const items = [...navBlueprint];
    if (!profile.setupCompleted || !profile.cropId || !profile.variety) {
      items.unshift({ to: '/setup', label: 'Setup Wizard', icon: SetupIcon });
    }
    return items;
  }, [profile.cropId, profile.variety, profile.setupCompleted]);

  const handleNavigate = (path: string) => (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    navigate(path);
    onClose();
  };

  const handleBackgroundClick = () => {
    onClose();
  };

  const handleMenuClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const renderSidebar = () => (
    <Sidebar
      aria-label="Primary navigation"
      className="flex h-full w-full flex-col overflow-hidden"
    >
      <div className="flex h-full flex-col">
        <div className="px-5">
          <Brand
            orientation="vertical"
            subtitle={
              profile.currentGreenhouseId ? `Greenhouse ${profile.currentGreenhouseId}` : undefined
            }
            variant="dark"
          />
        </div>

        <SidebarItems className="mt-8 flex-1 overflow-y-auto px-3">
          <SidebarItemGroup className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

              const alertCount = item.to === '/alerts' ? active.length : 0;
              return (
                <SidebarItem
                  key={item.to}
                  href={item.to}
                  onClick={handleNavigate(item.to)}
                  className="flex"
                  icon={item.icon}
                  active={isActive}
                  label={alertCount > 0 ? String(alertCount) : undefined}
                >
                  {item.label}
                </SidebarItem>
              );
            })}
          </SidebarItemGroup>
        </SidebarItems>

        <div className="mt-auto px-3 pt-6">
          <Dropdown
            inline
            arrowIcon={false}
            label={
              <div className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-[#162036] px-3 py-2 text-left transition hover:border-[#2f446b] hover:bg-[#1b2742]">
                <Avatar
                  placeholderInitials={initials}
                  rounded
                  className="ring-sky-400/30 ring-offset-2 ring-offset-[#111c2d]"
                />
                <div className="flex-1">
                  <span className="block text-sm font-semibold text-slate-100">
                    {displayName || email || 'Tiny Greenhouse Keeper'}
                  </span>
                  {email ? (
                    <span className="block truncate text-xs text-slate-400">{email}</span>
                  ) : null}
                </div>
                <svg
                  className="h-4 w-4 text-slate-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            }
          >
            <DropdownItem
              onClick={() => {
                navigate('/logout');
                onClose();
              }}
            >
              Logout
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </Sidebar>
  );

  return (
    <>
      <aside className="hidden h-full md:block md:w-72 md:flex-shrink-0">
        <div className="sticky top-0 h-screen w-full">{renderSidebar()}</div>
      </aside>
      {isMobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={handleBackgroundClick}>
          <div
            className={[
              'h-full w-72 transition-transform duration-200',
              isMobileOpen ? 'translate-x-0' : '-translate-x-full',
            ].join(' ')}
            onClick={handleMenuClick}
          >
            {renderSidebar()}
          </div>
        </div>
      ) : null}
    </>
  );
};
