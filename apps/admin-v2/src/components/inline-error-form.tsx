'use client';

import { useActionState, type ReactNode } from 'react';

import type { FormActionState } from '../lib/admin-mutations/form-action-state';

export function InlineErrorForm({
  action,
  className,
  children,
}: {
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {state.error ? (
        <p className="formError" role="alert">
          {state.error}
        </p>
      ) : null}
      {children}
    </form>
  );
}
