'use client';

import { useCallback, useState } from 'react';

import { CONSUMER_ROLE, ORGANIZATION_SIZE } from '@remoola/api-types';

import { useSignupForm } from '../../SignupFormContext';
import { useSignupSteps } from '../../SignupStepsContext';
import { useSignupSubmit } from '../../useSignupSubmit';
import { getFieldErrors, organizationDetailsSchema } from '../../validation';
import { SIGNUP_INPUT_CLASS } from '../inputClass';
import { PrevNextButtons } from '../PrevNextButtons';

export function OrganizationDetailsStep() {
  const { organizationDetails, updateOrganization } = useSignupForm();
  const { markSubmitted } = useSignupSteps();
  const { submit, loading } = useSignupSubmit();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(async () => {
    const result = organizationDetailsSchema.safeParse(organizationDetails);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }

    setFieldErrors({});
    markSubmitted(`organization_details`);
    await submit();
  }, [markSubmitted, organizationDetails, submit]);

  return (
    <div className="overflow-hidden rounded-[28px]">
      <div className="grid gap-8 border-b border-slate-100 px-6 py-6 dark:border-slate-800 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] lg:px-8">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
              Final step
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Organization details
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Complete the organization metadata used for business and contractor entity onboarding.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="organization-name"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Organization name
              </label>
              <input
                id="organization-name"
                value={organizationDetails.name}
                onChange={(event) => updateOrganization({ name: event.target.value })}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.name ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              />
              {fieldErrors.name ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.name}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="organization-role"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Your role
              </label>
              <select
                id="organization-role"
                value={organizationDetails.consumerRole ?? ``}
                onChange={(event) =>
                  updateOrganization({ consumerRole: event.target.value as typeof organizationDetails.consumerRole })
                }
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.consumerRole ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              >
                <option value="">Select your role…</option>
                {Object.values(CONSUMER_ROLE).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {fieldErrors.consumerRole ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.consumerRole}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="organization-size"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Organization size
              </label>
              <select
                id="organization-size"
                value={organizationDetails.size ?? ``}
                onChange={(event) =>
                  updateOrganization({ size: event.target.value as typeof organizationDetails.size })
                }
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.size ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              >
                <option value="">Select size…</option>
                {Object.values(ORGANIZATION_SIZE).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {fieldErrors.size ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.size}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">Submit behavior</p>
            <p className="mt-2 leading-6">
              This step builds the final payload adapter for `BUSINESS` and `CONTRACTOR + ENTITY`, then triggers signup.
            </p>
          </div>
        </div>
      </div>

      <PrevNextButtons
        onNext={() => void handleSubmit()}
        nextLabel={loading ? `Creating account...` : `Create account`}
      />
    </div>
  );
}
