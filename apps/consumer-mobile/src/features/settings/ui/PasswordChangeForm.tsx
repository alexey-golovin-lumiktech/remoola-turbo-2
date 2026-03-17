'use client';

import { useActionState, useState } from 'react';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { updatePasswordAction } from '../actions';
import styles from './PasswordChangeForm.module.css';

export function PasswordChangeForm() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    setFieldErrors({});
    const result = await updatePasswordAction(formData);

    if (!result.ok) {
      if (result.error.fields) {
        setFieldErrors(result.error.fields);
      }
      showErrorToast(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.PASSWORD_CHANGE_FAILED)),
        { code: result.error.code },
      );
      return result;
    }

    showSuccessToast(`Password changed successfully`);
    const form = document.getElementById(`password-form`) as HTMLFormElement;
    form?.reset();
    return result;
  }, null);

  return (
    <FormCard
      title="Change Password"
      description="Update your password to keep your account secure. Minimum 8 characters."
    >
      <form id="password-form" action={formAction} className={styles.form}>
        <input
          type="text"
          autoComplete="username"
          value=""
          readOnly
          aria-hidden="true"
          tabIndex={-1}
          className={styles.hiddenInput}
        />

        <FormField label="Current Password" htmlFor="currentPassword" error={fieldErrors.currentPassword} required>
          <FormInput
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            error={!!fieldErrors.currentPassword}
            placeholder="Enter your current password"
            required
            className={styles.inputMinHeight}
          />
        </FormField>

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
            className={styles.inputMinHeight}
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
            className={styles.inputMinHeight}
          />
        </FormField>

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending}
            className={styles.submitBtn}
          >
            {isPending ? `Changing...` : `Change Password`}
          </Button>
        </div>
      </form>
    </FormCard>
  );
}
