'use client';

import styles from '../../../../components/ui/classNames.module.css';
import { useSignupSteps } from '../hooks';

const {
  stepperCircleActive,
  stepperCircleBase,
  stepperCircleComplete,
  stepperCircleInactive,
  stepperContainer,
  stepperItem,
  stepperLabelActive,
  stepperLabelBase,
  stepperLabelInactive,
} = styles;

export function Stepper() {
  const { steps, currentStep } = useSignupSteps();
  const currentIndex = steps.findIndex((s) => s.name === currentStep);

  return (
    <div className={stepperContainer}>
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = step.submitted || index < currentIndex;

        return (
          <div key={step.name} className={stepperItem}>
            <div
              className={`${stepperCircleBase} ${isActive ? stepperCircleActive : ``} ${
                isCompleted ? stepperCircleComplete : ``
              } ${!isActive && !isCompleted ? stepperCircleInactive : ``}`}
            >
              {isCompleted ? `✓` : index + 1}
            </div>

            <span className={`${stepperLabelBase} ${isActive ? stepperLabelActive : stepperLabelInactive}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
