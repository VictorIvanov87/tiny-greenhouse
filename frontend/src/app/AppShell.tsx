import type { PropsWithChildren } from 'react'
import { NavLink } from 'react-router-dom'
import { Brand } from '../shared/ui/Brand'
import { UserMenu } from '../shared/ui/UserMenu'
import type { SetupProfile } from '../features/setup/state'

type AppShellProps = PropsWithChildren<{
  profile: SetupProfile
}>

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/setup', label: 'Setup Wizard' },
]

const linkBase =
  'flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200'

export const AppShell = ({ children, profile }: AppShellProps) => {
  return (
    <div className="flex min-h-screen bg-[color:var(--color-sage-soft)] text-[color:var(--color-soil)]">
      <aside className="relative hidden w-64 flex-shrink-0 flex-col border-r border-[color:var(--color-evergreen-soft)] bg-white/60 px-6 py-8 backdrop-blur md:flex">
        <div className="mb-8">
          <Brand orientation="vertical" subtitle={profile.currentGreenhouseId ? `Greenhouse ${profile.currentGreenhouseId}` : undefined} />
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  linkBase,
                  isActive
                    ? 'bg-[color:var(--color-evergreen)] text-white shadow-[0_12px_32px_rgba(31,111,74,0.25)]'
                    : 'text-[color:var(--color-soil-70)] hover:bg-[rgba(31,111,74,0.08)]',
                ].join(' ')
              }
            >
              <span className="text-lg">•</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto text-xs uppercase tracking-[0.25em] text-[color:var(--color-soil-60)]">
          Tiny Greenhouse
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-b border-[color:var(--color-evergreen-soft)] bg-white/70 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-4 md:px-6">
            <Brand className="md:hidden" />
            <div className="hidden md:block">
              <Brand />
            </div>
            <UserMenu />
          </div>
          <nav className="flex gap-3 px-4 pb-4 md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200',
                    isActive
                      ? 'bg-[color:var(--color-evergreen)] text-white'
                      : 'bg-white/70 text-[color:var(--color-soil-70)]',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  )
}
