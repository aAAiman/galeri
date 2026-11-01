"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Folder,
  Heart,
  Settings,
  Trash2,
  Upload,
  LogOut,
  Sparkles,
  Sun,
  Plus,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useUpload } from "./UploadContext";

interface NavigationProps {
  onOpenUpload?: () => void;
}

interface SidebarAlbum {
  id: number;
  name: string;
  media_count?: number;
  effective_cover_id?: number | null;
  cover_media_id?: number | null;
}

export function Navigation({ onOpenUpload }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, cycleTheme } = useTheme();
  const { openFilePicker } = useUpload();
  const [sidebarAlbums, setSidebarAlbums] = useState<SidebarAlbum[]>([]);
  const coupleMoments = [
    { src: "/couple/candid.jpg", caption: "Lucu & Bahagia ♡" },
    { src: "/couple/collage.jpg", caption: "Momen Kita ♡" },
    { src: "/couple/portrait.jpg", caption: "Kesayangan ♡" },
    { src: "/couple/strip.png", caption: "Neo Photo 2026 ♡" },
  ];
  const [coupleIdx, setCoupleIdx] = useState(0);

  useEffect(() => {
    fetch("/api/albums")
      .then((r) => r.json())
      .then((d) => setSidebarAlbums(d.albums || []))
      .catch(() => { });
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navItems = [
    { label: "Foto", href: "/", icon: ImageIcon },
    { label: "Album", href: "/albums", icon: Folder },
    { label: "Favorit", href: "/favorites", icon: Heart },
    { label: "Trash", href: "/trash", icon: Trash2 },
    { label: "Pengaturan", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Desktop Minimal Sidebar (Fixed permanently on left) */}
      <aside className="hidden md:flex flex-col w-52 lg:w-56 border-r border-neutral-200/80 rose:border-[#f4d8de]/80 bg-white/95 rose:bg-[#fff9f9]/95 p-3 shrink-0 fixed top-0 bottom-0 left-0 justify-between select-none z-40 backdrop-blur-md overflow-y-auto scrollbar-none">
        <div className="space-y-4">
          {/* Logo / Couple Profile */}
          <div className="flex flex-col px-2 py-1">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div
                  className={`h-9 w-9 rounded-full overflow-hidden border-2 transition-all shadow-xs ${theme === "rose"
                      ? "border-[#d96b82] ring-2 ring-[#fcdde3]"
                      : "border-neutral-300 dark:border-neutral-700"
                    }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/couple/collage.jpg"
                    alt="Momen Berdua"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-neutral-900 rounded-full p-0.5 shadow-2xs">
                  <Heart className="h-2.5 w-2.5 fill-[#d96b82] text-[#d96b82]" />
                </div>
              </div>
              <div className="leading-tight min-w-0">
                <span
                  className={`font-bold text-sm tracking-tight truncate block ${theme === "rose"
                      ? "text-[#3a2228]"
                      : "text-neutral-900 dark:text-neutral-100"
                    }`}
                >
                  GaleriKita
                </span>
                <p className="text-[10px] text-[#c87385] dark:text-neutral-400 font-medium truncate mt-0.5">
                  Setiap momen, selalu kita ♡
                </p>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenUpload) onOpenUpload();
              else openFilePicker();
            }}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer ${theme === "rose"
              ? "bg-[#d96b82] hover:bg-[#c7556e] text-white shadow-sm"
              : "bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
              }`}
          >
            <Upload className="h-3.5 w-3.5 stroke-[2]" />
            <span>Unggah</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-0.5 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive
                    ? theme === "rose"
                      ? "bg-[#fcecef] text-[#d96b82] font-semibold"
                      : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 font-semibold"
                    : theme === "rose"
                      ? "text-[#7a5c63] hover:bg-[#faebee] hover:text-[#d96b82]"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200"
                    }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive
                      ? theme === "rose"
                        ? "text-[#d96b82]"
                        : "text-neutral-900 dark:text-neutral-100"
                      : theme === "rose"
                        ? "text-[#a38088]"
                        : "text-neutral-500"
                      }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ALBUM SAYA section (User Screenshot Inspired) */}
          {sidebarAlbums.length > 0 && (
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 rose:border-[#f4d8de]">
              <div className="flex items-center justify-between px-2.5 mb-1.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500 rose:text-[#a38088]">
                  Album Saya
                </span>
                <Link
                  href="/albums"
                  className="p-0.5 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white rose:text-[#d96b82] transition-colors"
                  title="Lihat semua album"
                >
                  <Plus className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-none pr-0.5">
                {sidebarAlbums.slice(0, 6).map((album) => {
                  const coverMediaId = album.effective_cover_id || album.cover_media_id;
                  const isActive = pathname === `/albums/${album.id}`;

                  return (
                    <Link
                      key={album.id}
                      href={`/albums/${album.id}`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${isActive
                        ? theme === "rose"
                          ? "bg-[#fcecef] text-[#d96b82] font-semibold"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold"
                        : theme === "rose"
                          ? "text-[#6d4d54] hover:bg-[#fff0f3]"
                          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        }`}
                    >
                      <div className="h-7 w-7 rounded-md overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-800 rose:bg-[#fcecef] border border-neutral-200 dark:border-neutral-800 rose:border-[#f4d8de] relative">
                        {coverMediaId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/media/${coverMediaId}/thumbnail`}
                            alt={album.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400 rose:text-[#d96b82]/60">
                            <Folder className="h-3.5 w-3.5 stroke-[1.5]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate font-medium text-[11px]">{album.name}</p>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 rose:text-[#a38088]">
                          {album.media_count} item
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mini Polaroid Keepsake (Momen Berdua) */}
        <div className="py-2">
          <div
            onClick={() => setCoupleIdx((prev) => (prev + 1) % coupleMoments.length)}
            className="group relative cursor-pointer bg-white dark:bg-neutral-900 p-2 pb-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 rose:border-[#f4d8de] shadow-2xs hover:shadow-xs transition-all hover:scale-[1.02] select-none"
            title="Klik untuk melihat foto kenangan berikutnya ♡"
          >
            <div className="w-10 h-3 rounded-xs bg-rose-200/70 border border-rose-300/50 absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 -rotate-2" />
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-rose-50 dark:bg-neutral-800 relative mb-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coupleMoments[coupleIdx].src}
                alt="Kenangan Berdua"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-semibold text-neutral-800 dark:text-neutral-200 rose:text-[#d96b82] truncate">
                {coupleMoments[coupleIdx].caption}
              </span>
              <span className="text-[9px] text-neutral-400 rose:text-[#a38088] font-medium">
                {`${coupleIdx + 1} dari ${coupleMoments.length}`}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Theme Toggle & Logout */}
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 rose:border-[#f4d8de] space-y-1">
          <button
            onClick={cycleTheme}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${theme === "rose"
              ? "text-[#a38088] hover:text-[#d96b82] hover:bg-[#faebee]"
              : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
              }`}
            title="Ganti Tema (Klik untuk beralih)"
          >
            <div className="flex items-center gap-2">
              {theme === "rose" ? (
                <Sparkles className="h-3.5 w-3.5 text-[#d96b82]" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span>Tema</span>
            </div>
            <span className="text-[11px] font-medium opacity-85">
              {theme === "rose" ? "🌸 Pink" : "☀️ Terang"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="
              w-full
              flex items-center gap-2.5
              px-3 py-2.5
              text-left text-xs font-medium
              rounded-xl
              border border-neutral-200/70 dark:border-neutral-800 rose:border-[#f4d8de]
              text-neutral-600 dark:text-neutral-400 rose:text-[#a38088]
              hover:text-rose-600 dark:hover:text-rose-400 rose:hover:text-[#d96b82]
              hover:bg-rose-50 dark:hover:bg-neutral-900 rose:hover:bg-[#faebee]
              hover:border-rose-300 dark:hover:border-rose-900 rose:hover:border-[#d96b82]/40
              transition-all
              cursor-pointer
              shadow-2xs
            "
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Bar (Fixed 5-column grid so items never shift position) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 rose:bg-[#fff9f9]/98 backdrop-blur-md border-t border-neutral-200/80 rose:border-[#f4d8de]/80 px-1 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] grid grid-cols-5 items-center select-none shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-lg text-[10px] sm:text-[11px] font-medium transition-colors text-center w-full select-none ${isActive
                ? theme === "rose"
                  ? "text-[#d96b82] font-semibold"
                  : "text-neutral-900 dark:text-neutral-100 font-semibold"
                : theme === "rose"
                  ? "text-[#a38088] hover:text-[#d96b82]"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
            >
              <div className="relative">
                <Icon className={`h-4 w-4 transition-transform ${isActive ? "scale-110" : ""}`} />
                {isActive && theme === "rose" && (
                  <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-[#d96b82]" />
                )}
              </div>
              <span className="truncate max-w-full leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
