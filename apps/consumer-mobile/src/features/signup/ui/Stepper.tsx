'use client';

import { CheckCircleIcon, ClipboardIcon, HomeIcon, LandmarkIcon, UserIcon } from '@remoola/ui';

import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { useSignupForm } from '../SignupFormContext';
import { useSignupSteps } from '../SignupStepsContext';
import { STEP_ENTITY_LABEL, STEP_NAME, type StepName } from '../stepNames';
import styles from './Stepper.module.css';

const STEP_ICONS: Record<StepName, React.ComponentType<{ size?: number; className?: string }>> = {
  [STEP_NAME.SIGNUP_DETAILS]: ClipboardIcon,
  [STEP_NAME.PERSONAL_DETAILS]: UserIcon,
  [STEP_NAME.ADDRESS_DETAILS]: HomeIcon,
  [STEP_NAME.ORGANIZATION_DETAILS]: LandmarkIcon,
};

export function Stepper() {
  const { steps, currentStep } = useSignupSteps();
  const { isBusiness, isContractorEntity } = useSignupForm();
  const isEntity = isBusiness || isContractorEntity;
  const currentIndex = steps.findIndex((s) => s.name === currentStep);
  const stepCount = steps.length;
  const progressPercentage = Math.round(((currentIndex + 1) / stepCount) * 100);

  return (
    <div className={styles.root} data-testid="consumer-signup-stepper">
      <div className={styles.header}>
        <p className={styles.stepLabel}>
          Step {currentIndex + 1} of {stepCount}
        </p>
        <p className={styles.percentLabel}>{progressPercentage}% complete</p>
      </div>

      <div className={styles.track}>
        <div
          className={styles.bar}
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Signup progress: ${progressPercentage}%`}
        />
      </div>

      <div className={styles.steps}>
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = step.submitted || index < currentIndex;
          const StepIcon = STEP_ICONS[step.name];
          const displayLabel = isEntity && STEP_ENTITY_LABEL[step.name] ? STEP_ENTITY_LABEL[step.name] : step.label;

          return (
            <div
              key={step.name}
              className={styles.step}
              data-testid={`consumer-signup-stepper-step-${step.name.replace(/\s/g, `-`)}`}
              aria-current={isActive ? `step` : undefined}
            >
              {index > 0 ? (
                <div
                  className={`${styles.connector} ${
                    isCompleted || index <= currentIndex ? styles.connectorCompleted : styles.connectorIncomplete
                  }`}
                />
              ) : null}
              <div
                className={`${styles.circle} ${
                  isActive ? styles.circleActive : isCompleted ? styles.circleCompleted : styles.circleDefault
                }`}
              >
                {StepIcon ? (
                  isCompleted && !isActive ? (
                    <CheckCircleIcon size={16} className={styles.icon} />
                  ) : (
                    <StepIcon size={16} className={styles.icon} />
                  )
                ) : isCompleted && !isActive ? (
                  <CheckIcon className={styles.checkIcon} />
                ) : (
                  <span className={styles.stepNumber}>{index + 1}</span>
                )}
              </div>
              <span
                className={`${styles.label} ${
                  isActive ? styles.labelActive : isCompleted ? styles.labelCompleted : styles.labelDefault
                }`}
              >
                {displayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
