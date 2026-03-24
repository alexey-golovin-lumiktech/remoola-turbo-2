'use client';

import Link from 'next/link';

import { CheckCircleIcon } from '@remoola/ui';

import styles from '../../../../components/ui/classNames.module.css';

const {
  signupCompletedButton,
  signupCompletedCard,
  signupCompletedContainer,
  signupCompletedIcon,
  signupCompletedIconWrap,
  signupCompletedSubtitle,
  signupCompletedText,
  signupCompletedTitle,
  signupCompletedBrand,
} = styles;

export default function SignupCompletedPage() {
  return (
    <div className={signupCompletedContainer} data-testid="consumer-signup-completed-page">
      <div className={signupCompletedCard}>
        <div className={signupCompletedIconWrap}>
          <CheckCircleIcon className={signupCompletedIcon} aria-hidden="true" />
        </div>

        <h1 className={signupCompletedTitle}>Sign-up complete</h1>

        <p className={signupCompletedSubtitle}>
          Welcome to <span className={signupCompletedBrand}>Remoola</span>
        </p>

        <p className={signupCompletedText}>
          We have sent you an email so you can confirm your address and activate your account.
          <br />
          Check your email and come back soon.
        </p>

        <Link href="/login" className={signupCompletedButton} data-testid="consumer-signup-completed-link-login">
          Continue to Sign In
        </Link>
      </div>
    </div>
  );
}
