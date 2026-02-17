'use client';

import { useState } from 'react';

import { ConsumerRoles, type TConsumerRole } from '@remoola/api-types';

import { FormInput, FormSelect } from '../../../../../components/ui';
import styles from '../../../../../components/ui/classNames.module.css';
import {
  STEP_NAME,
  CONSUMER_ROLE_LABEL,
  type TOrganizationSizeLabel,
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
          const consumerRoleOther = consumerRole !== ConsumerRoles.OTHER ? null : organizationDetails.consumerRoleOther;
          updateOrganization({ consumerRole: consumerRole as TConsumerRole, consumerRoleOther });
          clearError(`consumerRole`);
        }}
        options={[
          { value: ConsumerRoles.FOUNDER, label: CONSUMER_ROLE_LABEL[ConsumerRoles.FOUNDER] },
          { value: ConsumerRoles.FINANCE, label: CONSUMER_ROLE_LABEL[ConsumerRoles.FINANCE] },
          { value: ConsumerRoles.MARKETING, label: CONSUMER_ROLE_LABEL[ConsumerRoles.MARKETING] },
          { value: ConsumerRoles.CUSTOMER_SUPPORT, label: CONSUMER_ROLE_LABEL[ConsumerRoles.CUSTOMER_SUPPORT] },
          { value: ConsumerRoles.SALES, label: CONSUMER_ROLE_LABEL[ConsumerRoles.SALES] },
          { value: ConsumerRoles.LEGAL, label: CONSUMER_ROLE_LABEL[ConsumerRoles.LEGAL] },
          { value: ConsumerRoles.HUMAN_RESOURCE, label: CONSUMER_ROLE_LABEL[ConsumerRoles.HUMAN_RESOURCE] },
          { value: ConsumerRoles.OPERATIONS, label: CONSUMER_ROLE_LABEL[ConsumerRoles.OPERATIONS] },
          { value: ConsumerRoles.COMPLIANCE, label: CONSUMER_ROLE_LABEL[ConsumerRoles.COMPLIANCE] },
          { value: ConsumerRoles.PRODUCT, label: CONSUMER_ROLE_LABEL[ConsumerRoles.PRODUCT] },
          { value: ConsumerRoles.ENGINEERING, label: CONSUMER_ROLE_LABEL[ConsumerRoles.ENGINEERING] },
          { value: ConsumerRoles.ANALYSIS_DATA, label: CONSUMER_ROLE_LABEL[ConsumerRoles.ANALYSIS_DATA] },
          { value: ConsumerRoles.OTHER, label: CONSUMER_ROLE_LABEL[ConsumerRoles.OTHER] },
        ]}
        error={fieldErrors.consumerRole}
        onErrorClear={() => clearError(`consumerRole`)}
        placeholder="Select or search role..."
        isClearable
      />
      {organizationDetails.consumerRole === ConsumerRoles.OTHER && (
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
          updateOrganization({ size: LABEL_SIZE[value as TOrganizationSizeLabel] });
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
