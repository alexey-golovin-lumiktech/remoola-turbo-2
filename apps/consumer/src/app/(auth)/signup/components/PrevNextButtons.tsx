'use client';

import Link from 'next/link';

import { useSignupSteps } from '../context/SignupStepsContext';

interface PrevNextButtonsProps {
  onNext?: () => void;
  nextLabel?: string;
  onClick?: () => void;
}

export function PrevNextButtons({ onClick, onNext, nextLabel = `Next step` }: PrevNextButtonsProps) {
  const { goBack, goNext, isFirst, isLast } = useSignupSteps();

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between text-sm">
        {!isFirst ? (
          <button type="button" onClick={goBack} className="text-gray-500 hover:text-gray-700">
            ← Prev step
          </button>
        ) : (
          <span />
        )}

        <div className="text-right text-gray-600">
          <span className="mr-1">Already have an account?</span>
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Log in
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (onClick) return onClick();
          if (onNext) return onNext();
          return goNext();
        }}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {isLast ? `Finish signup` : nextLabel}
      </button>
    </div>
  );
}
