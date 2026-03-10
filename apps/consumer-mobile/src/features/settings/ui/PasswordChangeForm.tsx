'use client';

import { useActionState, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../../../shared/ui/Button';
import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { updatePasswordAction } from '../actions';

export function PasswordChangeForm() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    setFieldErrors({});
    const result = await updatePasswordAction(formData);

    if (!result.ok) {
      if (result.error.fields) {
        setFieldErrors(result.error.fields);
      }
      toast.error(result.error.message);
      return result;
    }

    toast.success(`Password changed successfully`);
    const form = document.getElementById(`password-form`) as HTMLFormElement;
    form?.reset();
    return result;
  }, null);

  return (
    <FormCard
      title="Change Password"
      description="Update your password to keep your account secure. Minimum 8 characters."
    >
      <form id="password-form" action={formAction} className={`space-y-5`}>
        <input
          type="text"
          autoComplete="username"
          value=""
          readOnly
          aria-hidden="true"
          tabIndex={-1}
          className={`
            absolute
            left-[-9999px]
            h-px
            w-px
            opacity-0
          `}
        />

        <FormField label="New Password" htmlFor="password" error={fieldErrors.password} required>
          <FormInput
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            error={!!fieldErrors.password}
            placeholder="At least 8 characters"
            minLength={8}
            required
            className={`min-h-11`}
          />
        </FormField>

        <FormField label="Confirm Password" htmlFor="confirmPassword" error={fieldErrors.confirmPassword} required>
          <FormInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            error={!!fieldErrors.confirmPassword}
            placeholder="Re-enter new password"
            minLength={8}
            required
            className={`min-h-11`}
          />
        </FormField>

        <div className={`flex justify-end pt-2`}>
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending}
            className={`
              min-h-11
              shadow-lg
              shadow-primary-500/30
              hover:shadow-xl
              hover:shadow-primary-500/40
            `}
          >
            {isPending ? `Changing...` : `Change Password`}
          </Button>
        </div>
      </form>
    </FormCard>
  );
}
