/* eslint-disable max-len */
'use client';

import { SelectWithClear } from '@remoola/ui/SelectWithClear';

import { type IOrganizationSizeLabel, LABEL_SIZE, SIZE_LABEL } from '../../context/signup';
import { useSignupSteps } from '../../context/SignupStepsContext';
import { useSignupForm } from '../../hooks/useSignupForm';
import { STEP_NAME } from '../../types/step.types';
import { PrevNextButtons } from '../PrevNextButtons';

export function OrganizationStep() {
  const { organization, updateOrganization } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();

  const handleSubmit = () => {
    markSubmitted(STEP_NAME.ORGANIZATION);
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

      <SelectWithClear<string>
        label="Your Role In Organization"
        value={organization.consumerRole}
        onChange={(consumerRole) => {
          const consumerRoleOther = consumerRole !== `Other` ? null : organization.consumerRoleOther;
          updateOrganization({ consumerRole, consumerRoleOther });
        }}
        options={[
          { label: `Founder`, value: `Founder` },
          { label: `Finance`, value: `Finance` },
          { label: `Marketing`, value: `Marketing` },
          { label: `Customer Support`, value: `Customer Support` },
          { label: `Sales`, value: `Sales` },
          { label: `Legal`, value: `Legal` },
          { label: `Human Resource`, value: `Human Resource` },
          { label: `Operations`, value: `Operations` },
          { label: `Compliance`, value: `Compliance` },
          { label: `Product`, value: `Product` },
          { label: `Engineering`, value: `Engineering` },
          { label: `Analysis Data`, value: `Analysis Data` },
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
