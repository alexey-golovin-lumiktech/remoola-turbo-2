'use client';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext } from './context/hooks';

export default function OrganizationDetails() {
  const {
    state: { organizationDetails },
    action: { updateOrganizationDetails, nextStep, prevStep },
  } = useSignupContext();

  return (
    <form onSubmit={(e) => (e.preventDefault(), nextStep())}>
      <Input
        type="text"
        placeholder="Organization name"
        value={organizationDetails.name}
        onChange={(e) => updateOrganizationDetails(`name`, e.target.value)}
        required
      />
      <div className="mt-3" />
      <Input
        type="text"
        placeholder="Organization Size"
        value={organizationDetails.size}
        onChange={(e) => updateOrganizationDetails(`size`, e.target.value)}
        required
      />
      <div className="mt-3" />
      <Input
        type="text"
        placeholder="Your Role"
        value={organizationDetails.consumerRole}
        onChange={(e) => updateOrganizationDetails(`consumerRole`, e.target.value)}
        required
      />
      <div className="flex gap-2 mt-6">
        <Button variant="primary" onClick={prevStep} className="w-1/2">
          Back
        </Button>
        <Button type="submit" className="w-1/2">
          Next
        </Button>
      </div>
    </form>
  );
}
