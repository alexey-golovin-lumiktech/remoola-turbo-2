'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { getErrorMessageForUser } from '../../../../lib/error-messages';
import { omit } from '../utils';
import {
  addressDetailsSchema,
  createSignupDetailsSchema,
  entityDetailsSchema,
  organizationSchema,
  personalDetailsSchema,
} from '../validation';
import { useSignupForm } from './useSignupForm';

export function useSignupSubmit() {
  const router = useRouter();
  const {
    isBusiness,
    isContractorEntity,
    signupDetails,
    personalDetails,
    organizationDetails,
    addressDetails,
    googleSignupToken,
  } = useSignupForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      const signupDetailsSchemaForContext = createSignupDetailsSchema(Boolean(googleSignupToken));
      const signupResult = signupDetailsSchemaForContext.safeParse(signupDetails);
      if (!signupResult.success) throw new Error(`Please review your account details and try again.`);

      if (isBusiness || isContractorEntity) {
        const entityData = {
          companyName: organizationDetails.name,
          countryOfTaxResidence: personalDetails.countryOfTaxResidence,
          taxId: personalDetails.taxId,
          phoneNumber: personalDetails.phoneNumber,
          legalAddress: addressDetails.street,
        };
        const entityResult = entityDetailsSchema.safeParse(entityData);
        if (!entityResult.success) throw new Error(`Please review your entity details and try again.`);

        const organizationResult = organizationSchema.safeParse(organizationDetails);
        if (!organizationResult.success) throw new Error(`Please review your organization details and try again.`);
      } else {
        const personalResult = personalDetailsSchema.safeParse(personalDetails);
        if (!personalResult.success) throw new Error(`Please review your personal details and try again.`);
      }
      const addressResult = addressDetailsSchema.safeParse(addressDetails);
      if (!addressResult.success) throw new Error(`Please review your address details and try again.`);

      const signupForPayload = googleSignupToken ? omit(signupDetails, `password`, `confirmPassword`) : undefined;
      const payload = {
        ...(signupForPayload ?? signupDetails),
        personalDetails:
          isBusiness || isContractorEntity
            ? {
                citizenOf: personalDetails.countryOfTaxResidence,
                dateOfBirth: `1970-01-01`,
                passportOrIdNumber: personalDetails.taxId || `N/A`,
                countryOfTaxResidence: personalDetails.countryOfTaxResidence,
                taxId: personalDetails.taxId,
                phoneNumber: personalDetails.phoneNumber,
                firstName: null,
                lastName: null,
                legalStatus: null,
              }
            : personalDetails,
        organizationDetails: isBusiness || isContractorEntity ? organizationDetails : null,
        addressDetails,
        ...(googleSignupToken ? { googleSignupToken } : {}),
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
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : `Unknown error`;
      const msg = getErrorMessageForUser(raw, `Failed to sign up. Please try again.`);
      setError(msg);
      toast.error(msg);
      return { success: false, error: raw };
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error };
}
