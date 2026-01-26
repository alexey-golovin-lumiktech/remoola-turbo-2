'use client';

import styles from '../../../../../components/ui/classNames.module.css';
import { STEP_NAME } from '../../../../../types';
import { useSignupForm, useSignupSteps, useSignupSubmit } from '../../hooks';
import { PrevNextButtons } from '../PrevNextButtons';

const { errorTextClass, formInputFullWidth, signupStepCard, signupStepGroup, signupStepLabel, signupStepTitle } =
  styles;

export function AddressDetailsStep() {
  const { isContractorIndividual, addressDetails, updateAddress } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const { submit, loading, error } = useSignupSubmit();

  const handleSubmit = () => {
    markSubmitted(STEP_NAME.ADDRESS_DETAILS);

    if (isContractorIndividual) return submit();
    else return goNext();
  };

  let prevNextButtonsText = `Next step`;
  if (isContractorIndividual) prevNextButtonsText = `Finish signup`;

  return (
    <div className={signupStepCard}>
      <h1 className={signupStepTitle}>Address details</h1>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Postal code</label>
        <input
          type="text"
          value={addressDetails.postalCode || ``}
          onChange={(e) => updateAddress({ postalCode: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Country</label>
        <input
          type="text"
          value={addressDetails.country || ``}
          onChange={(e) => updateAddress({ country: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>State / Region</label>
        <input
          type="text"
          value={addressDetails.state || ``}
          onChange={(e) => updateAddress({ state: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>City</label>
        <input
          type="text"
          value={addressDetails.city || ``}
          onChange={(e) => updateAddress({ city: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Street</label>
        <input
          type="text"
          value={addressDetails.street || ``}
          onChange={(e) => updateAddress({ street: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      {error && <p className={errorTextClass}>{error}</p>}

      <PrevNextButtons nextLabel={loading ? `Submitting...` : prevNextButtonsText} handleClick={() => handleSubmit()} />
    </div>
  );
}
