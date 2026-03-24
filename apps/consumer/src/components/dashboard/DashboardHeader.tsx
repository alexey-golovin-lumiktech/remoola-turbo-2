import styles from '../ui/classNames.module.css';

const { dashboardHeader, dashboardHeaderSubtitle, dashboardHeaderTitle } = styles;

export function DashboardHeader() {
  return (
    <header className={dashboardHeader} data-testid="consumer-dashboard-header">
      <h1 className={dashboardHeaderTitle}>Welcome back</h1>
      <p className={dashboardHeaderSubtitle}>
        Review balances, open payment requests, and compliance tasks in one place.
      </p>
    </header>
  );
}
