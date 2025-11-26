import LoginForm from './LoginForm';

type SP = Record<string, string | string[] | undefined>;

export default async function LoginPage({ searchParams }: { searchParams: Promise<SP> }) {
  const search = await searchParams;
  const raw = Array.isArray(search.next) ? search.next[0] : search.next;
  const next = typeof raw == `string` && raw.length > 0 ? decodeURIComponent(raw) : `/dashboard`;

  return <LoginForm nextPath={next} />;
}
