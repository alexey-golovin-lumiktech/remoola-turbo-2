'use client';

import { useActionState, useState } from 'react';
import { toast } from 'sonner';

import { CONSUMER_ROLE } from '@remoola/api-types';

import { Button } from '../../../shared/ui/Button';
import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { updateOrganizationDetailsAction } from '../actions';
import { type Profile } from '../schemas';

interface OrganizationDetailsFormProps {
  profile: Profile;
}

const CONSUMER_ROLE_OPTIONS = [
  { value: CONSUMER_ROLE.FOUNDER, label: `Founder/CEO` },
  { value: CONSUMER_ROLE.FINANCE, label: `Finance` },
  { value: CONSUMER_ROLE.MARKETING, label: `Marketing` },
  { value: CONSUMER_ROLE.CUSTOMER_SUPPORT, label: `Customer Support` },
  { value: CONSUMER_ROLE.SALES, label: `Sales` },
  { value: CONSUMER_ROLE.LEGAL, label: `Legal` },
  { value: CONSUMER_ROLE.HUMAN_RESOURCE, label: `Human Resources` },
  { value: CONSUMER_ROLE.OPERATIONS, label: `Operations` },
  { value: CONSUMER_ROLE.COMPLIANCE, label: `Compliance` },
  { value: CONSUMER_ROLE.PRODUCT, label: `Product` },
  { value: CONSUMER_ROLE.ENGINEERING, label: `Engineering` },
  { value: CONSUMER_ROLE.ANALYSIS_DATA, label: `Data/Analysis` },
  { value: CONSUMER_ROLE.OTHER, label: `Other` },
];

const SIZE_OPTIONS = [
  { value: `SMALL`, label: `1-10 team members` },
  { value: `MEDIUM`, label: `11-100 team members` },
  { value: `LARGE`, label: `100+ team members` },
];

export function OrganizationDetailsForm({ profile }: OrganizationDetailsFormProps) {
  const org = profile.organizationDetails ?? {};
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showOtherRole, setShowOtherRole] = useState(org.consumerRole === CONSUMER_ROLE.OTHER);

  const [, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    setFieldErrors({});
    const result = await updateOrganizationDetailsAction(formData);

    if (!result.ok) {
      if (result.error.fields) {
        setFieldErrors(result.error.fields);
      }
      toast.error(result.error.message);
      return result;
    }

    toast.success(`Organization details updated successfully`);
    return result;
  }, null);

  return (
    <FormCard title="Organization Details" description="Information about your organization">
      <form action={formAction} className={`space-y-5`}>
        <FormField label="Organization Name" htmlFor="name" error={fieldErrors.name}>
          <FormInput
            id="name"
            name="name"
            type="text"
            defaultValue={org.name ?? ``}
            error={!!fieldErrors.name}
            placeholder="Your company name"
            className={`min-h-11`}
          />
        </FormField>

        <FormField label="Your Role" htmlFor="consumerRole" error={fieldErrors.consumerRole}>
          <FormSelect
            id="consumerRole"
            name="consumerRole"
            options={CONSUMER_ROLE_OPTIONS}
            defaultValue={org.consumerRole ?? ``}
            error={!!fieldErrors.consumerRole}
            placeholder="Select your role"
            className={`min-h-11`}
            onChange={(e) => setShowOtherRole(e.currentTarget.value === CONSUMER_ROLE.OTHER)}
          />
        </FormField>

        {showOtherRole && (
          <FormField label="Please Specify Your Role" htmlFor="consumerRoleOther" error={fieldErrors.consumerRoleOther}>
            <FormInput
              id="consumerRoleOther"
              name="consumerRoleOther"
              type="text"
              defaultValue={org.consumerRoleOther ?? ``}
              error={!!fieldErrors.consumerRoleOther}
              placeholder="Your role"
              className={`min-h-11`}
            />
          </FormField>
        )}

        <FormField label="Organization Size" htmlFor="size" error={fieldErrors.size}>
          <FormSelect
            id="size"
            name="size"
            options={SIZE_OPTIONS}
            defaultValue={org.size ?? ``}
            error={!!fieldErrors.size}
            placeholder="Select organization size"
            className={`min-h-11`}
          />
        </FormField>

        <div className={`flex justify-end pt-2`}>
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending}
            className={`
              min-h-11
              shadow-lg
              shadow-primary-500/30
              hover:shadow-xl
              hover:shadow-primary-500/40
            `}
          >
            {isPending ? `Saving...` : `Save Changes`}
          </Button>
        </div>
      </form>
    </FormCard>
  );
}
