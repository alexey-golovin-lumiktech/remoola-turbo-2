'use client';

import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

export function VerifyMeButton() {
  const [loading, setLoading] = useState(false);

  async function startVerification() {
    setLoading(true);

    const res = await fetch(`/api/stripe/verify/start`, {
      method: `POST`,
      credentials: `include`,
    });

    const { clientSecret } = await res.json();

    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

    await stripe!.verifyIdentity(clientSecret);

    setLoading(false);
  }

  return (
    <button onClick={startVerification} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
      {loading ? `Starting...` : `Verify Me`}
    </button>
  );
}
