import { TokenPasswordForm } from '../../../features/auth/TokenPasswordForm';

export default async function AcceptInvitePage({ searchParams }: { searchParams?: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = params?.token?.trim() ?? ``;

  return (
    <div className="loginShell">
      <div className="loginCard">
        <div>
          <h1>Accept admin invitation</h1>
          <p className="muted">Set a password to activate the invited Admin v2 account.</p>
        </div>
        <TokenPasswordForm
          token={token}
          submitPath="/api/admin-v2/auth/invitations/accept"
          submitLabel="Accept invitation"
          successRedirectPath="/login"
          successMessage="Invitation accepted. Redirecting to sign in..."
        />
      </div>
    </div>
  );
}
