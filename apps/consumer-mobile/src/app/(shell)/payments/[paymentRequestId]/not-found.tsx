import Link from 'next/link';

export default function PaymentNotFound() {
  return (
    <div
      className={`
      flex
      min-h-125
      items-center
      justify-center
    `}
    >
      <div className={`max-w-md text-center`}>
        <div
          className={`
          mx-auto
          flex
          h-20
          w-20
          items-center
          justify-center
          rounded-full
          bg-slate-100
          dark:bg-slate-800
        `}
        >
          <svg
            className={`
              h-10
              w-10
              text-slate-400
              dark:text-slate-600
            `}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h1
          className={`
          mt-6
          text-2xl
          font-bold
          text-slate-900
          dark:text-white
        `}
        >
          Payment not found
        </h1>
        <p className={`mt-3 text-slate-600 dark:text-slate-400`}>
          The payment you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
        <Link
          href="/payments"
          className={`
            mt-6
            inline-flex
            min-h-11
            items-center
            rounded-lg
            bg-primary-600
            px-6
            py-2.5
            text-sm
            font-semibold
            text-white
            shadow-xs
            transition-all
            hover:bg-primary-700
            hover:shadow-md
            focus:outline-hidden
            focus:ring-2
            focus:ring-primary-500
            focus:ring-offset-2
          `}
        >
          Back to payments
        </Link>
      </div>
    </div>
  );
}
