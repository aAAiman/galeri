"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  FolderArchive,
  Heart,
  Settings,
  Upload,
  HardDrive,
  LogOut,
  Trash2,
} from "lucide-react";

interface NavigationProps {
  onOpenUpload?: () => void;
}

export function Navigation({ onOpenUpload }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [storageInfo, setStorageInfo] = useState<{
    percentageUsed: number;
    usedBytes: number;
    quotaBytes: number;
    status: string;
  } | null>(null);

  const fetchStorage = async () => {
    try {
      const res = await fetch("/api/storage/status");
      if (res.ok) {
        const data = await res.json();
        setStorageInfo(data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchStorage();
    const interval = setInterval(fetchStorage, 30000);
    return () => clearInterval(interval);
  }, []);

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
    { label: "Album", href: "/albums", icon: FolderArchive },
    { label: "Favorit", href: "/favorites", icon: Heart },
    { label: "Trash", href: "/trash", icon: Trash2 },
    { label: "Pengaturan", href: "/settings", icon: Settings },
  ];

  const formatGB = (bytes: number) => {
    return (bytes / (1000 * 1000 * 1000)).toFixed(2) + " GB";
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shrink-0 h-screen sticky top-0 justify-between select-none">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 py-2 mb-6">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                GaleriKita
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Private Shared Gallery
              </p>
            </div>
          </div>

          {/* Quick Upload Button */}
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-6 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white font-medium text-sm transition-all shadow-md shadow-sky-600/25 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Unggah Media</span>
            </button>
          )}

          {/* Nav links */}
          <nav className="space-y-1">
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    isActive
                      ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive
                        ? "text-sky-600 dark:text-sky-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Storage Widget & Logout */}
        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          {storageInfo && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-zinc-600 dark:text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-zinc-400" />
                  Kapasitas 50 GB
                </span>
                <span>{storageInfo.percentageUsed.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    storageInfo.percentageUsed >= 90
                      ? "bg-rose-500"
                      : storageInfo.percentageUsed >= 80
                      ? "bg-amber-500"
                      : "bg-sky-500"
                  }`}
                  style={{ width: `${Math.min(100, storageInfo.percentageUsed)}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">
                {formatGB(storageInfo.usedBytes)} terpakai dari{" "}
                {formatGB(storageInfo.quotaBytes)}
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-around select-none">
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
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "text-sky-600 dark:text-sky-400 font-semibold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
