'use client';

import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

import styles from '../../../ui/classNames.module.css';

const { primaryActionButton } = styles;
export function VerifyMeButton() {
  const [loading, setLoading] = useState(false);

  async function startVerification() {
    setLoading(true);

    const res = await fetch(`/api/stripe/verify/start`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
    });

    const { clientSecret } = await res.json();

    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

    await stripe!.verifyIdentity(clientSecret);

    setLoading(false);
  }

  return (
    <button onClick={startVerification} disabled={loading} className={primaryActionButton}>
      {loading ? `Starting...` : `Verify Me`}
    </button>
  );
}
