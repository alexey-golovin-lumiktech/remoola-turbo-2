/** Shared input/select class for signup forms: touch-friendly height, focus ring, and placeholder. */
export const SIGNUP_INPUT_CLASS =
  `min-h-[44px] w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900 ` +
  `placeholder:text-neutral-400 ` +
  `focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ` +
  `dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 ` +
  `dark:focus:ring-primary-400 dark:focus:border-primary-400 ` +
  `aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/20 aria-[invalid=true]:ring-2`;

/** Returns the input class with conditional error border. */
export function signupInputClass(hasError?: boolean): string {
  return hasError ? SIGNUP_INPUT_CLASS + ` border-red-500 ring-2 ring-red-500/20` : SIGNUP_INPUT_CLASS;
}
