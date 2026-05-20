import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_TITLE = 'Tiny Greenhouse';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/alerts': 'Alerts',
  '/notifications': 'Notifications',
  '/timelapse': 'Timelapse',
  '/sensor-data': 'Sensor Data',
  '/settings': 'Settings',
  '/assistant': 'Assistant',
  '/login': 'Sign in',
  '/setup': 'Setup',
  '/logout': 'Signing out',
};

export const useDocumentTitle = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const segment = ROUTE_TITLES[pathname];
    document.title = segment ? `${segment} · ${BASE_TITLE}` : BASE_TITLE;
  }, [pathname]);
};
