# CLAUDE.md — Frontend

React 19 SPA — Vite + TypeScript + Tailwind CSS + Flowbite React components. Port 5173.

## Stack

- **React 19** + React Router DOM 7
- **TanStack Query v5** — all server state (fetch, cache, invalidate)
- **Flowbite React 0.12** — component library built on Tailwind
- **Tailwind CSS 4** — utility-first; dark-theme-first design
- **Recharts 3** — time-series charts
- **Vite 7** — dev server on port 5173 (`strictPort: true`)

## Commands

```bash
npm run dev          # Vite dev server on :5173
npm run build        # tsc -b && vite build → dist/
npm run lint         # ESLint flat config
```

No test runner is configured yet.

## Directory map

```
src/
  app/
    providers.tsx       QueryClient + AuthProvider + AlertsProvider
    routes.tsx          Protected routes; redirects to setup wizard or login
    AppShell.tsx        Sidebar nav + page layout
  features/             One folder per domain page
    auth/               Login, signup, AuthCard
    setup/wizard/       Multi-step setup flow (StepXxx.tsx)
    dashboard/          DashboardPage + widget components
    telemetry/          SensorDataPage — charts + table
    timelapse/          TimelapsePage — frame gallery + player
    greenhouse/         GreenhouseFormFields
    alerts/             AlertsPage + AlertsProvider
    notifications/      NotificationsPage
    assistant/          AssistantPage + MiniAssist widget
    settings/           SettingsPage
  shared/
    ui/                 Reusable layout components (Brand, SidebarNav, Stepper, …)
    hooks/              Custom hooks
    utils/              Helper functions
    config/             API base URL, constants
  theme/                Design tokens
  styles/               Global CSS
```

New screen → `src/features/<name>/<Name>Page.tsx`. Extract sub-components into `components/` inside the feature when the file grows past ~80 lines.

## UI component rules

### Buttons — 3 patterns only

```tsx
<Button color="green" outline={true}>Save / Apply / Confirm / Next</Button>
<Button color="red"   outline={true}>Cancel / Reset / Delete</Button>
<Button color="gray"  outline={true}>Everything else</Button>
```

No custom `className` for colour or styling. Layout/spacing classes are fine.

### Input fields — Flowbite only

| Native element | Use instead |
|----------------|-------------|
| `<input type="text/number/time">` | `<TextInput>` |
| `<select>` | `<Select>` |
| `<textarea>` | `<Textarea>` |
| `<input type="range">` | `<RangeSlider>` |
| `<input type="date">` | `<Datepicker>` |

Do not add custom `style=` or colour `className` overrides to Flowbite inputs.

### Toggles

**Do not use `<ToggleSwitch>` from Flowbite** — it does not reflect state visually in dark-themed contexts. Use the checkbox peer pattern:

```tsx
const Toggle = ({ checked, onChange, disabled }) => (
  <label className="inline-flex cursor-pointer items-center">
    <input type="checkbox" className="peer sr-only"
      checked={checked} disabled={disabled}
      onChange={(e) => onChange(e.target.checked)} />
    <div className="peer relative h-6 w-11 rounded-full bg-gray-700
      after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5
      after:rounded-full after:border after:border-gray-600 after:bg-white
      after:transition-all after:content-['']
      peer-checked:bg-green-600 peer-checked:after:translate-x-full
      peer-checked:after:border-white peer-focus:outline-none
      peer-focus:ring-4 peer-focus:ring-green-800
      rtl:peer-checked:after:-translate-x-full" />
  </label>
);
```

Exception: `<ToggleSwitch>` is fine inside light-themed cards (e.g. SetupWizard steps).

## Dark theme

The app is dark-first. Background palette: `#0b1220` (deepest), `#111c2d` (cards), `#1f2a3d` / `#22324a` (borders). Do not override Flowbite component colours manually — Tailwind dark mode classes handle this.

## Data fetching

All API calls go through TanStack Query. Fetch in `queryFn`, never in event handlers:

```tsx
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['greenhouse'],
  queryFn: () => fetch('/api/greenhouses/current').then(r => r.json()),
});
```

Mutations use `useMutation` + `queryClient.invalidateQueries()` on success.

Always handle the three data states: loading, error, empty.

## Flowbite docs (when working on UI)

Fetch these before generating or refactoring Flowbite components:

- `https://flowbite-react.com/llms.txt` — token-efficient summary
- `https://flowbite-react.com/llms-full.txt` — full API reference
- Append `.md` to any docs page for markdown: e.g. `https://flowbite-react.com/docs/components/button.md`

## Coding conventions

- TypeScript strict; no `any` in public types
- PascalCase for components, camelCase for functions/vars
- Co-locate feature-specific helpers with the feature file
- Prettier defaults: 2 spaces, semicolons, single quotes
- CSS: Tailwind classes; global styles only in `src/styles/`
- No secrets/keys in client code or frontend `.env`
