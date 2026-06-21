'use client';

import { useEffect } from 'react';

export const DASHBOARD_REFRESH_EVENT = 'cms:dashboard-refresh';

export function requestDashboardRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DASHBOARD_REFRESH_EVENT));
}

export function useDashboardRefreshListener(callback: () => void) {
  useEffect(() => {
    window.addEventListener(DASHBOARD_REFRESH_EVENT, callback);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, callback);
  }, [callback]);
}
