'use client';

import Link from 'next/link';

import {
  signupBackLink,
  signupLoginLink,
  signupLoginPrefix,
  signupLoginText,
  signupNavContainer,
  signupNavRow,
  signupNextButton,
} from '../../../../components/ui/classNames';
import { useSignupSteps } from '../hooks';

interface PrevNextButtonsProps {
  onNext?: () => void;
  nextLabel?: string;
  onClick?: () => void;
}

export function PrevNextButtons({ onClick, onNext, nextLabel = `Next step` }: PrevNextButtonsProps) {
  const { goBack, goNext, isFirst, isLast } = useSignupSteps();

  return (
    <div className={signupNavContainer}>
      <div className={signupNavRow}>
        {!isFirst ? (
          <button type="button" onClick={goBack} className={signupBackLink}>
            ← Prev step
          </button>
        ) : (
          <span />
        )}

        <div className={signupLoginText}>
          <span className={signupLoginPrefix}>Already have an account?</span>
          <Link href="/login" className={signupLoginLink}>
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
        className={signupNextButton}
      >
        {isLast ? `Finish signup` : nextLabel}
      </button>
    </div>
  );
}
