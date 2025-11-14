'use client';

import { useState } from 'react';

import { useSignupForm } from './useSignupForm';
import { ACCOUNT_TYPE } from '../types/account.types';
import { addressSchema } from '../validation/address.schema';
import { organizationSchema } from '../validation/organization.schema';
import { personalSchema } from '../validation/personal.schema';
import { signupSchema } from '../validation/signup.schema';

interface SubmitResult {
  success: boolean;
  error?: string;
}

export function useSignupSubmit() {
  const { signup, personal, organization, address } = useSignupForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<SubmitResult> => {
    setLoading(true);
    setError(null);

    try {
      // validate per step (rough)
      signupSchema.parse(signup);
      personalSchema.parse(personal);

      if (signup.accountType === ACCOUNT_TYPE.BUSINESS) {
        organizationSchema.parse(organization);
      }

      addressSchema.parse(address);

      const payload = {
        signup,
        personal,
        organization: signup.accountType === ACCOUNT_TYPE.BUSINESS ? organization : null,
        address,
      };

      const res = await fetch(`/api/consumer/signup`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Failed to sign up`);
      }

      return { success: true };
    } catch (e: any) {
      setError(e.message ?? `Unknown error`);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error };
}
