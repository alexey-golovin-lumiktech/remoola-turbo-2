'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSignupForm } from './useSignupForm';
import { signupDetailsSchema, personalDetailsSchema, organizationSchema, addressDetailsSchema } from '../validation';

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
      // validate per step (rough)
      signupDetailsSchema.parse(signupDetails);
      personalDetailsSchema.parse(personalDetails);

      if (isBusiness || isContractorEntity) organizationSchema.parse(organizationDetails);
      if (!isBusiness) addressDetailsSchema.parse(addressDetails);

      const payload = {
        ...signupDetails,
        personalDetails: personalDetails,
        organizationDetails: isBusiness || isContractorEntity ? organizationDetails : null,
        addressDetails: isBusiness ? null : addressDetails,
      };

      const response = await fetch(`/api/signup`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify(payload),
        credentials: `include`,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Failed to sign up`);
      }
      const json = await response.json();

      const complete = new URL(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/signup/${json.consumer.id}/complete-profile-creation`,
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
