/* eslint-disable max-len */
import { useSignupContext } from './context/hooks';
import { ORGANIZATION_SIZE } from './context/types';

export function OrganizationSizeSelect() {
  const {
    state: { organizationDetails },
    action: { updateOrganizationDetails },
  } = useSignupContext();

  const sizeText = {
    [ORGANIZATION_SIZE.SMALL]: `1-10 team members`,
    [ORGANIZATION_SIZE.MEDIUM]: `11-100 team members`,
    [ORGANIZATION_SIZE.LARGE]: `100+ team members`,
  };

  const OPTIONS = Object.values(ORGANIZATION_SIZE);

  return (
    <div className="flex flex-col w-full">
      <label htmlFor="organizationSize" className="text-sm font-medium text-blue-600 mb-1">
        Organization Size
      </label>
      <select
        id="organizationSize"
        name="organizationSize"
        value={organizationDetails.size}
        onChange={(e) => updateOrganizationDetails(`size`, e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {sizeText[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
