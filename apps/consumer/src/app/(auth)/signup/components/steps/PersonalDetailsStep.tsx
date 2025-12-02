'use client';

import { SelectWithClear } from '@remoola/ui/SelectWithClear';

import {
  STEP_NAME,
  type ILegalStatusLabel,
  STATUS_LABEL,
  LABEL_STATUS,
  LEGAL_STATUS_LABEL,
} from '../../../../../types';
import { useSignupForm, useSignupSteps } from '../../hooks';
import { PrevNextButtons } from '../PrevNextButtons';

export function PersonalDetailsStep() {
  const { personalDetails: personal, updatePersonal } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();

  const handleSubmit = () => {
    markSubmitted(STEP_NAME.PERSONAL_DETAILS);
    goNext();
  };

  return (
    <div className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-lg font-semibold">Personal details</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">First name</label>
          <input
            type="text"
            value={personal.firstName}
            onChange={(e) => updatePersonal({ firstName: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">Last name</label>
          <input
            type="text"
            value={personal.lastName}
            onChange={(e) => updatePersonal({ lastName: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Citizen of</label>
        <input
          type="text"
          value={personal.citizenOf}
          onChange={(e) => updatePersonal({ citizenOf: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Country of tax residence</label>
        <input
          type="text"
          value={personal.countryOfTaxResidence}
          onChange={(e) => updatePersonal({ countryOfTaxResidence: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <SelectWithClear<ILegalStatusLabel | null>
        label="Legal Status"
        value={STATUS_LABEL[personal.legalStatus!]}
        onChange={(statusLabel) => {
          updatePersonal({ legalStatus: LABEL_STATUS[statusLabel!] });
        }}
        options={[
          { label: LEGAL_STATUS_LABEL.INDIVIDUAL, value: LEGAL_STATUS_LABEL.INDIVIDUAL },
          { label: LEGAL_STATUS_LABEL.INDIVIDUAL_ENTREPRENEUR, value: LEGAL_STATUS_LABEL.INDIVIDUAL_ENTREPRENEUR },
          { label: LEGAL_STATUS_LABEL.SOLE_TRADER, value: LEGAL_STATUS_LABEL.SOLE_TRADER },
        ]}
        showNotSelected={false}
      />

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Tax ID</label>
        <input
          type="text"
          value={personal.taxId}
          onChange={(e) => updatePersonal({ taxId: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Date of birth</label>
        <input
          type="date"
          value={personal.dateOfBirth}
          onChange={(e) => updatePersonal({ dateOfBirth: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Passport/ID number</label>
        <input
          type="text"
          value={personal.passportOrIdNumber}
          onChange={(e) => updatePersonal({ passportOrIdNumber: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Phone number</label>
        <input
          type="tel"
          value={personal.phoneNumber}
          onChange={(e) => updatePersonal({ phoneNumber: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <PrevNextButtons onClick={() => handleSubmit()} />
    </div>
  );
}
