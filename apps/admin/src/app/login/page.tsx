import LoginForm from './LoginForm';

type SP = Record<string, string | string[] | undefined>;

export default async function LoginPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const next = typeof raw == `string` && raw.length > 0 ? decodeURIComponent(raw) : `/`;

  return <LoginForm nextPath={next} />;
}
