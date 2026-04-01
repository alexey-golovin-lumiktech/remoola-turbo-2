import { AuthCallbackPageClient } from './AuthCallbackPageClient';

interface AuthCallbackPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuthCallbackPage({ searchParams }: AuthCallbackPageProps) {
  const params = await searchParams;
  const nextParam =
    typeof params.next === `string` ? params.next : Array.isArray(params.next) ? params.next[0] : undefined;
  const oauthToken =
    typeof params.oauthToken === `string`
      ? params.oauthToken
      : Array.isArray(params.oauthToken)
        ? (params.oauthToken[0] ?? null)
        : null;

  return <AuthCallbackPageClient nextParam={nextParam} oauthToken={oauthToken} />;
}
