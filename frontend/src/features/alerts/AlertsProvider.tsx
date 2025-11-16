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
import { Badge, Button, Toast, ToastToggle } from 'flowbite-react';
import { ackAlert, getActiveAlerts, type Alert } from './api';
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

export const AlertsProvider = ({ children, intervalMs = POLL_INTERVAL }: AlertsProviderProps) => {
  const { user, loading } = useAuth();
  const [active, setActive] = useState<Alert[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [toasts, setToasts] = useState<Alert[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const alerts = await getActiveAlerts();
      setActive(alerts);
      setLastFetchedAt(new Date());

      const seen = seenIdsRef.current;
      const newAlerts = alerts.filter((alert) => !seen.has(alert.id));

      if (newAlerts.length > 0) {
        newAlerts.forEach((alert) => seen.add(alert.id));
        setToasts((prev) => [...prev, ...newAlerts]);
      }

      const activeIds = new Set(alerts.map((alert) => alert.id));
      seenIdsRef.current = new Set([...seen].filter((id) => activeIds.has(id)));
    } catch (error) {
      console.error('Failed to fetch alerts', error);
    }
  }, [user]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      setActive([]);
      setLastFetchedAt(null);
      setToasts([]);
      seenIdsRef.current = new Set();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    refresh();
    timerRef.current = window.setInterval(refresh, intervalMs);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [intervalMs, refresh, user, loading]);

  const handleToastDismiss = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleAck = async (id: string) => {
    try {
      await ackAlert(id);
      await refresh();
      handleToastDismiss(id);
    } catch (error) {
      console.error('Failed to acknowledge alert', error);
    }
  };

  const value = useMemo<AlertsContextValue>(
    () => ({
      active,
      lastFetchedAt,
      refresh,
    }),
    [active, lastFetchedAt, refresh]
  );

  return (
    <AlertsContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map((alert) => (
          <Toast
            key={alert.id}
            className="w-72 border border-slate-200 bg-white text-slate-900 shadow-lg"
          >
            <ToastToggle onDismiss={() => handleToastDismiss(alert.id)} />
            <div>
              <div className="flex items-center justify-between gap-2">
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
                  {alert.severity}
                </Badge>
              </div>
              <p className="mt-1 text-sm">{alert.message}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button size="xs" onClick={() => handleAck(alert.id)}>
                  Acknowledge
                </Button>
                <Button size="xs" color="light" onClick={() => handleToastDismiss(alert.id)}>
                  Dismiss
                </Button>
              </div>
            </div>
          </Toast>
        ))}
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
