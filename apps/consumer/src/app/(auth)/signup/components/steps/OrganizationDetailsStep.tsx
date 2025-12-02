'use client';

import { SelectWithClear } from '@remoola/ui/SelectWithClear';

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
    <div className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-lg font-semibold">Organization details</h1>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Organization name</label>
        <input
          type="text"
          value={organizationDetails.name}
          onChange={(e) => updateOrganization({ name: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <PrevNextButtons nextLabel={loading ? `Submitting...` : prevNextButtonsText} onClick={() => handleSubmit()} />
    </div>
  );
}
