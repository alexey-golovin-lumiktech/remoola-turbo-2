import { LoginForm } from '../../../features/auth/LoginForm';
import styles from '../auth-pages.module.css';

export default function LoginPage({ searchParams }: { searchParams?: Promise<{ sessionExpired?: string }> }) {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.eyebrow}>Operator access</div>
          <h1 className={styles.title}>Admin v2</h1>
          <p className={styles.subtitle}>
            Access operational workspaces for reviews, queues, investigations, and account administration from a single
            admin surface.
          </p>
        </div>
        <LoginForm />
        <LoginNotice searchParams={searchParams} />
        <p className={styles.footerCopy}>
          Use the recovery flow only if you no longer have access to the active admin password.
        </p>
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
