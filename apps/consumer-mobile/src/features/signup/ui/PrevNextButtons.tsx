'use client';

import Link from 'next/link';

import { useSignupSteps } from '../SignupStepsContext';

interface PrevNextButtonsProps {
  onNext: () => void;
  nextLabel?: string;
}

export function PrevNextButtons({ onNext, nextLabel }: PrevNextButtonsProps) {
  const { goBack, isFirst, isLast } = useSignupSteps();
  const label = nextLabel ?? (isLast ? `Finish signup` : `Next step`);

  return (
    <div
      className={
        `border-t border-neutral-100 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 ` +
        `backdrop-blur sm:px-6 dark:border-neutral-800 dark:bg-neutral-900/95`
      }
      data-testid="consumer-signup-prev-next"
    >
      <div className={`space-y-3`}>
        <button
          type="button"
          data-testid="consumer-signup-btn-next"
          onClick={onNext}
          className={
            `min-h-[44px] w-full rounded-xl bg-primary-600 px-4 py-3 font-semibold text-white ` +
            `hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ` +
            `disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600`
          }
        >
          {label}
        </button>
        <div
          className={`
          flex
          flex-wrap
          items-center
          justify-between
          gap-2
        `}
        >
          {!isFirst ? (
            <button
              type="button"
              onClick={goBack}
              className={
                `text-sm font-medium text-slate-600 underline hover:text-slate-900 ` +
                `dark:text-slate-400 dark:hover:text-white`
              }
              data-testid="consumer-signup-btn-prev"
            >
              ← Prev step
            </button>
          ) : (
            <span />
          )}
          <span className={`text-sm text-slate-500 dark:text-slate-400`}>
            Already have an account?{` `}
            <Link
              href="/login"
              className={`font-medium text-primary-600 underline`}
              data-testid="consumer-signup-link-login"
            >
              Log in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
