'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Verification() {
  const searchParams = useSearchParams();

  const email = searchParams.get(`email`);
  const verified = searchParams.get(`verified`);

  const [status, setStatus] = useState<`success` | `failed` | `unknown`>(`unknown`);

  useEffect(() => {
    if (verified === `yes`) setStatus(`success`);
    else if (verified === `no`) setStatus(`failed`);
    else setStatus(`unknown`);
  }, [verified]);

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <h1 className="text-2xl font-semibold mb-3">Invalid verification link</h1>
        <p className="text-gray-600 mb-6">Missing email parameter.</p>
        <Link href="/signup" className="text-blue-600 hover:underline">
          Go back to signup
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      {status === `success` && (
        <>
          <h1 className="text-3xl font-bold text-green-600 mb-3">Email Verified 🎉</h1>
          <p className="text-gray-700 mb-6">
            Your email <span className="font-mono">{decodeURIComponent(email)}</span> has been successfully verified.
          </p>
          <Link href="/login" className="text-blue-600 hover:underline">
            Continue to Login
          </Link>
        </>
      )}

      {status === `failed` && (
        <>
          <h1 className="text-3xl font-bold text-red-600 mb-3">Verification Failed</h1>
          <p className="text-gray-700 mb-6">
            The verification link for <span className="font-mono">{decodeURIComponent(email)}</span> is invalid or
            expired.
          </p>
          <Link href="/signup" className="text-blue-600 hover:underline">
            Try signing up again
          </Link>
        </>
      )}

      {status === `unknown` && (
        <>
          <h1 className="text-3xl font-bold text-gray-700 mb-3">Checking Verification...</h1>
          <p className="text-gray-500 mb-6">Please wait a moment.</p>
        </>
      )}
    </div>
  );
}
