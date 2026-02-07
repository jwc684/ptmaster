"use client";

import { useRef, useState, type ReactNode } from "react";

interface SwipeableRowProps {
  children: ReactNode;
  actions: ReactNode;
  actionWidth?: number;
}

export function SwipeableRow({ children, actions, actionWidth = 160 }: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = translateX;
    isDragging.current = false;
    isHorizontal.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determine scroll direction on first significant movement
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontal.current) return;

    isDragging.current = true;
    const newX = Math.min(0, Math.max(-actionWidth, currentX.current + dx));
    setTranslateX(newX);
  }

  function handleTouchEnd() {
    if (!isDragging.current) return;

    const threshold = actionWidth / 3;
    if (translateX < -threshold) {
      setTranslateX(-actionWidth);
      setIsOpen(true);
    } else {
      setTranslateX(0);
      setIsOpen(false);
    }
  }

  function close() {
    setTranslateX(0);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Actions behind */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ width: actionWidth }}
      >
        {actions}
      </div>

      {/* Main content */}
      <div
        className="relative bg-background transition-transform"
        style={{
          transform: `translateX(${translateX}px)`,
          transitionDuration: isDragging.current ? "0ms" : "200ms",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (isOpen) {
            e.preventDefault();
            e.stopPropagation();
            close();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
