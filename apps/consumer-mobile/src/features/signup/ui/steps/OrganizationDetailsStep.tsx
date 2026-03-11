'use client';

import { useCallback, useState } from 'react';

import { CONSUMER_ROLE, ORGANIZATION_SIZE, type TConsumerRole } from '@remoola/api-types';

import { useSignupForm } from '../../SignupFormContext';
import { useSignupSteps } from '../../SignupStepsContext';
import { STEP_NAME } from '../../stepNames';
import { useSignupSubmit } from '../../useSignupSubmit';
import { getFieldErrors, organizationSchema } from '../../validation';
import { SIGNUP_INPUT_CLASS } from '../inputClass';
import { PrevNextButtons } from '../PrevNextButtons';

/** Role options aligned with consumer app (CONSUMER_ROLE_LABEL). */
const ROLE_OPTIONS: { value: TConsumerRole; label: string }[] = [
  { value: CONSUMER_ROLE.FOUNDER, label: `Founder` },
  { value: CONSUMER_ROLE.FINANCE, label: `Finance` },
  { value: CONSUMER_ROLE.MARKETING, label: `Marketing` },
  { value: CONSUMER_ROLE.CUSTOMER_SUPPORT, label: `Customer support` },
  { value: CONSUMER_ROLE.SALES, label: `Sales` },
  { value: CONSUMER_ROLE.LEGAL, label: `Legal` },
  { value: CONSUMER_ROLE.HUMAN_RESOURCE, label: `Human resource` },
  { value: CONSUMER_ROLE.OPERATIONS, label: `Operations` },
  { value: CONSUMER_ROLE.COMPLIANCE, label: `Compliance` },
  { value: CONSUMER_ROLE.PRODUCT, label: `Product` },
  { value: CONSUMER_ROLE.ENGINEERING, label: `Engineering` },
  { value: CONSUMER_ROLE.ANALYSIS_DATA, label: `Analysis/Data` },
  { value: CONSUMER_ROLE.OTHER, label: `Other` },
];

/** Size display labels aligned with consumer (1-10 / 11-100 / 100+). */
const SIZE_LABEL: Record<(typeof ORGANIZATION_SIZE)[keyof typeof ORGANIZATION_SIZE], string> = {
  [ORGANIZATION_SIZE.SMALL]: `1-10 team members`,
  [ORGANIZATION_SIZE.MEDIUM]: `11-100 team members`,
  [ORGANIZATION_SIZE.LARGE]: `100+ team members`,
};

const SIZE_OPTIONS = [
  { value: SIZE_LABEL[ORGANIZATION_SIZE.SMALL], label: SIZE_LABEL[ORGANIZATION_SIZE.SMALL] },
  { value: SIZE_LABEL[ORGANIZATION_SIZE.MEDIUM], label: SIZE_LABEL[ORGANIZATION_SIZE.MEDIUM] },
  { value: SIZE_LABEL[ORGANIZATION_SIZE.LARGE], label: SIZE_LABEL[ORGANIZATION_SIZE.LARGE] },
] as const;

const LABEL_SIZE: Record<
  (typeof SIZE_OPTIONS)[number][`value`],
  (typeof ORGANIZATION_SIZE)[keyof typeof ORGANIZATION_SIZE]
> = {
  [SIZE_LABEL[ORGANIZATION_SIZE.SMALL]]: ORGANIZATION_SIZE.SMALL,
  [SIZE_LABEL[ORGANIZATION_SIZE.MEDIUM]]: ORGANIZATION_SIZE.MEDIUM,
  [SIZE_LABEL[ORGANIZATION_SIZE.LARGE]]: ORGANIZATION_SIZE.LARGE,
};

export function OrganizationDetailsStep() {
  const { organizationDetails, updateOrganization } = useSignupForm();
  const { markSubmitted } = useSignupSteps();
  const { submit, loading } = useSignupSubmit();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const rest = { ...prev };
      delete rest[field];
      return rest;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const result = organizationSchema.safeParse(organizationDetails);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setFieldErrors({});
    markSubmitted(STEP_NAME.ORGANIZATION_DETAILS);
    submit();
  }, [organizationDetails, markSubmitted, submit]);

  const nextLabel = loading ? `Submitting...` : `Finish signup`;

  const labelClass = `mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300`;
  const errorClass = `mt-1 text-sm text-red-600`;

  return (
    <div
      className={`
      rounded-xl
      border
      border-neutral-200
      bg-white
      shadow-xs
      dark:border-neutral-700
      dark:bg-neutral-900
    `}
    >
      <div className={`p-4 sm:p-6`}>
        <h1
          className={`
          mb-4
          text-lg
          font-semibold
          text-neutral-900
          dark:text-white
        `}
        >
          Organization details
        </h1>
        <div className={`space-y-3`}>
          <div>
            <label htmlFor="od-name" className={labelClass}>
              Organization name
            </label>
            <input
              id="od-name"
              type="text"
              autoComplete="organization"
              placeholder="Your organization"
              value={organizationDetails.name}
              onChange={(e) => updateOrganization({ name: e.target.value })}
              className={SIGNUP_INPUT_CLASS}
              onFocus={() => clearError(`name`)}
              aria-invalid={!!fieldErrors.name || undefined}
              aria-describedby={fieldErrors.name ? `od-name-err` : undefined}
            />
            {fieldErrors.name && (
              <p id="od-name-err" className={errorClass} role="alert">
                {fieldErrors.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="od-role" className={labelClass}>
              Your role in the organization
            </label>
            <select
              id="od-role"
              value={organizationDetails.consumerRole ?? ``}
              onChange={(e) => {
                const consumerRole = (e.target.value || ``) as TConsumerRole;
                const consumerRoleOther =
                  consumerRole !== CONSUMER_ROLE.OTHER ? null : organizationDetails.consumerRoleOther;
                updateOrganization({ consumerRole, consumerRoleOther });
                clearError(`consumerRole`);
              }}
              className={SIGNUP_INPUT_CLASS}
              onFocus={() => clearError(`consumerRole`)}
              aria-invalid={!!fieldErrors.consumerRole || undefined}
              aria-describedby={fieldErrors.consumerRole ? `od-role-err` : undefined}
            >
              <option value="" disabled>
                Select your role...
              </option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldErrors.consumerRole && (
              <p id="od-role-err" className={errorClass} role="alert">
                {fieldErrors.consumerRole}
              </p>
            )}
            {organizationDetails.consumerRole === CONSUMER_ROLE.OTHER && (
              <div className={`mt-3`}>
                <label htmlFor="od-role-other" className={labelClass}>
                  Your role (other)
                </label>
                <input
                  id="od-role-other"
                  type="text"
                  autoComplete="off"
                  placeholder="Please specify"
                  value={organizationDetails.consumerRoleOther ?? ``}
                  onChange={(e) => updateOrganization({ consumerRoleOther: e.target.value })}
                  className={SIGNUP_INPUT_CLASS}
                />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="od-size" className={labelClass}>
              Organization size
            </label>
            <select
              id="od-size"
              value={organizationDetails.size ? (SIZE_LABEL[organizationDetails.size] ?? ``) : ``}
              onChange={(e) => {
                const value = e.target.value;
                updateOrganization({
                  size: value
                    ? (LABEL_SIZE[value as keyof typeof LABEL_SIZE] ?? ORGANIZATION_SIZE.SMALL)
                    : ORGANIZATION_SIZE.SMALL,
                });
                clearError(`size`);
              }}
              className={SIGNUP_INPUT_CLASS}
              onFocus={() => clearError(`size`)}
              aria-invalid={!!fieldErrors.size || undefined}
              aria-describedby={fieldErrors.size ? `od-size-err` : undefined}
            >
              <option value="" disabled>
                Select size...
              </option>
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldErrors.size && (
              <p id="od-size-err" className={errorClass} role="alert">
                {fieldErrors.size}
              </p>
            )}
          </div>
        </div>
      </div>
      <PrevNextButtons onNext={handleSubmit} nextLabel={nextLabel} />
    </div>
  );
}
