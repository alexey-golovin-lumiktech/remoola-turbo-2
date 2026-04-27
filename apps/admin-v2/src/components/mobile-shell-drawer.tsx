'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import { normalizeActivePath } from '../app/(shell)/nav-state';
import { getWorkspaceMeta } from '../lib/workspace-meta';

type MobileShellDrawerProps = {
  children: ReactNode;
  activePath?: string | null;
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      `a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])`,
    ),
  ).filter((element) => !element.hasAttribute(`disabled`) && element.getAttribute(`aria-hidden`) !== `true`);
}

export function MobileShellDrawer({ children, activePath = null }: MobileShellDrawerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const previousOpenRef = useRef(false);
  const titleId = useId();
  const pathname = usePathname();
  const resolvedActivePath = normalizeActivePath(pathname) ?? activePath;
  const workspaceMeta = getWorkspaceMeta(resolvedActivePath);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    if (open) {
      panel.removeAttribute(`inert`);
    } else {
      panel.setAttribute(`inert`, ``);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = `hidden`;

    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusableElements = getFocusableElements(panel);
      const firstFocusable = focusableElements[0] ?? closeButtonRef.current ?? panel;
      firstFocusable.focus();
    });

    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === `Escape`) {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== `Tab`) {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusableElements = getFocusableElements(panel);
      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      if (!firstFocusable || !lastFocusable) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstFocusable || activeElement === panel) {
          event.preventDefault();
          lastFocusable.focus();
        }
        return;
      }

      if (activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    window.addEventListener(`keydown`, handleKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener(`keydown`, handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open && previousOpenRef.current) {
      const fallbackTarget = triggerRef.current;
      const restoreTarget = previousFocusedElementRef.current;

      if (restoreTarget && restoreTarget.isConnected) {
        restoreTarget.focus();
      } else {
        fallbackTarget?.focus();
      }
    }

    previousOpenRef.current = open;
  }, [open]);

  return (
    <div className="lg:hidden">
      <div className="sticky top-0 z-[35] border-b border-border bg-bg/90 px-4 py-3 pt-[calc(var(--space-3)+env(safe-area-inset-top,0px))] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            ref={triggerRef}
            type="button"
            aria-label="Open navigation"
            aria-controls="mobile-shell-drawer-sheet"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-input border border-white/10 bg-white/[0.03] text-white/80 transition hover:bg-white/[0.06] hover:text-white"
          >
            <span className="sr-only">Open navigation</span>
            <span aria-hidden="true" className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 bg-white/80" />
              <span className="block h-0.5 w-5 bg-white/80" />
              <span className="block h-0.5 w-5 bg-white/80" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/38">
              {workspaceMeta.eyebrow}
            </div>
            <div className="truncate text-sm font-semibold text-white/92">{workspaceMeta.title}</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-white/50">{workspaceMeta.queueLabel}</div>
      </div>

      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={cn(
          `fixed inset-0 z-40 bg-black/60 transition-opacity duration-200`,
          open ? `opacity-100` : `pointer-events-none opacity-0`,
        )}
      />
      <div
        id="mobile-shell-drawer-sheet"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby={titleId}
        className={cn(
          `fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[360px] overflow-y-auto border-r border-border bg-bg pt-[env(safe-area-inset-top,0px)] shadow-2xl transition-transform duration-200 ease-out`,
          open ? `translate-x-0` : `-translate-x-full`,
        )}
        tabIndex={-1}
        onClickCapture={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest(`a`)) setOpen(false);
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-md">
          <div id={titleId} className="text-sm font-medium text-white/90">
            Workspace navigation
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-input border border-white/10 bg-white/[0.03] text-white/80 transition hover:bg-white/[0.06] hover:text-white"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ×
            </span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
