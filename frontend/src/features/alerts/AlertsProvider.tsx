import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Toast, ToastToggle } from 'flowbite-react';
import { getActiveAlerts, type Alert } from './api';
import { useAuth } from '../auth/hooks/useAuth';

type AlertsContextValue = {
  active: Alert[];
  lastFetchedAt: Date | null;
  refresh: () => Promise<void>;
};

const AlertsContext = createContext<AlertsContextValue | undefined>(undefined);

type AlertsProviderProps = PropsWithChildren & {
  intervalMs?: number;
};

const POLL_INTERVAL = 30_000;

const alertKeys = {
  active: ['alerts', 'active'] as const,
};

export const AlertsProvider = ({ children, intervalMs = POLL_INTERVAL }: AlertsProviderProps) => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState<Alert[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialFetchRef = useRef(true);

  const {
    data: active = [],
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: alertKeys.active,
    queryFn: getActiveAlerts,
    enabled: !!user && !authLoading,
    refetchInterval: intervalMs,
    staleTime: 0,
  });

  const lastFetchedAt = useMemo(
    () => (dataUpdatedAt ? new Date(dataUpdatedAt) : null),
    [dataUpdatedAt],
  );

  // Diff active alerts to show toasts for new ones
  useEffect(() => {
    if (!dataUpdatedAt) return;

    const seen = seenIdsRef.current;

    // On first fetch, mark all existing alerts as seen without showing toasts
    if (initialFetchRef.current) {
      initialFetchRef.current = false;
      active.forEach((alert) => seen.add(alert.id));
      return;
    }

    const newAlerts = active.filter((alert) => !seen.has(alert.id));
    if (newAlerts.length > 0) {
      newAlerts.forEach((alert) => seen.add(alert.id));
      setToasts((prev) => [...prev, ...newAlerts]);
    }

    const activeIds = new Set(active.map((a) => a.id));
    seenIdsRef.current = new Set([...seen].filter((id) => activeIds.has(id)));
  }, [active, dataUpdatedAt]);

  // Reset state when user logs out
  useEffect(() => {
    if (!user) {
      setToasts([]);
      seenIdsRef.current = new Set();
      initialFetchRef.current = true;
      queryClient.removeQueries({ queryKey: alertKeys.active });
    }
  }, [user, queryClient]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleToastDismiss = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const value = useMemo<AlertsContextValue>(
    () => ({
      active,
      lastFetchedAt,
      refresh,
    }),
    [active, lastFetchedAt, refresh]
  );

  const severityStyle = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return { border: '#f43f5e', iconBg: '#7f1d1d', iconStroke: '#fb7185', label: 'Error' };
      case 'warn':
        return { border: '#f59e0b', iconBg: '#78350f', iconStroke: '#fbbf24', label: 'Warning' };
      default:
        return { border: '#38bdf8', iconBg: '#0c4a6e', iconStroke: '#7dd3fc', label: 'Info' };
    }
  };

  return (
    <AlertsContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxHeight: 'calc(100dvh - 5rem)',
          maxWidth: 384,
          overflow: 'hidden',
        }}
      >
        {toasts.slice(-3).map((alert) => {
          const s = severityStyle(alert.severity);
          return (
            <Toast
              key={alert.id}
              className="w-full bg-[#111c2d] text-slate-100 shadow-xl"
              style={{
                animation: 'toastPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                border: `2px solid ${s.border}`,
              }}
            >
              <ToastToggle onDismiss={() => handleToastDismiss(alert.id)} />
              <div className="flex gap-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mt-0.5 shrink-0">
                  <circle cx="10" cy="10" r="9" fill={s.iconBg} stroke={s.border} strokeWidth="1.5" />
                  <path d="M10 6V11" stroke={s.iconStroke} strokeWidth="2" strokeLinecap="round" />
                  <circle cx="10" cy="14" r="1" fill={s.iconStroke} />
                </svg>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{alert.type.replace(/_/g, ' ')}</span>
                    <Badge
                      color={
                        alert.severity === 'critical'
                          ? 'failure'
                          : alert.severity === 'warn'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {s.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{alert.message}</p>
                  <div className="mt-2">
                    <Button size="xs" color="light" onClick={() => handleToastDismiss(alert.id)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </Toast>
          );
        })}
      </div>
    </AlertsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }

  return context;
};
