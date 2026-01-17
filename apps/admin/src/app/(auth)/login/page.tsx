import { LoginPageClient } from './LoginPageClient';
import { LoginSkeleton } from './LoginSkeleton';
import { ClientBoundary } from '../../../components';

export default async function LoginPage() {
  return (
    <ClientBoundary fallback={<LoginSkeleton />}>
      <LoginPageClient />
    </ClientBoundary>
  );
}
