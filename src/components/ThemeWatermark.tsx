"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { Heart } from "lucide-react";

export function ThemeWatermark() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const [bgMode, setBgMode] = useState<string>("wallpaper");
  const [bgPhoto, setBgPhoto] = useState<string>("/couple/collage.jpg");
  const [bgClarity, setBgClarity] = useState<string>("balanced");
  const [bgBlur, setBgBlur] = useState<string>("none");

  useEffect(() => {
    const syncPreferences = () => {
      try {
        const savedMode = localStorage.getItem("galerikita_bg_mode");
        const savedPhoto = localStorage.getItem("galerikita_bg_photo");
        const savedClarity = localStorage.getItem("galerikita_bg_clarity");
        const savedBlur = localStorage.getItem("galerikita_bg_blur");

        if (savedMode) setBgMode(savedMode);
        if (savedPhoto) setBgPhoto(savedPhoto);
        if (savedClarity) setBgClarity(savedClarity);
        if (savedBlur) setBgBlur(savedBlur);
      } catch {
        // ignore
      }
    };

    syncPreferences();
    window.addEventListener("galerikita_bg_updated", syncPreferences);
    return () => window.removeEventListener("galerikita_bg_updated", syncPreferences);
  }, []);

  if (bgMode === "none") return null;

  // Photo opacity based on clarity setting
  const photoOpacity =
    bgClarity === "clear"
      ? 0.40
      : bgClarity === "subtle"
      ? 0.16
      : 0.28;

  // Blur filter
  const blurValue = bgBlur === "soft" ? "blur(4px)" : "none";

  // Light veil to guarantee high contrast and text readability on all devices
  const veilColor =
    theme === "rose"
      ? "rgba(255, 248, 250, 0.70)"
      : "rgba(255, 255, 255, 0.75)";

  // Optional decorative corner scrapbook only on ultra-wide screens on gallery pages
  const showCornerStickers = pathname === "/" || pathname === "/albums" || pathname === "/favorites";

  return (
    <div className="couple-wallpaper-container select-none">
      {/* 1. Full Mobile & Desktop Couple Photo Wallpaper */}
      <div
        className="couple-wallpaper-photo"
        style={{
          backgroundImage: `url('${bgPhoto}')`,
          opacity: photoOpacity,
          filter: blurValue,
          transform: bgBlur === "soft" ? "scale(1.04)" : "scale(1.0)",
        }}
        aria-hidden="true"
      />

      {/* 2. Frosted Contrast Veil */}
      <div
        className="couple-wallpaper-veil pointer-events-none"
        style={{
          backgroundColor: veilColor,
          backdropFilter: bgBlur === "soft" ? "blur(0.5px)" : "none",
        }}
        aria-hidden="true"
      />

      {/* 3. Right Floating Photostrip Keepsake (Desktop Only) */}
      {showCornerStickers && (
        <div
          className="hidden 2xl:flex flex-col items-center fixed right-8 top-20 z-10 opacity-40 hover:opacity-100 transition-opacity duration-300 pointer-events-auto"
          style={{ width: "135px" }}
        >
          <div className="w-14 h-4 rounded-sm bg-rose-200/80 border border-rose-300/60 shadow-xs -mb-2 z-20 transform -rotate-3" />
          <div className="bg-white/95 p-1.5 rounded-lg shadow-lg border border-rose-200/80 transform rotate-2 hover:rotate-0 transition-transform duration-300">
            <div className="w-full rounded overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/couple/strip.png"
                alt="Neo Photo Strip"
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="pt-1 text-center">
              <span className="text-[9px] font-semibold text-rose-500 tracking-wider">
                MOMEN KITA ♡
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Left Lower Floating Polaroid Keepsake (Desktop Only) */}
      {showCornerStickers && (
        <div
          className="hidden 2xl:flex flex-col items-center fixed left-64 bottom-12 z-10 opacity-40 hover:opacity-100 transition-opacity duration-300 pointer-events-auto"
          style={{ width: "125px" }}
        >
          <div className="w-12 h-3.5 rounded-sm bg-rose-200/80 border border-rose-300/60 shadow-xs -mb-2 z-20 transform rotate-2" />
          <div className="bg-white/95 p-2 pb-2.5 rounded shadow-lg border border-rose-200/80 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
            <div className="w-full aspect-square rounded-sm overflow-hidden bg-rose-50 mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/couple/portrait.jpg"
                alt="Kesayangan"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center justify-center gap-1">
              <Heart className="h-2.5 w-2.5 fill-rose-500 text-rose-500" />
              <span className="text-[9px] font-semibold text-rose-600 tracking-tight">
                Kesayangan
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

