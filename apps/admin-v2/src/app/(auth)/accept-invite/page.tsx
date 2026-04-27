import { TokenPasswordForm } from '../../../features/auth/TokenPasswordForm';
import styles from '../auth-pages.module.css';

export default async function AcceptInvitePage({ searchParams }: { searchParams?: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = params?.token?.trim() ?? ``;

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.eyebrow}>Invite activation</div>
          <h1 className={styles.title}>Accept admin invitation</h1>
          <p className={styles.subtitle}>Set a password to activate the invited Admin v2 account.</p>
        </div>
        <TokenPasswordForm
          token={token}
          submitPath="/api/admin-v2/auth/invitations/accept"
          submitLabel="Accept invitation"
          successRedirectPath="/login"
          successMessage="Invitation accepted. Redirecting to sign in..."
        />
        <p className={styles.footerCopy}>
          After activation, visible workspaces and actions still depend on the invited role and capabilities.
        </p>
      </div>
    </div>
  );
}
