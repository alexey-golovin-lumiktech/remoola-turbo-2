import { type ZodError } from 'zod';

export const getFieldErrors = (error: ZodError) => {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    const key = typeof field === `string` ? field : `_form`;
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }

  return fieldErrors;
};
