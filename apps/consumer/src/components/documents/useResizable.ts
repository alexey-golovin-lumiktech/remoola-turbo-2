'use client';

import { useEffect, useRef, useState } from 'react';

export function useResizable({
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  initialWidth = 900,
  initialHeight = 600,
}: {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  initialWidth?: number;
  initialHeight?: number;
}) {
  const [size, setSize] = useState(() =>
    clampSize({
      width: initialWidth,
      height: initialHeight,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
    }),
  );
  const isDragging = useRef(false);

  useEffect(() => {
    const syncToViewport = () => {
      setSize((current) =>
        clampSize({
          width: current.width,
          height: current.height,
          minWidth,
          minHeight,
          maxWidth,
          maxHeight,
        }),
      );
    };

    syncToViewport();
    window.addEventListener(`resize`, syncToViewport);
    return () => window.removeEventListener(`resize`, syncToViewport);
  }, [maxHeight, maxWidth, minHeight, minWidth]);

  function startDragging(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      setSize(
        clampSize({
          width: startWidth + (ev.clientX - startX),
          height: startHeight + (ev.clientY - startY),
          minWidth,
          minHeight,
          maxWidth,
          maxHeight,
        }),
      );
    };

    const stop = () => {
      isDragging.current = false;
      window.removeEventListener(`mousemove`, onMove);
      window.removeEventListener(`mouseup`, stop);
    };

    window.addEventListener(`mousemove`, onMove);
    window.addEventListener(`mouseup`, stop);
  }

  return { size, startDragging };
}

function clampSize({
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
}: {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}) {
  if (typeof window === `undefined`) {
    return {
      width: Math.min(maxWidth, Math.max(minWidth, width)),
      height: Math.min(maxHeight, Math.max(minHeight, height)),
    };
  }

  const viewportWidth = Math.max(280, window.innerWidth - 16);
  const viewportHeight = Math.max(320, window.innerHeight - 16);
  const safeMinWidth = Math.min(minWidth, viewportWidth);
  const safeMinHeight = Math.min(minHeight, viewportHeight);

  return {
    width: Math.min(Math.min(maxWidth, viewportWidth), Math.max(safeMinWidth, width)),
    height: Math.min(Math.min(maxHeight, viewportHeight), Math.max(safeMinHeight, height)),
  };
}
