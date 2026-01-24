'use client';

import Link from 'next/link';

import styles from '../../../../components/ui/classNames.module.css';
import { useSignupSteps } from '../hooks';

const {
  signupBackLink,
  signupLoginLink,
  signupLoginPrefix,
  signupLoginText,
  signupNavContainer,
  signupNavRow,
  signupNextButton,
} = styles;

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
