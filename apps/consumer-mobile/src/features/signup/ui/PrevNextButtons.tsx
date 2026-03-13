'use client';

import Link from 'next/link';

import { useSignupSteps } from '../SignupStepsContext';
import styles from './PrevNextButtons.module.css';

interface PrevNextButtonsProps {
  onNext: () => void;
  nextLabel?: string;
  hideLoginLink?: boolean;
}

export function PrevNextButtons({ onNext, nextLabel, hideLoginLink }: PrevNextButtonsProps) {
  const { goBack, isFirst, isLast } = useSignupSteps();
  const label = nextLabel ?? (isLast ? `Finish signup` : `Next step`);

  return (
    <div className={styles.wrapper} data-testid="consumer-signup-prev-next">
      <div className={styles.inner}>
        <button type="button" data-testid="consumer-signup-btn-next" onClick={onNext} className={styles.nextBtn}>
          {label}
        </button>
        <div className={styles.footer}>
          {!isFirst ? (
            <button type="button" onClick={goBack} className={styles.prevBtn} data-testid="consumer-signup-btn-prev">
              ← Prev step
            </button>
          ) : (
            <span />
          )}
          {!hideLoginLink && (
            <span className={styles.footerText}>
              Already have an account?{` `}
              <Link
                href="/login"
                prefetch={false}
                className={styles.loginLink}
                data-testid="consumer-signup-link-login"
              >
                Log in
              </Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
