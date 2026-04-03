import { AuthCallbackPageClient } from './AuthCallbackPageClient';

interface AuthCallbackPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuthCallbackPage({ searchParams }: AuthCallbackPageProps) {
  const params = await searchParams;
  const nextParam =
    typeof params.next === `string` ? params.next : Array.isArray(params.next) ? params.next[0] : undefined;
  const oauthHandoff =
    typeof params.oauthHandoff === `string`
      ? params.oauthHandoff
      : Array.isArray(params.oauthHandoff)
        ? (params.oauthHandoff[0] ?? null)
        : null;

  return <AuthCallbackPageClient nextParam={nextParam} oauthHandoff={oauthHandoff} />;
}
