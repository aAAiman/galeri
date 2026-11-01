"use client";

import { useState, useEffect, useCallback } from "react";

export type GridZoomLevel = "compact" | "normal" | "large";

export function useGridZoom() {
  const [zoomLevel, setZoomLevel] = useState<GridZoomLevel>("normal");

  useEffect(() => {
    const saved = localStorage.getItem("galerikita_grid_zoom") as GridZoomLevel | null;
    if (saved === "compact" || saved === "normal" || saved === "large") {
      setZoomLevel(saved);
    }
  }, []);

  const changeZoom = useCallback((level: GridZoomLevel) => {
    setZoomLevel(level);
    try {
      localStorage.setItem("galerikita_grid_zoom", level);
    } catch {
      // ignore
    }
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel((curr) => {
      let next: GridZoomLevel = curr;
      if (curr === "compact") next = "normal";
      else if (curr === "normal") next = "large";
      try {
        localStorage.setItem("galerikita_grid_zoom", next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((curr) => {
      let next: GridZoomLevel = curr;
      if (curr === "large") next = "normal";
      else if (curr === "normal") next = "compact";
      try {
        localStorage.setItem("galerikita_grid_zoom", next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        zoomOut();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else if (e.deltaY > 0) {
          zoomOut();
        }
      }
    };

    let touchStartDist = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDist > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const diff = dist - touchStartDist;
        if (diff > 50) {
          zoomIn();
          touchStartDist = dist;
        } else if (diff < -50) {
          zoomOut();
          touchStartDist = dist;
        }
      }
    };

    const handleTouchEnd = () => {
      touchStartDist = 0;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [zoomIn, zoomOut]);

  // Ultra-responsive Google & Apple Photos style grid classes
  // Seamless scaling from 320px mobile to 4K displays
  const gridClass =
    zoomLevel === "large"
      ? "grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10 gap-1.5"
      : zoomLevel === "normal"
      ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1"
      : "grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-12 gap-0.5 sm:gap-1";

  return {
    zoomLevel,
    setZoomLevel: changeZoom,
    zoomIn,
    zoomOut,
    gridClass,
    canZoomIn: zoomLevel !== "large",
    canZoomOut: zoomLevel !== "compact",
  };
}
