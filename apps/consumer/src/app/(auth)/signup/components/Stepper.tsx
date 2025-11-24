'use client';

import { useSignupSteps } from '../hooks';

export function Stepper() {
  const { steps, currentStep } = useSignupSteps();
  const currentIndex = steps.findIndex((s) => s.name === currentStep);

  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto mt-5 mb-8 gap-3">
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = step.submitted || index < currentIndex;

        return (
          <div key={step.name} className="flex flex-col items-center flex-1 text-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm transition
                ${isActive ? `border-blue-600 bg-blue-600 text-white` : ``}
                ${isCompleted ? `border-green-600 bg-green-600 text-white` : ``}
                ${!isActive && !isCompleted ? `border-gray-300 text-gray-500` : ``}`}
            >
              {isCompleted ? `✓` : index + 1}
            </div>

            <span
              className={`mt-2 text-[11px] leading-tight
                ${isActive ? `font-semibold text-blue-600` : `text-gray-600`}`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
