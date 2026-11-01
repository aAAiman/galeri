import { useRef, useCallback } from "react";

interface UseLongPressOptions {
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  thresholdMs?: number;
  moveTolerancePx?: number;
}

export function useLongPress({
  onLongPress,
  onClick,
  thresholdMs = 450,
  moveTolerancePx = 10,
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const start = useCallback(
    (x: number, y: number, event: React.TouchEvent | React.MouseEvent) => {
      isLongPressTriggeredRef.current = false;
      startPosRef.current = { x, y };

      timerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(40);
          } catch {
            // ignore
          }
        }
        onLongPress(event);
      }, thresholdMs);
    },
    [onLongPress, thresholdMs]
  );

  const move = useCallback(
    (x: number, y: number) => {
      if (!startPosRef.current || !timerRef.current) return;
      const dist = Math.hypot(
        x - startPosRef.current.x,
        y - startPosRef.current.y
      );
      if (dist > moveTolerancePx) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    [moveTolerancePx]
  );

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        start(touch.clientX, touch.clientY, e);
      }
    },
    [start]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        move(touch.clientX, touch.clientY);
      }
    },
    [move]
  );

  const onTouchEnd = useCallback(() => {
    clear();
  }, [clear]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only primary mouse button
      start(e.clientX, e.clientY, e);
    },
    [start]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      move(e.clientX, e.clientY);
    },
    [move]
  );

  const onMouseUp = useCallback(() => {
    clear();
  }, [clear]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isLongPressTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        isLongPressTriggeredRef.current = false;
        return;
      }
      onClick?.(e);
    },
    [onClick]
  );

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
    }
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave: onMouseUp,
    onClick: handleClick,
    onContextMenu,
  };
}
