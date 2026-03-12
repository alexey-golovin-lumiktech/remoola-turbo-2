'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSignupForm } from './SignupFormContext';
import { getApiBaseUrlOptional } from '../../lib/config.client';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../lib/error-messages';
import { showErrorToast } from '../../lib/toast.client';

export function useSignupSubmit() {
  const router = useRouter();
  const {
    signupDetails,
    personalDetails,
    organizationDetails,
    addressDetails,
    isBusiness,
    isContractorEntity,
    googleSignupToken,
  } = useSignupForm();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const token = googleSignupToken;
      const isGoogleSignup = Boolean(token);
      const signupForPayload = isGoogleSignup
        ? {
            email: signupDetails.email,
            accountType: signupDetails.accountType,
            contractorKind: signupDetails.contractorKind,
            howDidHearAboutUs: signupDetails.howDidHearAboutUs,
            howDidHearAboutUsOther: signupDetails.howDidHearAboutUsOther,
          }
        : signupDetails;

      const personalPayload =
        isBusiness || isContractorEntity
          ? {
              citizenOf: personalDetails.countryOfTaxResidence,
              dateOfBirth: personalDetails.dateOfBirth || `1970-01-01`,
              passportOrIdNumber: personalDetails.taxId || `N/A`,
              countryOfTaxResidence: personalDetails.countryOfTaxResidence,
              taxId: personalDetails.taxId,
              phoneNumber: personalDetails.phoneNumber,
              firstName: null,
              lastName: null,
              legalStatus: personalDetails.legalStatus,
            }
          : personalDetails;

      const payload = {
        ...signupForPayload,
        personalDetails: personalPayload,
        organizationDetails: isBusiness || isContractorEntity ? organizationDetails : null,
        addressDetails,
        ...(token ? { googleSignupToken: token } : {}),
      };

      const res = await fetch(`/api/signup`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
        const msg = getErrorMessageForUser(
          data.code,
          data.message ?? getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR),
        );
        showErrorToast(msg, data.code ? { code: data.code } : undefined);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as { consumer?: { id?: string } };
      const baseUrl = getApiBaseUrlOptional();
      if (baseUrl && json.consumer?.id) {
        await fetch(`${baseUrl}/consumer/auth/signup/${json.consumer.id}/complete-profile-creation`, {
          credentials: `include`,
        });
      }
      router.push(`/signup/completed`);
    } catch {
      showErrorToast(getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR));
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading };
}
