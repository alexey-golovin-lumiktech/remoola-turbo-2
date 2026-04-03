'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ACCOUNT_TYPE } from '@remoola/api-types';

import { useSignupForm } from './SignupFormContext';
import styles from './SignupFormView.module.css';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../lib/error-messages';
import { clientLogger } from '../../lib/logger';
import { showErrorToast } from '../../lib/toast.client';

export function SignupFormView() {
  const router = useRouter();
  const params = useSearchParams();
  const googleSignupTokenFromUrl = params.get(`googleSignup`) ?? params.get(`googleSignupHandoff`);
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
        const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
        const msg = getErrorMessageForUser(
          data.code,
          data.message ?? getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR),
        );
        showErrorToast(msg, data.code ? { code: data.code } : undefined);
        setLoading(false);
        return;
      }
      await res.json().catch(() => null);
      router.push(`/signup/completed`);
    } catch (err) {
      clientLogger.error(`Signup failed`, {
        error: err,
        accountType: signupDetails.accountType,
      });
      showErrorToast(getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root} data-testid="consumer-signup-flow">
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.title}>Sign up</h1>
        {!isGoogleSignup ? (
          <>
            <div>
              <label htmlFor="signup-email" className={styles.label}>
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={signupDetails.email}
                onChange={(e) => updateSignup({ email: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-password" className={styles.label}>
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={signupDetails.password}
                onChange={(e) => updateSignup({ password: e.target.value })}
                className="input"
                required={!isGoogleSignup}
              />
            </div>
            <div>
              <label htmlFor="signup-confirm" className={styles.label}>
                Confirm password
              </label>
              <input
                id="signup-confirm"
                type="password"
                value={signupDetails.confirmPassword}
                onChange={(e) => updateSignup({ confirmPassword: e.target.value })}
                className="input"
                required={!isGoogleSignup}
              />
            </div>
          </>
        ) : null}
        {isGoogleSignup && signupDetails.email ? (
          <p className={styles.googleNote}>Signing up with {signupDetails.email}</p>
        ) : null}
        <div>
          <label htmlFor="signup-firstName" className={styles.label}>
            First name
          </label>
          <input
            id="signup-firstName"
            type="text"
            value={personalDetails.firstName}
            onChange={(e) => updatePersonal({ firstName: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="signup-lastName" className={styles.label}>
            Last name
          </label>
          <input
            id="signup-lastName"
            type="text"
            value={personalDetails.lastName}
            onChange={(e) => updatePersonal({ lastName: e.target.value })}
            className="input"
          />
        </div>
        {isBusiness || isContractorEntity ? (
          <div>
            <label htmlFor="signup-org-name" className={styles.label}>
              Organization name
            </label>
            <input
              id="signup-org-name"
              type="text"
              value={organizationDetails.name}
              onChange={(e) => updateOrganization({ name: e.target.value })}
              className="input"
            />
          </div>
        ) : null}
        <div>
          <label htmlFor="signup-country" className={styles.label}>
            Country
          </label>
          <input
            id="signup-country"
            type="text"
            value={addressDetails.country}
            onChange={(e) => updateAddress({ country: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="signup-street" className={styles.label}>
            Address
          </label>
          <input
            id="signup-street"
            type="text"
            value={addressDetails.street}
            onChange={(e) => updateAddress({ street: e.target.value })}
            className="input"
          />
        </div>
        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? `Submitting...` : `Sign up`}
        </button>
      </form>
    </div>
  );
}
