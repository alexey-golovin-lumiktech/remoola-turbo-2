import { LoginForm } from '../../../features/auth/LoginForm';

export default function LoginPage({ searchParams }: { searchParams?: Promise<{ sessionExpired?: string }> }) {
  return (
    <div className="loginShell">
      <div className="loginCard">
        <div>
          <h1>Admin v2</h1>
          <p className="muted">MVP-1b surface: Overview, Verification, Consumers and Audit.</p>
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
