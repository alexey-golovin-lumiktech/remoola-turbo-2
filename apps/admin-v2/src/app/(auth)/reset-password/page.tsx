import { TokenPasswordForm } from '../../../features/auth/TokenPasswordForm';
import styles from '../auth-pages.module.css';

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = params?.token?.trim() ?? ``;

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reset admin password</h1>
          <p className={styles.subtitle}>Choose a new password to complete the Admin v2 recovery flow.</p>
        </div>
        <TokenPasswordForm
          token={token}
          submitPath="/api/admin-v2/auth/password/reset"
          submitLabel="Reset password"
          successRedirectPath="/login"
          successMessage="Password updated. Redirecting to sign in..."
        />
      </div>
    </div>
  );
}
