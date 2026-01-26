'use client';

import { SelectWithClear } from '@remoola/ui/SelectWithClear';

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
import { PrevNextButtons } from '../PrevNextButtons';

const { errorTextClass, formInputFullWidth, signupStepCard, signupStepGroup, signupStepLabel, signupStepTitle } =
  styles;

export function OrganizationDetailsStep() {
  const { isBusiness, isContractorEntity, organizationDetails, updateOrganization } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const { submit, loading, error } = useSignupSubmit();

  const handleSubmit = () => {
    markSubmitted(STEP_NAME.ORGANIZATION_DETAILS);
    if (isBusiness || isContractorEntity) return submit();
    else return goNext();
  };

  let prevNextButtonsText = `Next step`;
  if (isBusiness || isContractorEntity) prevNextButtonsText = `Finish signup`;

  return (
    <div className={signupStepCard}>
      <h1 className={signupStepTitle}>Organization details</h1>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Organization name</label>
        <input
          type="text"
          value={organizationDetails.name}
          onChange={(e) => updateOrganization({ name: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <SelectWithClear<IConsumerRole | null>
        label="Your Role In Organization"
        value={organizationDetails.consumerRole}
        onChange={(consumerRole) => {
          const consumerRoleOther = consumerRole !== CONSUMER_ROLE.OTHER ? null : organizationDetails.consumerRoleOther;
          updateOrganization({ consumerRole, consumerRoleOther });
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
        showNotSelected={false}
        otherValue={organizationDetails.consumerRoleOther}
        onChangeOther={(consumerRoleOther) => updateOrganization({ consumerRoleOther })}
      />

      <SelectWithClear<IOrganizationSizeLabel>
        label="Your Organization Size"
        value={SIZE_LABEL[organizationDetails.size!]}
        onChange={(size) => updateOrganization({ size: LABEL_SIZE[size!] })}
        options={[
          { label: `1-10 team members`, value: `1-10 team members` },
          { label: `11-100 team members`, value: `11-100 team members` },
          { label: `100+ team members`, value: `100+ team members` },
        ]}
        showOtherField={false}
        showNotSelected={false}
      />

      {error && <p className={errorTextClass}>{error}</p>}

      <PrevNextButtons nextLabel={loading ? `Submitting...` : prevNextButtonsText} onClick={() => handleSubmit()} />
    </div>
  );
}
