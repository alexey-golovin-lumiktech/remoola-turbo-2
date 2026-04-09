'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { CommandPalette } from './CommandPalette';
import { ShellBottomNav, ShellSidebar, ShellTopBar } from '../../shared/ui/ShellNav';

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

function isMacPlatform(): boolean {
  return typeof navigator !== `undefined` && /Mac|iPhone|iPad/i.test(navigator.userAgent);
}

function getCommandShortcutLabel(): string {
  return isMacPlatform() ? `Cmd + K` : `Ctrl + /`;
}

export function ShellClientWrapper({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [commandShortcutLabel, setCommandShortcutLabel] = useState(`Ctrl + /`);

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.defaultPrevented || isEditableTarget(event.target)) {
      return;
    }

    const isPaletteShortcut = isMacPlatform()
      ? event.metaKey && event.key.toLowerCase() === `k`
      : event.ctrlKey && (event.key === `/` || event.code === `Slash`);

    if (isPaletteShortcut) {
      event.preventDefault();
      setPaletteOpen((current) => !current);
    }
  }, []);

  useEffect(() => {
    setCommandShortcutLabel(getCommandShortcutLabel());
  }, []);

  useEffect(() => {
    document.addEventListener(`keydown`, handleKeyDown);
    return () => document.removeEventListener(`keydown`, handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-[background-color,color] duration-200"
      data-testid="consumer-css-grid-shell"
    >
      <ShellSidebar commandShortcutLabel={commandShortcutLabel} onOpenCommandPalette={openPalette} />
      <div className="flex min-h-screen flex-col md:ml-[248px]">
        <ShellTopBar commandShortcutLabel={commandShortcutLabel} onOpenCommandPalette={openPalette} />
        <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8 md:pt-6">{children}</main>
        <ShellBottomNav />
      </div>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
