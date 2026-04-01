'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { buildSignupPayload } from './payload';
import { useSignupForm } from './SignupFormContext';
import { getAuthErrorMessage } from '../../lib/auth-error-messages';

export function useSignupSubmit() {
  const router = useRouter();
  const { state } = useSignupForm();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const payload = buildSignupPayload(state);
      const response = await fetch(`/api/signup`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as {
        code?: string;
        message?: string;
        consumer?: { id?: string };
      };

      if (!response.ok) {
        return {
          ok: false as const,
          message: getAuthErrorMessage(
            data.code ?? data.message,
            `We could not create your account. Please try again.`,
          ),
        };
      }

      const nextParams = new URLSearchParams();
      if (payload.email) {
        nextParams.set(`email`, payload.email);
      }
      router.push(`/signup/completed?${nextParams.toString()}`);
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: `Network error. Please check your connection and try again.`,
      };
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading };
}
