'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSignupForm } from './useSignupForm';
import { addressDetailsSchema, organizationSchema, personalDetailsSchema, signupDetailsSchema } from '../validation';

export function useSignupSubmit() {
  const router = useRouter();
  const { isBusiness, isContractorEntity, signupDetails, personalDetails, organizationDetails, addressDetails } =
    useSignupForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      const signupResult = signupDetailsSchema.safeParse(signupDetails);
      if (!signupResult.success) throw new Error(`Please review your account details and try again.`);

      const personalResult = personalDetailsSchema.safeParse(personalDetails);
      if (!personalResult.success) throw new Error(`Please review your personal details and try again.`);

      if (isBusiness || isContractorEntity) {
        const organizationResult = organizationSchema.safeParse(organizationDetails);
        if (!organizationResult.success) throw new Error(`Please review your organization details and try again.`);
      }
      if (!isBusiness) {
        const addressResult = addressDetailsSchema.safeParse(addressDetails);
        if (!addressResult.success) throw new Error(`Please review your address details and try again.`);
      }

      const payload = {
        ...signupDetails,
        personalDetails: personalDetails,
        organizationDetails: isBusiness || isContractorEntity ? organizationDetails : null,
        addressDetails: isBusiness ? null : addressDetails,
      };

      const response = await fetch(`/api/signup`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Failed to sign up`);
      }
      const json = await response.json();

      const complete = new URL(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/auth/signup/${json.consumer.id}/complete-profile-creation`,
      );
      await fetch(complete);
      router.push(`/signup/completed`);
    } catch (e: any) {
      setError(e.message ?? `Unknown error`);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error };
}
