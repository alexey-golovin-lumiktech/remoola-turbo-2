'use client';

import { useState } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRef = (
    typeof document !== `undefined` ? { current: document.documentElement } : { current: null }
  ) as React.RefObject<HTMLDivElement>;

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      fullscreenRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  return { isFullscreen, toggleFullscreen, fullscreenRef };
}
