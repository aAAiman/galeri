"use client";

import React from "react";
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
} from "lucide-react";

interface NavigationProps {
  onOpenUpload?: () => void;
}

export function Navigation({ onOpenUpload }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

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
      {/* Desktop Minimal Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-black p-3 shrink-0 h-screen sticky top-0 justify-between select-none">
        <div className="space-y-4">
          {/* Logo / App Name */}
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <div className="h-6 w-6 rounded-md bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-black">
              <ImageIcon className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
              GaleriKita
            </span>
          </div>

          {/* Upload Button */}
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium text-xs transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 stroke-[2]" />
              <span>Unggah</span>
            </button>
          )}

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
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 font-semibold"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? "text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Logout */}
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Bar (iOS/Google Photos inspired) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 px-3 py-1.5 flex items-center justify-around select-none">
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
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[11px] font-medium transition-colors ${
                isActive
                  ? "text-neutral-900 dark:text-neutral-100 font-semibold"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
