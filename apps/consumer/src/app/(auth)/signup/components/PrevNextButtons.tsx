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
  handleNext?: () => void;
  nextLabel?: string;
  handleClick?: () => void;
}

export function PrevNextButtons({
  handleClick: handleClick,
  handleNext: handleNext,
  nextLabel = `Next step`,
}: PrevNextButtonsProps) {
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
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (handleClick) return handleClick();
          if (handleNext) return handleNext();
          return goNext();
        }}
        className={signupNextButton}
      >
        {isLast ? `Finish signup` : nextLabel}
      </button>
    </div>
  );
}
