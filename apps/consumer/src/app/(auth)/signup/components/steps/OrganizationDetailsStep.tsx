'use client';

import { useState } from 'react';

import { FormInput, FormSelect } from '../../../../../components/ui';
import styles from '../../../../../components/ui/classNames.module.css';
import {
  STEP_NAME,
  type IConsumerRole,
  CONSUMER_ROLE,
  CONSUMER_ROLE_LABEL,
  type IOrganizationSizeLabel,
  SIZE_LABEL,
  LABEL_SIZE,
} from '../../../../../types';
import { useSignupForm, useSignupSteps, useSignupSubmit } from '../../hooks';
import { getFieldErrors, organizationSchema } from '../../validation';
import { PrevNextButtons } from '../PrevNextButtons';

const { errorTextClass, signupStepCard, signupStepTitle } = styles;

export function OrganizationDetailsStep() {
  const { isBusiness, isContractorEntity, organizationDetails, updateOrganization } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const { submit, loading, error } = useSignupSubmit();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => {
      const { [field]: _ignored, ...rest } = prev; /* eslint-disable-line */
      return rest;
    });
  };

  const handleSubmit = () => {
    const result = organizationSchema.safeParse(organizationDetails);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }

    setFieldErrors({});
    markSubmitted(STEP_NAME.ORGANIZATION_DETAILS);
    if (isBusiness || isContractorEntity) return submit();
    return goNext();
  };

  let prevNextButtonsText = `Next step`;
  if (isBusiness || isContractorEntity) prevNextButtonsText = `Finish signup`;

  return (
    <div className={signupStepCard}>
      <h1 className={signupStepTitle}>Organization details</h1>

      <FormInput
        label="Organization name"
        value={organizationDetails.name}
        onChange={(value) => updateOrganization({ name: value })}
        error={fieldErrors.name}
        onErrorClear={() => clearError(`name`)}
      />

      <FormSelect
        label="Your Role In Organization"
        value={organizationDetails.consumerRole ?? ``}
        onChange={(consumerRole) => {
          const consumerRoleOther = consumerRole !== CONSUMER_ROLE.OTHER ? null : organizationDetails.consumerRoleOther;
          updateOrganization({ consumerRole: consumerRole as IConsumerRole, consumerRoleOther });
          clearError(`consumerRole`);
        }}
        options={[
          { value: CONSUMER_ROLE.FOUNDER, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.FOUNDER] },
          { value: CONSUMER_ROLE.FINANCE, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.FINANCE] },
          { value: CONSUMER_ROLE.MARKETING, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.MARKETING] },
          { value: CONSUMER_ROLE.CUSTOMER_SUPPORT, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.CUSTOMER_SUPPORT] },
          { value: CONSUMER_ROLE.SALES, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.SALES] },
          { value: CONSUMER_ROLE.LEGAL, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.LEGAL] },
          { value: CONSUMER_ROLE.HUMAN_RESOURCE, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.HUMAN_RESOURCE] },
          { value: CONSUMER_ROLE.OPERATIONS, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.OPERATIONS] },
          { value: CONSUMER_ROLE.COMPLIANCE, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.COMPLIANCE] },
          { value: CONSUMER_ROLE.PRODUCT, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.PRODUCT] },
          { value: CONSUMER_ROLE.ENGINEERING, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.ENGINEERING] },
          { value: CONSUMER_ROLE.ANALYSIS_DATA, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.ANALYSIS_DATA] },
          { value: CONSUMER_ROLE.OTHER, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.OTHER] },
        ]}
        error={fieldErrors.consumerRole}
        onErrorClear={() => clearError(`consumerRole`)}
        placeholder="Select or search role..."
        isClearable
      />
      {organizationDetails.consumerRole === CONSUMER_ROLE.OTHER && (
        <FormInput
          label="Your role (other)"
          value={organizationDetails.consumerRoleOther ?? ``}
          onChange={(consumerRoleOther) => updateOrganization({ consumerRoleOther })}
        />
      )}

      <FormSelect
        label="Your Organization Size"
        value={SIZE_LABEL[organizationDetails.size!] ?? ``}
        onChange={(value) => {
          updateOrganization({ size: LABEL_SIZE[value as IOrganizationSizeLabel] });
          clearError(`size`);
        }}
        options={[
          { value: `1-10 team members`, label: `1-10 team members` },
          { value: `11-100 team members`, label: `11-100 team members` },
          { value: `100+ team members`, label: `100+ team members` },
        ]}
        error={fieldErrors.size}
        onErrorClear={() => clearError(`size`)}
        placeholder="Select or search size..."
        isClearable
      />

      {error && <p className={errorTextClass}>{error}</p>}

      <PrevNextButtons nextLabel={loading ? `Submitting...` : prevNextButtonsText} handleClick={() => handleSubmit()} />
    </div>
  );
}
