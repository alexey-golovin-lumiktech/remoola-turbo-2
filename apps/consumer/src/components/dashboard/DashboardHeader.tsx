'use client';

import styles from '../ui/classNames.module.css';

const { dashboardHeader, dashboardHeaderSubtitle, dashboardHeaderTitle } = styles;

export function DashboardHeader() {
  return (
    <header className={dashboardHeader} data-testid="consumer-dashboard-header">
      <h1 className={dashboardHeaderTitle}>Client Dashboard</h1>
      <p className={dashboardHeaderSubtitle}>Pay contractors fast and keep everything compliant.</p>
    </header>
  );
}
