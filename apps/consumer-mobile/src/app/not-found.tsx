import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Page not found</h1>
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Go home
      </Link>
    </div>
  );
}
