'use client';

import { type ReactNode } from 'react';

interface SegmentedButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  /** Accessible label for the button */
  [`aria-label`]?: string;
}

const baseClassName = `
  flex
  min-h-11
  items-center
  justify-center
  gap-2
  rounded-xl
  border
  px-4
  py-2.5
  text-sm
  font-bold
  transition-all
  duration-200
  active:scale-95
  focus:outline-hidden
  focus:ring-2
  focus:ring-primary-500/50
  focus:ring-offset-2
  focus:ring-offset-slate-100
  dark:focus:ring-white/50
  dark:focus:ring-offset-slate-900
  shadow-md
`;

const activeClassName = `
  border-white/30
  bg-white/10
  text-white
  hover:bg-white/15
  backdrop-blur-xs
`;

const inactiveClassName = `
  border-slate-200
  bg-slate-100
  text-slate-700
  hover:bg-slate-200
  hover:border-slate-300
  dark:border-slate-600/50
  dark:bg-slate-700/50
  dark:text-slate-300
  dark:hover:bg-slate-600/50
  dark:hover:border-slate-500/50
  backdrop-blur-xs
`;

/**
 * SegmentedButton - Toggle-style button with selected/unselected state.
 * Use for inline actions (e.g. Tags, Attach) where one of a group can appear selected.
 */
export function SegmentedButton({
  active,
  onClick,
  children,
  className = ``,
  [`aria-label`]: ariaLabel,
}: SegmentedButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClassName.trim()} ${active ? activeClassName.trim() : inactiveClassName.trim()} ${className}`.trim()}
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
