'use client';

import { CheckCircleIcon, ClipboardIcon, HomeIcon, LandmarkIcon, UserIcon, UsersIcon } from '@remoola/ui';

import { useSignupSteps } from '../SignupStepsContext';
import { STEP_NAME, type StepName } from '../stepNames';
import styles from './Stepper.module.css';

const STEP_ICONS: Record<StepName, React.ComponentType<{ size?: number; className?: string }>> = {
  [STEP_NAME.SIGNUP_DETAILS]: ClipboardIcon,
  [STEP_NAME.INDIVIDUAL_DETAILS]: UserIcon,
  [STEP_NAME.ENTITY_DETAILS]: LandmarkIcon,
  [STEP_NAME.ADDRESS_DETAILS]: HomeIcon,
  [STEP_NAME.ORGANIZATION_DETAILS]: UsersIcon,
};

export function Stepper() {
  const { steps, currentStep } = useSignupSteps();
  const currentIndex = steps.findIndex((step) => step.name === currentStep);
  const stepCount = steps.length;
  const progressPercentage = Math.round(((currentIndex + 1) / stepCount) * 100);

  return (
    <div className={styles.root} data-testid="consumer-css-grid-signup-stepper">
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
          aria-label={`Signup progress ${progressPercentage}%`}
        />
      </div>
      <div className={styles.steps}>
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = step.submitted || index < currentIndex;
          const StepIcon = STEP_ICONS[step.name];

          return (
            <div
              key={step.name}
              className={`${styles.step} ${
                isActive ? styles.stepActive : isCompleted ? styles.stepCompleted : styles.stepDefault
              }`}
            >
              <div
                className={`${styles.circle} ${
                  isActive ? styles.circleActive : isCompleted ? styles.circleCompleted : styles.circleDefault
                }`}
              >
                {isCompleted && !isActive ? (
                  <CheckCircleIcon size={16} className={styles.icon} />
                ) : (
                  <StepIcon size={16} className={styles.icon} />
                )}
              </div>
              <span
                className={`${styles.label} ${
                  isActive ? styles.labelActive : isCompleted ? styles.labelCompleted : styles.labelDefault
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
