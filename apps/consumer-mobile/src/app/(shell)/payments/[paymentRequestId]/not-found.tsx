import Link from 'next/link';

import { DocumentIcon } from '../../../../shared/ui/icons/DocumentIcon';

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
          <DocumentIcon
            className={`
              h-10
              w-10
              text-slate-400
              dark:text-slate-600
            `}
          />
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
