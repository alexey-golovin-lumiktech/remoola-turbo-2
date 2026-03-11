/**
 * Shared form label and error class names for consistent styling across forms.
 * Use with raw <label> / error <p> when not using the FormField wrapper.
 */

export const FORM_LABEL_CLASS = `
  mb-1
  block
  text-sm
  font-medium
  text-neutral-700
  dark:text-neutral-300
`.trim();

export const FORM_ERROR_CLASS = `
  mt-1
  text-sm
  text-red-600
  dark:text-red-400
`.trim();
