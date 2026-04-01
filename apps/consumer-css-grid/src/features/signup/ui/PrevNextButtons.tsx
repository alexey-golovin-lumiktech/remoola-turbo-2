'use client';

import Link from 'next/link';

import { ArrowLeftIcon } from '@remoola/ui';

import { useSignupSteps } from '../SignupStepsContext';
import styles from './PrevNextButtons.module.css';

interface PrevNextButtonsProps {
  onNext: () => void;
  nextLabel?: string;
  hideLoginLink?: boolean;
}

export function PrevNextButtons({ onNext, nextLabel, hideLoginLink = false }: PrevNextButtonsProps) {
  const { goBack, isFirst, isLast } = useSignupSteps();
  const label = nextLabel ?? (isLast ? `Finish signup` : `Next step`);

  return (
    <div className={styles.wrapper} data-testid="consumer-css-grid-signup-prev-next">
      <div className={styles.inner}>
        <button type="button" onClick={onNext} className={styles.nextBtn} data-testid="consumer-css-grid-signup-next">
          {label}
        </button>
        <div className={styles.footer}>
          {!isFirst ? (
            <button
              type="button"
              onClick={goBack}
              className={styles.prevBtn}
              data-testid="consumer-css-grid-signup-prev"
            >
              <ArrowLeftIcon size={16} aria-hidden="true" />
              Back
            </button>
          ) : (
            <span />
          )}
          {!hideLoginLink ? (
            <span className={styles.footerText}>
              Already have an account?{` `}
              <Link href="/login" prefetch={false} className={styles.loginLink}>
                Sign in
              </Link>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
