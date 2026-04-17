import { LoginForm } from '../../../features/auth/LoginForm';

export default function LoginPage({ searchParams }: { searchParams?: Promise<{ sessionExpired?: string }> }) {
  return (
    <div className="loginShell">
      <div className="loginCard">
        <div>
          <h1>Admin v2</h1>
          <p className="muted">
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
  return <p className="errorText">Your session expired. Please sign in again.</p>;
}
