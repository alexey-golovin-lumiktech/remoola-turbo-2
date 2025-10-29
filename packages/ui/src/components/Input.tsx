import React from 'react';
import { cn } from '../utils/cn';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(`rm-input`, className)} {...props} />;
  }
);
