'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ACCOUNT_TYPE } from '@remoola/api-types';

import { useSignupForm } from './SignupFormContext';
import { getApiBaseUrlOptional } from '../../lib/config.client';
import { clientLogger } from '../../lib/logger';
import { showErrorToast } from '../../lib/toast.client';

export function SignupFormView() {
  const router = useRouter();
  const params = useSearchParams();
  const googleSignupTokenFromUrl = params.get(`googleSignupToken`);
  const {
    signupDetails,
    personalDetails,
    organizationDetails,
    addressDetails,
    updateSignup,
    updatePersonal,
    updateOrganization,
    updateAddress,
    isBusiness,
    isContractorEntity,
    googleSignupToken,
  } = useSignupForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!signupDetails.accountType && !googleSignupTokenFromUrl) {
      router.replace(`/signup/start`);
    } else if (
      signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR &&
      !signupDetails.contractorKind &&
      !googleSignupTokenFromUrl
    ) {
      router.replace(`/signup/start/contractor-kind`);
    }
  }, [signupDetails.accountType, signupDetails.contractorKind, googleSignupTokenFromUrl, router]);

  const token = googleSignupToken ?? googleSignupTokenFromUrl;
  const isGoogleSignup = Boolean(token);

  const buildPayload = () => {
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

    return {
      ...signupForPayload,
      personalDetails: personalPayload,
      organizationDetails: isBusiness || isContractorEntity ? organizationDetails : null,
      addressDetails,
      ...(token ? { googleSignupToken: token } : {}),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = buildPayload();
      const res = await fetch(`/api/signup`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data?.message ?? `Failed to sign up`);
      }
      const json = (await res.json()) as { consumer?: { id?: string } };
      const baseUrl = getApiBaseUrlOptional();
      if (baseUrl && json.consumer?.id) {
        await fetch(`${baseUrl}/consumer/auth/signup/${json.consumer.id}/complete-profile-creation`, {
          credentials: `include`,
        });
      }
      router.push(`/signup/completed`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to sign up. Please try again.`;
      clientLogger.error(`Signup failed`, {
        error: err,
        accountType: signupDetails.accountType,
      });
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`
      mx-auto
      max-w-md
      space-y-6
      p-4
    `}
      data-testid="consumer-signup-flow"
    >
      <form
        onSubmit={handleSubmit}
        className={`
          space-y-4
          rounded-xl
          border
          border-neutral-200
          bg-white
          p-6
          shadow-sm
          dark:border-neutral-700
          dark:bg-neutral-900
        `}
      >
        <h1
          className={`
          text-xl
          font-semibold
          text-neutral-900
          dark:text-white
        `}
        >
          Sign up
        </h1>
        {!isGoogleSignup && (
          <>
            <div>
              <label
                htmlFor="signup-email"
                className={`
                  mb-1
                  block
                  text-sm
                  font-medium
                  text-neutral-700
                  dark:text-neutral-300
                `}
              >
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={signupDetails.email}
                onChange={(e) => updateSignup({ email: e.target.value })}
                className={`input`}
                required
              />
            </div>
            <div>
              <label
                htmlFor="signup-password"
                className={`
                  mb-1
                  block
                  text-sm
                  font-medium
                  text-neutral-700
                  dark:text-neutral-300
                `}
              >
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={signupDetails.password}
                onChange={(e) => updateSignup({ password: e.target.value })}
                className={`input`}
                required={!isGoogleSignup}
              />
            </div>
            <div>
              <label
                htmlFor="signup-confirm"
                className={`
                  mb-1
                  block
                  text-sm
                  font-medium
                  text-neutral-700
                  dark:text-neutral-300
                `}
              >
                Confirm password
              </label>
              <input
                id="signup-confirm"
                type="password"
                value={signupDetails.confirmPassword}
                onChange={(e) => updateSignup({ confirmPassword: e.target.value })}
                className={`input`}
                required={!isGoogleSignup}
              />
            </div>
          </>
        )}
        {isGoogleSignup && signupDetails.email && (
          <p className={`text-sm text-neutral-600 dark:text-neutral-400`}>Signing up with {signupDetails.email}</p>
        )}
        <div>
          <label
            htmlFor="signup-firstName"
            className={`
              mb-1
              block
              text-sm
              font-medium
              text-neutral-700
              dark:text-neutral-300
            `}
          >
            First name
          </label>
          <input
            id="signup-firstName"
            type="text"
            value={personalDetails.firstName}
            onChange={(e) => updatePersonal({ firstName: e.target.value })}
            className={`input`}
          />
        </div>
        <div>
          <label
            htmlFor="signup-lastName"
            className={`
              mb-1
              block
              text-sm
              font-medium
              text-neutral-700
              dark:text-neutral-300
            `}
          >
            Last name
          </label>
          <input
            id="signup-lastName"
            type="text"
            value={personalDetails.lastName}
            onChange={(e) => updatePersonal({ lastName: e.target.value })}
            className={`input`}
          />
        </div>
        {(isBusiness || isContractorEntity) && (
          <div>
            <label
              htmlFor="signup-org-name"
              className={`
                mb-1
                block
                text-sm
                font-medium
                text-neutral-700
                dark:text-neutral-300
              `}
            >
              Organization name
            </label>
            <input
              id="signup-org-name"
              type="text"
              value={organizationDetails.name}
              onChange={(e) => updateOrganization({ name: e.target.value })}
              className={`input`}
            />
          </div>
        )}
        <div>
          <label
            htmlFor="signup-country"
            className={`
              mb-1
              block
              text-sm
              font-medium
              text-neutral-700
              dark:text-neutral-300
            `}
          >
            Country
          </label>
          <input
            id="signup-country"
            type="text"
            value={addressDetails.country}
            onChange={(e) => updateAddress({ country: e.target.value })}
            className={`input`}
          />
        </div>
        <div>
          <label
            htmlFor="signup-street"
            className={`
              mb-1
              block
              text-sm
              font-medium
              text-neutral-700
              dark:text-neutral-300
            `}
          >
            Address
          </label>
          <input
            id="signup-street"
            type="text"
            value={addressDetails.street}
            onChange={(e) => updateAddress({ street: e.target.value })}
            className={`input`}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={
            `min-h-[44px] w-full rounded-lg bg-primary-600 px-4 py-3 font-medium text-white ` +
            `focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50`
          }
        >
          {loading ? `Submitting...` : `Sign up`}
        </button>
      </form>
    </div>
  );
}
