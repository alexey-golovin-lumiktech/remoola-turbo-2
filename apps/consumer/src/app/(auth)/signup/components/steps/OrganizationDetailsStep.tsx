/* eslint-disable max-len */
'use client';

import { SelectWithClear } from '@remoola/ui/SelectWithClear';

import { useSignupSteps } from '../../context/SignupStepsContext';
import { useSignupForm } from '../../hooks/useSignupForm';
import { type IOrganizationSizeLabel, SIZE_LABEL, LABEL_SIZE, type IConsumerRole, CONSUMER_ROLE } from '../../types';
import { STEP_NAME } from '../../types/step.types';
import { PrevNextButtons } from '../PrevNextButtons';

export function OrganizationDetailsStep() {
  const { organizationDetails: organization, updateOrganization } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();

  const handleSubmit = () => {
    markSubmitted(STEP_NAME.ORGANIZATION_DETAILS);
    goNext();
  };

  return (
    <div className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow-sm">
      {/* <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg border bg-white p-6 shadow-sm"> */}
      <h1 className="mb-2 text-lg font-semibold">Organization details</h1>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Organization name</label>
        <input
          type="text"
          value={organization.name}
          onChange={(e) => updateOrganization({ name: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <SelectWithClear<IConsumerRole>
        label="Your Role In Organization"
        value={organization.consumerRole}
        onChange={(consumerRole) => {
          const consumerRoleOther = consumerRole !== `Other` ? null : organization.consumerRoleOther;
          updateOrganization({ consumerRole, consumerRoleOther });
        }}
        options={[
          { label: CONSUMER_ROLE.FOUNDER, value: CONSUMER_ROLE.FOUNDER },
          { label: CONSUMER_ROLE.FINANCE, value: CONSUMER_ROLE.FINANCE },
          { label: CONSUMER_ROLE.MARKETING, value: CONSUMER_ROLE.MARKETING },
          { label: CONSUMER_ROLE.CUSTOMER_SUPPORT, value: CONSUMER_ROLE.CUSTOMER_SUPPORT },
          { label: CONSUMER_ROLE.SALES, value: CONSUMER_ROLE.SALES },
          { label: CONSUMER_ROLE.LEGAL, value: CONSUMER_ROLE.LEGAL },
          { label: CONSUMER_ROLE.HUMAN_RESOURCE, value: CONSUMER_ROLE.HUMAN_RESOURCE },
          { label: CONSUMER_ROLE.OPERATIONS, value: CONSUMER_ROLE.OPERATIONS },
          { label: CONSUMER_ROLE.COMPLIANCE, value: CONSUMER_ROLE.COMPLIANCE },
          { label: CONSUMER_ROLE.PRODUCT, value: CONSUMER_ROLE.PRODUCT },
          { label: CONSUMER_ROLE.ENGINEERING, value: CONSUMER_ROLE.ENGINEERING },
          { label: CONSUMER_ROLE.ANALYSIS_DATA, value: CONSUMER_ROLE.ANALYSIS_DATA },
        ]}
        showOtherField
        showNotSelected={false}
        otherValue={organization.consumerRoleOther}
        onChangeOther={(consumerRoleOther) => updateOrganization({ consumerRoleOther })}
      />

      <SelectWithClear<IOrganizationSizeLabel>
        label="Your Organization Size"
        value={SIZE_LABEL[organization.size!]}
        onChange={(size) => updateOrganization({ size: LABEL_SIZE[size!] })}
        options={[
          { label: `1-10 team members`, value: `1-10 team members` },
          { label: `11-100 team members`, value: `11-100 team members` },
          { label: `100+ team members`, value: `100+ team members` },
        ]}
        showOtherField={false}
        showNotSelected={false}
      />
      <PrevNextButtons onClick={() => handleSubmit()} />
      {/* </form> */}
    </div>
  );
}
