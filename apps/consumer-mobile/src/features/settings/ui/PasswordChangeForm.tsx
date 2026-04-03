'use client';

import { useActionState, useState } from 'react';

import { AUTH_NOTICE_QUERY } from '@remoola/api-types';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { submitPostNavigation } from '../../../lib/post-navigation';
import { showErrorToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { updatePasswordAction } from '../actions';
import styles from './PasswordChangeForm.module.css';

export function PasswordChangeForm({ hasPassword }: { hasPassword: boolean }) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const title = hasPassword ? `Change Password` : `Set Password`;
  const description = hasPassword
    ? `Update your password to keep your account secure. Minimum 8 characters.`
    : `You sign in with Google today. Add a password if you also want to sign in with email and password.`;
  const submitLabel = hasPassword ? `Change Password` : `Create Password`;
  const successNotice = hasPassword ? `password_changed` : `password_set`;

  const [, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    setFieldErrors({});
    const result = await updatePasswordAction(formData, hasPassword);

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

    const form = document.getElementById(`password-form`) as HTMLFormElement;
    form?.reset();
    submitPostNavigation(`/logout?${AUTH_NOTICE_QUERY}=${successNotice}`);
    return result;
  }, null);

  return (
    <FormCard title={title} description={description}>
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

        {hasPassword ? (
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
        ) : null}

        <FormField
          label={hasPassword ? `New Password` : `Password`}
          htmlFor="password"
          error={fieldErrors.password}
          required
        >
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
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormCard>
  );
}
