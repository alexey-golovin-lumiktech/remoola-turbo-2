'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AUTH_RATE_LIMIT_MESSAGE } from '@remoola/api-types';

import { buildSignupPayload } from './payload';
import { useSignupForm } from './SignupFormContext';
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
      const payload = buildSignupPayload({
        signupDetails,
        personalDetails,
        organizationDetails,
        addressDetails,
        googleSignupToken,
        isBusiness,
        isContractorEntity,
      });

      const res = await fetch(`/api/signup`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 429) {
          showErrorToast(AUTH_RATE_LIMIT_MESSAGE);
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
        const msg = getErrorMessageForUser(
          data.code,
          data.message ?? getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR),
        );
        showErrorToast(msg, data.code ? { code: data.code } : undefined);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as {
        consumer?: { id?: string };
        next?: string;
      };

      if (token) {
        router.push(typeof json.next === `string` && json.next.length > 0 ? json.next : `/dashboard`);
        return;
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
