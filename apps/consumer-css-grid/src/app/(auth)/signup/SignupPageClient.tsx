'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  ACCOUNT_TYPE,
  CONSUMER_ROLE,
  CONTRACTOR_KIND,
  LEGAL_STATUS,
  ORGANIZATION_SIZE,
  type TAccountType,
  type TConsumerRole,
  type TContractorKind,
  type TLegalStatus,
  type TOrganizationSize,
} from '@remoola/api-types';

import { getAuthErrorMessage } from '../../../lib/auth-error-messages';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
import styles from '../auth-pages.module.css';

type SignupFormState = {
  email: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
  organizationSize: TOrganizationSize;
  consumerRole: TConsumerRole;
  firstName: string;
  lastName: string;
  citizenOf: string;
  dateOfBirth: string;
  legalStatus: TLegalStatus;
  countryOfTaxResidence: string;
  taxId: string;
  passportOrIdNumber: string;
  phoneNumber: string;
  postalCode: string;
  country: string;
  state: string;
  city: string;
  street: string;
};

type SignupSessionPayload = {
  email?: string;
  givenName?: string;
  familyName?: string;
  code?: string;
  message?: string;
};

function parseAccountType(raw: string | null): TAccountType | null {
  return raw === ACCOUNT_TYPE.BUSINESS || raw === ACCOUNT_TYPE.CONTRACTOR ? raw : null;
}

function parseContractorKind(raw: string | null): TContractorKind | null {
  return raw === CONTRACTOR_KIND.ENTITY || raw === CONTRACTOR_KIND.INDIVIDUAL ? raw : null;
}

function initialFormState(): SignupFormState {
  return {
    email: ``,
    password: ``,
    confirmPassword: ``,
    organizationName: ``,
    organizationSize: ORGANIZATION_SIZE.SMALL,
    consumerRole: CONSUMER_ROLE.FOUNDER,
    firstName: ``,
    lastName: ``,
    citizenOf: ``,
    dateOfBirth: ``,
    legalStatus: LEGAL_STATUS.INDIVIDUAL,
    countryOfTaxResidence: ``,
    taxId: ``,
    passportOrIdNumber: ``,
    phoneNumber: ``,
    postalCode: ``,
    country: ``,
    state: ``,
    city: ``,
    street: ``,
  };
}

function titleCaseFromEnum(value: string): string {
  return value
    .toLowerCase()
    .split(`_`)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(` `);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateSignupForm(
  form: SignupFormState,
  accountType: TAccountType,
  contractorKind: TContractorKind | null,
  googleSignupToken: string | null,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.email.trim() || !isEmail(form.email.trim().toLowerCase())) {
    errors.email = `Please enter a valid email address.`;
  }

  if (!googleSignupToken) {
    if (form.password.length < 8) {
      errors.password = `Password must be at least 8 characters.`;
    }
    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = `Passwords do not match.`;
    }
  }

  if (!form.postalCode.trim()) errors.postalCode = `Postal code is required.`;
  if (!form.country.trim()) errors.country = `Country is required.`;
  if (!form.state.trim()) errors.state = `State or region is required.`;
  if (!form.city.trim()) errors.city = `City is required.`;
  if (!form.street.trim()) errors.street = `Street is required.`;

  const needsOrganization = accountType === ACCOUNT_TYPE.BUSINESS || contractorKind === CONTRACTOR_KIND.ENTITY;
  if (needsOrganization && !form.organizationName.trim()) {
    errors.organizationName = `Organization name is required.`;
  }

  const needsPersonal = accountType === ACCOUNT_TYPE.CONTRACTOR && contractorKind === CONTRACTOR_KIND.INDIVIDUAL;
  if (needsPersonal) {
    if (!form.firstName.trim()) errors.firstName = `First name is required.`;
    if (!form.lastName.trim()) errors.lastName = `Last name is required.`;
    if (!form.citizenOf.trim()) errors.citizenOf = `Citizenship is required.`;
    if (!form.countryOfTaxResidence.trim()) errors.countryOfTaxResidence = `Country of tax residence is required.`;
    if (!form.dateOfBirth.trim()) {
      errors.dateOfBirth = `Date of birth is required.`;
    } else if (Number.isNaN(new Date(form.dateOfBirth).getTime())) {
      errors.dateOfBirth = `Please enter a valid date of birth.`;
    }
    if (!form.taxId.trim()) errors.taxId = `Tax ID is required.`;
    if (!form.passportOrIdNumber.trim()) errors.passportOrIdNumber = `Passport or ID number is required.`;
    if (!form.phoneNumber.trim()) errors.phoneNumber = `Phone number is required.`;
  }

  return errors;
}

export function SignupPageClient({
  accountTypeParam,
  contractorKindParam,
  googleSignupToken,
}: {
  accountTypeParam?: string;
  contractorKindParam?: string;
  googleSignupToken: string | null;
}) {
  const router = useRouter();
  const accountType = parseAccountType(accountTypeParam ?? null);
  const contractorKind = parseContractorKind(contractorKindParam ?? null);

  const [form, setForm] = useState<SignupFormState>(() => initialFormState());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [googleSessionError, setGoogleSessionError] = useState<string | undefined>();
  const [googleSessionLoading, setGoogleSessionLoading] = useState(false);

  useEffect(() => {
    const missingAccountType = accountType == null;
    const missingContractorKind = accountType === ACCOUNT_TYPE.CONTRACTOR && contractorKind == null;
    if (missingAccountType || missingContractorKind) {
      router.replace(`/signup/start`);
    }
  }, [accountType, contractorKind, router]);

  useEffect(() => {
    if (!googleSignupToken) return;

    let cancelled = false;
    setGoogleSessionLoading(true);
    setGoogleSessionError(undefined);

    void fetch(`/api/consumer/auth/google/signup-session?token=${encodeURIComponent(googleSignupToken)}`, {
      credentials: `include`,
      cache: `no-store`,
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as SignupSessionPayload;
        if (cancelled) return;
        if (!response.ok) {
          setGoogleSessionError(
            getAuthErrorMessage(data.code ?? data.message, `Could not load your Google sign-up session.`),
          );
          return;
        }

        setForm((current) => ({
          ...current,
          email: data.email ?? current.email,
          firstName: data.givenName ?? current.firstName,
          lastName: data.familyName ?? current.lastName,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setGoogleSessionError(`Could not load your Google sign-up session. Please try again.`);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGoogleSessionLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleSignupToken]);

  const accountLabel = useMemo(() => {
    if (!accountType) return ``;
    if (accountType === ACCOUNT_TYPE.BUSINESS) return `Business`;
    return contractorKind === CONTRACTOR_KIND.ENTITY ? `Contractor Entity` : `Individual Contractor`;
  }, [accountType, contractorKind]);

  const needsOrganization = accountType === ACCOUNT_TYPE.BUSINESS || contractorKind === CONTRACTOR_KIND.ENTITY;
  const needsPersonal = accountType === ACCOUNT_TYPE.CONTRACTOR && contractorKind === CONTRACTOR_KIND.INDIVIDUAL;
  const isGoogleSignup = Boolean(googleSignupToken);
  const emailLocked = isGoogleSignup && form.email.trim().length > 0;

  const setField = <K extends keyof SignupFormState>(key: K, value: SignupFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountType) return;

    setError(undefined);
    const nextFieldErrors = validateSignupForm(form, accountType, contractorKind, googleSignupToken);
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setError(`Please fix the highlighted fields and try again.`);
      return;
    }

    const payload = {
      email: form.email.trim().toLowerCase(),
      ...(isGoogleSignup ? {} : { password: form.password }),
      ...(googleSignupToken ? { googleSignupToken } : {}),
      accountType,
      ...(accountType === ACCOUNT_TYPE.CONTRACTOR && contractorKind ? { contractorKind } : {}),
      howDidHearAboutUs: null,
      howDidHearAboutUsOther: null,
      addressDetails: {
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        street: form.street.trim(),
      },
      ...(needsOrganization
        ? {
            organizationDetails: {
              name: form.organizationName.trim(),
              size: form.organizationSize,
              consumerRole: form.consumerRole,
            },
          }
        : {}),
      ...(needsPersonal
        ? {
            personalDetails: {
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              citizenOf: form.citizenOf.trim(),
              dateOfBirth: form.dateOfBirth,
              legalStatus: form.legalStatus,
              countryOfTaxResidence: form.countryOfTaxResidence.trim(),
              taxId: form.taxId.trim(),
              passportOrIdNumber: form.passportOrIdNumber.trim(),
              phoneNumber: form.phoneNumber.trim(),
            },
          }
        : {}),
    };

    setLoading(true);
    try {
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
        setError(getAuthErrorMessage(data.code ?? data.message, `We could not create your account. Please try again.`));
        return;
      }

      const nextParams = new URLSearchParams();
      if (payload.email) nextParams.set(`email`, payload.email);
      router.push(`/signup/completed?${nextParams.toString()}`);
    } catch {
      setError(`Network error. Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (!accountType || (accountType === ACCOUNT_TYPE.CONTRACTOR && contractorKind == null)) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Finish your sign-up</h1>
          <p className={styles.subtitle}>
            {accountLabel} onboarding with the minimum details required to create your account.
          </p>
        </div>

        <div className={styles.card}>
          <form className={styles.stack} onSubmit={handleSubmit} noValidate>
            {isGoogleSignup ? (
              <div className={styles.mutedBanner}>
                {googleSessionLoading ? (
                  <p>Loading your Google profile...</p>
                ) : googleSessionError ? (
                  <p>{googleSessionError}</p>
                ) : (
                  <p>Your Google account will be used to complete sign-up.</p>
                )}
              </div>
            ) : null}

            <div className={styles.section}>
              <div>
                <h2 className={styles.sectionTitle}>Account details</h2>
                <p className={styles.sectionText}>These details are used to create your Remoola identity.</p>
              </div>

              <div className={styles.grid}>
                <div className={styles.fullWidth}>
                  <label className={styles.label} htmlFor="signup-email">
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => setField(`email`, event.target.value)}
                    className={`input w-full ${fieldErrors.email ? styles.inputError : ``}`}
                    placeholder="you@example.com"
                    disabled={emailLocked}
                    aria-invalid={fieldErrors.email ? true : undefined}
                  />
                  {fieldErrors.email ? <p className={styles.errorText}>{fieldErrors.email}</p> : null}
                </div>

                {!isGoogleSignup ? (
                  <>
                    <div>
                      <label className={styles.label} htmlFor="signup-password">
                        Password
                      </label>
                      <input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(event) => setField(`password`, event.target.value)}
                        className={`input w-full ${fieldErrors.password ? styles.inputError : ``}`}
                        placeholder="At least 8 characters"
                        aria-invalid={fieldErrors.password ? true : undefined}
                      />
                      {fieldErrors.password ? <p className={styles.errorText}>{fieldErrors.password}</p> : null}
                    </div>

                    <div>
                      <label className={styles.label} htmlFor="signup-confirm-password">
                        Confirm password
                      </label>
                      <input
                        id="signup-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={form.confirmPassword}
                        onChange={(event) => setField(`confirmPassword`, event.target.value)}
                        className={`input w-full ${fieldErrors.confirmPassword ? styles.inputError : ``}`}
                        placeholder="Repeat your password"
                        aria-invalid={fieldErrors.confirmPassword ? true : undefined}
                      />
                      {fieldErrors.confirmPassword ? (
                        <p className={styles.errorText}>{fieldErrors.confirmPassword}</p>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {needsOrganization ? (
              <div className={styles.section}>
                <div>
                  <h2 className={styles.sectionTitle}>Organization details</h2>
                  <p className={styles.sectionText}>Required for business accounts and contractor entities.</p>
                </div>

                <div className={styles.grid}>
                  <div className={styles.fullWidth}>
                    <label className={styles.label} htmlFor="signup-organization-name">
                      Organization name
                    </label>
                    <input
                      id="signup-organization-name"
                      value={form.organizationName}
                      onChange={(event) => setField(`organizationName`, event.target.value)}
                      className={`input w-full ${fieldErrors.organizationName ? styles.inputError : ``}`}
                      placeholder="Acme Ltd"
                      aria-invalid={fieldErrors.organizationName ? true : undefined}
                    />
                    {fieldErrors.organizationName ? (
                      <p className={styles.errorText}>{fieldErrors.organizationName}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className={styles.label} htmlFor="signup-organization-size">
                      Organization size
                    </label>
                    <select
                      id="signup-organization-size"
                      value={form.organizationSize}
                      onChange={(event) => setField(`organizationSize`, event.target.value as TOrganizationSize)}
                      className="input w-full"
                    >
                      {Object.values(ORGANIZATION_SIZE).map((value) => (
                        <option key={value} value={value}>
                          {titleCaseFromEnum(value)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={styles.label} htmlFor="signup-consumer-role">
                      Your role
                    </label>
                    <select
                      id="signup-consumer-role"
                      value={form.consumerRole}
                      onChange={(event) => setField(`consumerRole`, event.target.value as TConsumerRole)}
                      className="input w-full"
                    >
                      {Object.values(CONSUMER_ROLE).map((value) => (
                        <option key={value} value={value}>
                          {titleCaseFromEnum(value)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : null}

            {needsPersonal ? (
              <div className={styles.section}>
                <div>
                  <h2 className={styles.sectionTitle}>Personal details</h2>
                  <p className={styles.sectionText}>Required for individual contractor onboarding.</p>
                </div>

                <div className={styles.grid}>
                  <div>
                    <label className={styles.label} htmlFor="signup-first-name">
                      First name
                    </label>
                    <input
                      id="signup-first-name"
                      value={form.firstName}
                      onChange={(event) => setField(`firstName`, event.target.value)}
                      className={`input w-full ${fieldErrors.firstName ? styles.inputError : ``}`}
                    />
                    {fieldErrors.firstName ? <p className={styles.errorText}>{fieldErrors.firstName}</p> : null}
                  </div>

                  <div>
                    <label className={styles.label} htmlFor="signup-last-name">
                      Last name
                    </label>
                    <input
                      id="signup-last-name"
                      value={form.lastName}
                      onChange={(event) => setField(`lastName`, event.target.value)}
                      className={`input w-full ${fieldErrors.lastName ? styles.inputError : ``}`}
                    />
                    {fieldErrors.lastName ? <p className={styles.errorText}>{fieldErrors.lastName}</p> : null}
                  </div>

                  <div>
                    <label className={styles.label} htmlFor="signup-date-of-birth">
                      Date of birth
                    </label>
                    <input
                      id="signup-date-of-birth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(event) => setField(`dateOfBirth`, event.target.value)}
                      className={`input w-full ${fieldErrors.dateOfBirth ? styles.inputError : ``}`}
                    />
                    {fieldErrors.dateOfBirth ? <p className={styles.errorText}>{fieldErrors.dateOfBirth}</p> : null}
                  </div>

                  <div>
                    <label className={styles.label} htmlFor="signup-legal-status">
                      Legal status
                    </label>
                    <select
                      id="signup-legal-status"
                      value={form.legalStatus}
                      onChange={(event) => setField(`legalStatus`, event.target.value as TLegalStatus)}
                      className="input w-full"
                    >
                      {Object.values(LEGAL_STATUS).map((value) => (
                        <option key={value} value={value}>
                          {titleCaseFromEnum(value)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={styles.label} htmlFor="signup-citizen-of">
                      Citizenship
                    </label>
                    <input
                      id="signup-citizen-of"
                      value={form.citizenOf}
                      onChange={(event) => setField(`citizenOf`, event.target.value)}
                      className={`input w-full ${fieldErrors.citizenOf ? styles.inputError : ``}`}
                    />
                    {fieldErrors.citizenOf ? <p className={styles.errorText}>{fieldErrors.citizenOf}</p> : null}
                  </div>

                  <div>
                    <label className={styles.label} htmlFor="signup-country-tax">
                      Country of tax residence
                    </label>
                    <input
                      id="signup-country-tax"
                      value={form.countryOfTaxResidence}
                      onChange={(event) => setField(`countryOfTaxResidence`, event.target.value)}
                      className={`input w-full ${fieldErrors.countryOfTaxResidence ? styles.inputError : ``}`}
                    />
                    {fieldErrors.countryOfTaxResidence ? (
                      <p className={styles.errorText}>{fieldErrors.countryOfTaxResidence}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className={styles.label} htmlFor="signup-tax-id">
                      Tax ID
                    </label>
                    <input
                      id="signup-tax-id"
                      value={form.taxId}
                      onChange={(event) => setField(`taxId`, event.target.value)}
                      className={`input w-full ${fieldErrors.taxId ? styles.inputError : ``}`}
                    />
                    {fieldErrors.taxId ? <p className={styles.errorText}>{fieldErrors.taxId}</p> : null}
                  </div>

                  <div>
                    <label className={styles.label} htmlFor="signup-passport-id">
                      Passport or ID number
                    </label>
                    <input
                      id="signup-passport-id"
                      value={form.passportOrIdNumber}
                      onChange={(event) => setField(`passportOrIdNumber`, event.target.value)}
                      className={`input w-full ${fieldErrors.passportOrIdNumber ? styles.inputError : ``}`}
                    />
                    {fieldErrors.passportOrIdNumber ? (
                      <p className={styles.errorText}>{fieldErrors.passportOrIdNumber}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className={styles.label} htmlFor="signup-phone-number">
                      Phone number
                    </label>
                    <input
                      id="signup-phone-number"
                      value={form.phoneNumber}
                      onChange={(event) => setField(`phoneNumber`, event.target.value)}
                      className={`input w-full ${fieldErrors.phoneNumber ? styles.inputError : ``}`}
                      placeholder="+1 555 123 4567"
                    />
                    {fieldErrors.phoneNumber ? <p className={styles.errorText}>{fieldErrors.phoneNumber}</p> : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.section}>
              <div>
                <h2 className={styles.sectionTitle}>Address details</h2>
                <p className={styles.sectionText}>These details are required for every new account.</p>
              </div>

              <div className={styles.grid}>
                <div>
                  <label className={styles.label} htmlFor="signup-country">
                    Country
                  </label>
                  <input
                    id="signup-country"
                    value={form.country}
                    onChange={(event) => setField(`country`, event.target.value)}
                    className={`input w-full ${fieldErrors.country ? styles.inputError : ``}`}
                  />
                  {fieldErrors.country ? <p className={styles.errorText}>{fieldErrors.country}</p> : null}
                </div>

                <div>
                  <label className={styles.label} htmlFor="signup-postal-code">
                    Postal code
                  </label>
                  <input
                    id="signup-postal-code"
                    value={form.postalCode}
                    onChange={(event) => setField(`postalCode`, event.target.value)}
                    className={`input w-full ${fieldErrors.postalCode ? styles.inputError : ``}`}
                  />
                  {fieldErrors.postalCode ? <p className={styles.errorText}>{fieldErrors.postalCode}</p> : null}
                </div>

                <div>
                  <label className={styles.label} htmlFor="signup-state">
                    State or region
                  </label>
                  <input
                    id="signup-state"
                    value={form.state}
                    onChange={(event) => setField(`state`, event.target.value)}
                    className={`input w-full ${fieldErrors.state ? styles.inputError : ``}`}
                  />
                  {fieldErrors.state ? <p className={styles.errorText}>{fieldErrors.state}</p> : null}
                </div>

                <div>
                  <label className={styles.label} htmlFor="signup-city">
                    City
                  </label>
                  <input
                    id="signup-city"
                    value={form.city}
                    onChange={(event) => setField(`city`, event.target.value)}
                    className={`input w-full ${fieldErrors.city ? styles.inputError : ``}`}
                  />
                  {fieldErrors.city ? <p className={styles.errorText}>{fieldErrors.city}</p> : null}
                </div>

                <div className={styles.fullWidth}>
                  <label className={styles.label} htmlFor="signup-street">
                    Street address
                  </label>
                  <input
                    id="signup-street"
                    value={form.street}
                    onChange={(event) => setField(`street`, event.target.value)}
                    className={`input w-full ${fieldErrors.street ? styles.inputError : ``}`}
                  />
                  {fieldErrors.street ? <p className={styles.errorText}>{fieldErrors.street}</p> : null}
                </div>
              </div>
            </div>

            {error ? (
              <div className={styles.errorBanner} role="alert">
                <p className={styles.errorMessage}>{error}</p>
              </div>
            ) : null}

            <div className={styles.actions}>
              <Link href="/signup/start" prefetch={false} className={styles.secondaryBtn}>
                Back
              </Link>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? (
                  <span className={styles.spinnerRow}>
                    <SpinnerIcon className="h-4 w-4 animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  `Create account`
                )}
              </button>
            </div>
          </form>
        </div>

        <p className={styles.footer}>
          Already have an account?{` `}
          <Link href="/login" prefetch={false} className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
