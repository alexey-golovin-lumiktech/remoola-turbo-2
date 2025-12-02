'use client';

import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

export function VerifyMeButton() {
  const [loading, setLoading] = useState(false);

  async function startVerification() {
    setLoading(true);
    const authorization = localStorage.getItem(`authorization`) ?? ``;

    const res = await fetch(`/api/stripe/verify/start`, {
      method: `POST`,
      headers: { authorization },
      credentials: `include`,
    });

    const { clientSecret } = await res.json();

    const stripe = await loadStripe(
      `pk_test_51N1NYhCnUuv0cnz82HRdWjJG6BQLt39UMrZtu5TMQwHxHZ78T9OgVOrlCSKInTIsClMaizf2V685PCzsTBphw7zV006mPbh9qN`,
    );

    await stripe!.verifyIdentity(clientSecret);

    setLoading(false);
  }

  return (
    <button onClick={startVerification} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
      {loading ? `Starting...` : `Verify Me`}
    </button>
  );
}
