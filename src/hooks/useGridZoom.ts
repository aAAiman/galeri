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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [zoomIn, zoomOut]);

  // Apple Photos responsive grid column classes
  const gridClass =
    zoomLevel === "compact"
      ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1"
      : zoomLevel === "large"
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3"
      : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 sm:gap-1.5";

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
