'use client';

import { type ChangeEvent } from 'react';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext } from './context/hooks';
import { CONSUMER_ROLE } from './context/types';
import { CustomSelect as ConsumerRoleSelect } from './custom-select';
import { OrganizationSizeSelect } from './organization-size-select';

export default function OrganizationDetails() {
  const {
    state: { organizationDetails, consumerId },
    action: { updateOrganizationDetails, setError, setLoading },
  } = useSignupContext();

  const handleChangeOrganizationDetails = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    updateOrganizationDetails(e.target.name as Parameters<typeof updateOrganizationDetails>[0], e.target.value);
  };

  const submitOrganizationDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/signup/${consumerId}/organization-details`);
      const response = await fetch(url, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        body: JSON.stringify({
          name: organizationDetails.name,
          consumerRole: organizationDetails.consumerRole,
          size: organizationDetails.size,
        }),
      });
      if (!response.ok) throw new Error(`Signup failed`);
      const json = await response.json();
      const complete = new URL(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/signup/${consumerId}/complete-profile-creation`,
      );
      await fetch(complete);
      console.log(`submitOrganizationDetails json`, json);
      window.location.href = `/login`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
