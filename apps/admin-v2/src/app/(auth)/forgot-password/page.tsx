import { ForgotPasswordForm } from '../../../features/auth/ForgotPasswordForm';
import styles from '../auth-pages.module.css';

export default function ForgotPasswordPage() {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.eyebrow}>Recovery flow</div>
          <h1 className={styles.title}>Forgot password?</h1>
          <p className={styles.subtitle}>
            Enter your admin email and we&apos;ll send recovery instructions if an active Admin v2 account exists.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className={styles.footerCopy}>
          For security, the response stays the same whether or not the address is recognized.
        </p>
      </div>
    </div>
  );
}
