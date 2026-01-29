'use client';

import { useState, useRef } from 'react';

export function useResizable({
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
}: {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}) {
  const [size, setSize] = useState({ width: 900, height: 600 });
  const isDragging = useRef(false);

  function startDragging(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;

      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + (ev.clientX - startX)));
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + (ev.clientY - startY)));

      setSize({ width: newWidth, height: newHeight });
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
