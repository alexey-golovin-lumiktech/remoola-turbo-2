import { Suspense } from 'react';

import { ResetPasswordConfirmForm } from '../../../../features/auth/ui/ResetPasswordConfirmForm';

export default function ForgotPasswordConfirmPage() {
  return (
    <Suspense fallback={<p className="p-4 text-slate-600 dark:text-slate-400">Loading…</p>}>
      <ResetPasswordConfirmForm />
    </Suspense>
  );
}
