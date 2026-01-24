'use client';

import { dashboardHeader, dashboardHeaderSubtitle, dashboardHeaderTitle } from '../ui/classNames';

export function DashboardHeader() {
  return (
    <header className={dashboardHeader}>
      <h1 className={dashboardHeaderTitle}>Client Dashboard</h1>
      <p className={dashboardHeaderSubtitle}>Pay contractors fast and keep everything compliant.</p>
    </header>
  );
}
