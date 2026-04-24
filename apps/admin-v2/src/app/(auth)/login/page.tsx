import { LoginForm } from '../../../features/auth/LoginForm';
import styles from '../auth-pages.module.css';

export default function LoginPage({ searchParams }: { searchParams?: Promise<{ sessionExpired?: string }> }) {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin v2</h1>
          <p className={styles.subtitle}>
            Canonical MVP-2 shell keeps Overview, Consumers, Verification, Payments, Ledger and Audit primary. Exchange
            and Documents remain top-level breadth, Admins stays later breadth for eligible super-admin identities, and
            Payouts plus Payment Methods stay nested finance investigation routes. System remains outside MVP-2.
          </p>
        </div>
        <LoginForm />
        <LoginNotice searchParams={searchParams} />
      </div>
    </div>
  );
}

async function LoginNotice({ searchParams }: { searchParams?: Promise<{ sessionExpired?: string }> }) {
  const params = await searchParams;
  if (params?.sessionExpired !== `1`) {
    return null;
  }
  return <p className={styles.notice}>Your session expired. Please sign in again.</p>;
}
