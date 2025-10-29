import React from 'react';

import { cn } from '../utils/cn';

export type ButtonVariant = `primary` | `ghost`;
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string; variant?: ButtonVariant }
>(function Button({ className, variant = `primary`, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(`rm-btn`, variant === `primary` ? `rm-btn--primary` : `rm-btn--ghost`, className)}
      {...props}
    />
  );
});
