'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { CommandPalette } from './CommandPalette';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === `INPUT` ||
    target.tagName === `TEXTAREA` ||
    target.tagName === `SELECT`
  );
}

export function ShellClientWrapper({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.defaultPrevented || isEditableTarget(event.target)) {
      return;
    }

    const isMac = typeof navigator !== `undefined` && /Mac|iPhone|iPad/i.test(navigator.userAgent);
    const isPaletteShortcut = isMac
      ? event.metaKey && event.key.toLowerCase() === `k`
      : event.ctrlKey && (event.key === `/` || event.code === `Slash`);

    if (isPaletteShortcut) {
      event.preventDefault();
      setPaletteOpen((current) => !current);
    }
  }, []);

  useEffect(() => {
    document.addEventListener(`keydown`, handleKeyDown);
    return () => document.removeEventListener(`keydown`, handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {children}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
