'use client';

import { SelectWithClear } from '@remoola/ui/SelectWithClear';

import styles from '../../../../../components/ui/classNames.module.css';
import {
  STEP_NAME,
  type ILegalStatusLabel,
  STATUS_LABEL,
  LABEL_STATUS,
  LEGAL_STATUS_LABEL,
} from '../../../../../types';
import { useSignupForm, useSignupSteps } from '../../hooks';
import { PrevNextButtons } from '../PrevNextButtons';

const { formInputFullWidth, signupStepCard, signupStepGrid, signupStepGroup, signupStepLabel, signupStepTitle } =
  styles;

export function PersonalDetailsStep() {
  const { personalDetails: personal, updatePersonal } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();

  const handleSubmit = () => {
    markSubmitted(STEP_NAME.PERSONAL_DETAILS);
    goNext();
  };

  return (
    <div className={signupStepCard}>
      <h1 className={signupStepTitle}>Personal details</h1>

      <div className={signupStepGrid}>
        <div className={signupStepGroup}>
          <label className={signupStepLabel}>First name</label>
          <input
            type="text"
            value={personal.firstName}
            onChange={(e) => updatePersonal({ firstName: e.target.value })}
            className={formInputFullWidth}
          />
        </div>
        <div className={signupStepGroup}>
          <label className={signupStepLabel}>Last name</label>
          <input
            type="text"
            value={personal.lastName}
            onChange={(e) => updatePersonal({ lastName: e.target.value })}
            className={formInputFullWidth}
          />
        </div>
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Citizen of</label>
        <input
          type="text"
          value={personal.citizenOf}
          onChange={(e) => updatePersonal({ citizenOf: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Country of tax residence</label>
        <input
          type="text"
          value={personal.countryOfTaxResidence}
          onChange={(e) => updatePersonal({ countryOfTaxResidence: e.target.value })}
          className={formInputFullWidth}
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

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Tax ID</label>
        <input
          type="text"
          value={personal.taxId}
          onChange={(e) => updatePersonal({ taxId: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Date of birth</label>
        <input
          type="date"
          value={personal.dateOfBirth}
          onChange={(e) => updatePersonal({ dateOfBirth: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Passport/ID number</label>
        <input
          type="text"
          value={personal.passportOrIdNumber}
          onChange={(e) => updatePersonal({ passportOrIdNumber: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Phone number</label>
        <input
          type="tel"
          value={personal.phoneNumber}
          onChange={(e) => updatePersonal({ phoneNumber: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <PrevNextButtons onClick={() => handleSubmit()} />
    </div>
  );
}
