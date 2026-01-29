import React from 'react';

import { cn } from './cn';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(`rm-input`, className)} {...props} />;
});
