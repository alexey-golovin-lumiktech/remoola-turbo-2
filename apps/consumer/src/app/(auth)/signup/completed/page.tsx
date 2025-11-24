'use client';

import Link from 'next/link';

export default function SignupCompletedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm text-center">
        <div className="flex justify-center mb-6">
          <svg
            className="h-14 w-14 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Congratulations. Sign up success.</h1>

        <h2 className="text-lg text-gray-600 mb-6">
          Welcome to <span className="font-semibold text-indigo-600">Remoola</span>
        </h2>

        <p className="text-gray-600 mb-8 leading-relaxed">
          We have sent you an email so that you can confirm your email and activate your account.
          <br />
          Check your email and come back soon.
        </p>

        <Link
          href="/login"
          className="block w-full rounded-lg bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition"
        >
          Click to Sign In
        </Link>
      </div>
    </div>
  );
}
