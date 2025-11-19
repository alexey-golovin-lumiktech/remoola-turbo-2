'use client';

import { useState } from 'react';

import { useSignupForm } from './useSignupForm';
import { ACCOUNT_TYPE } from '../types';
import { signupDetailsSchema, personalDetailsSchema, organizationSchema, addressDetailsSchema } from '../validation';

export function useSignupSubmit() {
  const { signupDetails, personalDetails, organizationDetails, addressDetails } = useSignupForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      // validate per step (rough)
      signupDetailsSchema.parse(signupDetails);
      personalDetailsSchema.parse(personalDetails);

      if (signupDetails.accountType === ACCOUNT_TYPE.BUSINESS) {
        organizationSchema.parse(organizationDetails);
      }

      addressDetailsSchema.parse(addressDetails);

      const payload = {
        ...signupDetails,
        personalDetails: personalDetails,
        organizationDetails: signupDetails.accountType === ACCOUNT_TYPE.BUSINESS ? organizationDetails : null,
        addressDetails: addressDetails,
      };

      const response = await fetch(`/api/signup`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Failed to sign up`);
      }
      const json = await response.json();

      const complete = new URL(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/signup/${json.consumer.id}/complete-profile-creation`,
      );
      await fetch(complete);
      window.location.href = `/login`;
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
