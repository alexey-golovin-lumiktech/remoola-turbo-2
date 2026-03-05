'use client';

import { CheckCircleIcon, ClipboardIcon, HomeIcon, LandmarkIcon, UserIcon } from '@remoola/ui';

import { useSignupForm } from '../SignupFormContext';
import { useSignupSteps } from '../SignupStepsContext';
import { STEP_ENTITY_LABEL, STEP_NAME, type StepName } from '../stepNames';

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
    <div className="mb-2" data-testid="consumer-signup-stepper">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Step {currentIndex + 1} of {stepCount}
        </p>
        <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">{progressPercentage}% complete</p>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Signup progress: ${progressPercentage}%`}
        />
      </div>

      <div className="flex justify-between gap-1">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = step.submitted || index < currentIndex;
          const StepIcon = STEP_ICONS[step.name];
          const displayLabel = isEntity && STEP_ENTITY_LABEL[step.name] ? STEP_ENTITY_LABEL[step.name] : step.label;

          return (
            <div
              key={step.name}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-1"
              data-testid={`consumer-signup-stepper-step-${step.name.replace(/\s/g, `-`)}`}
              aria-current={isActive ? `step` : undefined}
            >
              {index > 0 && (
                <div
                  className={`absolute left-0 right-1/2 top-3.5 -z-10 h-0.5 transition-colors duration-300 ${
                    isCompleted || index <= currentIndex
                      ? `bg-green-400 dark:bg-green-600`
                      : `bg-neutral-200 dark:bg-neutral-700`
                  }`}
                />
              )}
              <div
                className={
                  `relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ` +
                  (isActive
                    ? `scale-110 bg-primary-600 text-white shadow-lg ring-2 ring-primary-200 ring-offset-2 dark:ring-primary-900/50`
                    : isCompleted
                      ? `bg-green-500 text-white shadow-md dark:bg-green-600`
                      : `bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400`)
                }
              >
                {StepIcon ? (
                  isCompleted && !isActive ? (
                    <CheckCircleIcon size={16} className="shrink-0" />
                  ) : (
                    <StepIcon size={16} className="shrink-0" />
                  )
                ) : isCompleted && !isActive ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              <span
                className={
                  `w-full truncate text-center text-[11px] leading-tight transition-colors duration-200 ` +
                  (isActive
                    ? `font-bold text-primary-700 dark:text-primary-300`
                    : isCompleted
                      ? `font-medium text-green-700 dark:text-green-400`
                      : `text-neutral-500 dark:text-neutral-500`)
                }
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
