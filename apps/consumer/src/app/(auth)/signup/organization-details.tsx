'use client';

import { type ChangeEvent } from 'react';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext, CONSUMER_ROLE } from './context/signup';
import { CustomSelect as ConsumerRoleSelect } from './custom-select';
import { OrganizationSizeSelect } from './organization-size-select';

export default function OrganizationDetails() {
  const {
    state: { organizationDetails },
    action: { updateOrganizationDetails, submitSignup },
  } = useSignupContext();

  const handleChangeOrganizationDetails = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    updateOrganizationDetails(e.target.name as Parameters<typeof updateOrganizationDetails>[0], e.target.value);
  };

  const submitOrganizationDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    submitSignup();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center mb-2">Submit your organization details</h1>
      <h5 style={{ textAlign: `center` }}>
        Please provide your Organization information accurately, it will be used in all your communications on the
        platform
      </h5>

      <form
        className="flex flex-col items-center justify-center w-1/2" //
        onSubmit={submitOrganizationDetails}
      >
        <Input
          type="text"
          placeholder="Organization name"
          value={organizationDetails.name}
          name="name"
          onChange={handleChangeOrganizationDetails}
          required
        />
        <div className="mt-3" />
        <OrganizationSizeSelect />
        <div className="mt-3" />
        <ConsumerRoleSelect
          name="consumerRole"
          value={organizationDetails.consumerRole}
          onChange={handleChangeOrganizationDetails}
          options={Object.values(CONSUMER_ROLE)}
          label="Consumer Role"
          defaultEmpty
        />
        <div className="flex gap-2 mt-6 w-full">
          <Button type="submit" className="w-full">
            Submit organization details
          </Button>
        </div>
      </form>
    </div>
  );
}
