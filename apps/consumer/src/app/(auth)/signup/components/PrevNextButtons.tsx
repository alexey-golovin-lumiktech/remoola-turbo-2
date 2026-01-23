'use client';

import Link from 'next/link';

import { useSignupSteps } from '../hooks';

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
          <button type="button" onClick={goBack} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            ← Prev step
          </button>
        ) : (
          <span />
        )}

        <div className="text-right text-gray-600 dark:text-gray-400">
          <span className="mr-1">Already have an account?</span>
          <Link href="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
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
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-500"
      >
        {isLast ? `Finish signup` : nextLabel}
      </button>
    </div>
  );
}
