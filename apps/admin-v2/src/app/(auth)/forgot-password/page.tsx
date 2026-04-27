import { ForgotPasswordForm } from '../../../features/auth/ForgotPasswordForm';
import styles from '../auth-pages.module.css';

export default function ForgotPasswordPage() {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Forgot password?</h1>
          <p className={styles.subtitle}>
            Enter your admin email and we&apos;ll send recovery instructions if an active Admin v2 account exists.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
