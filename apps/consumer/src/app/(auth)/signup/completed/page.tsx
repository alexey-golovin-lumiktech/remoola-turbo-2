'use client';

import Link from 'next/link';

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
          <svg className={signupCompletedIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className={signupCompletedTitle}>Congratulations. Sign up success.</h1>

        <h2 className={signupCompletedSubtitle}>
          Welcome to <span className={signupCompletedBrand}>Remoola</span>
        </h2>

        <p className={signupCompletedText}>
          We have sent you an email so that you can confirm your email and activate your account.
          <br />
          Check your email and come back soon.
        </p>

        <Link href="/login" className={signupCompletedButton} data-testid="consumer-signup-completed-link-login">
          Click to Sign In
        </Link>
      </div>
    </div>
  );
}
