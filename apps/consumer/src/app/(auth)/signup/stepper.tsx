import { useState } from 'react';

import { useSignupContext, ACCOUNT_TYPE } from './context/signup';

export function Stepper() {
  const {
    state: { accountType, step: current },
    action: { manualChangeStep },
  } = useSignupContext();

  const initial = [
    {
      submitted: false,
      step: 2,
      label: `signup details`,
    },
    {
      step: 3,
      submitted: false,
      label: `personal details`,
    },
    {
      step: 4,
      submitted: false,
      label: accountType === ACCOUNT_TYPE.BUSINESS ? `organization details` : `address details`,
    },
  ];

  const [steps, setSteps] = useState(initial);

  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto mt-4 mb-8">
      {steps.map((step) => {
        const isActive = step.step === current;
        const isCompleted = step.step < current;

        return (
          <div
            onClick={() => manualChangeStep(step.step)}
            className="flex flex-row items-center justify-center flex-1"
            key={step.label}
          >
            <div
              className={`
                flex items-center justify-center p-3 w-4 h-4 rounded-full border
                transition
                ${isActive ? `border-blue-600 bg-blue-600 text-white` : ``}
                ${isCompleted ? `border-green-500 bg-green-500 text-white` : ``}
                ${!isActive && !isCompleted ? `border-gray-300 text-gray-500` : ``}
              `}
            >
              {isCompleted ? `✓` : step.step - 1}
            </div>

            <span className={`ml-2 text-sm capitalize ${isActive ? `text-blue-600 font-medium` : `text-gray-500`}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
