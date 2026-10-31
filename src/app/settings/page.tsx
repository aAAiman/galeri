"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import {
  HardDrive,
  KeyRound,
  Moon,
  Sun,
  LogOut,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface StorageData {
  quotaBytes: number;
  usedBytes: number;
  reservedBytes: number;
  freeBytes: number;
  percentageUsed: number;
  status: "normal" | "warning_80" | "critical_90" | "full_100";
}

export default function SettingsPage() {
  const router = useRouter();
  const [storage, setStorage] = useState<StorageData | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
    fetchStorage();
  }, []);

  const fetchStorage = async () => {
    setLoadingStorage(true);
    try {
      const res = await fetch("/api/storage/status");
      if (res.ok) {
        const data = await res.json();
        setStorage(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStorage(false);
    }
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (newPassword !== confirmPassword) {
      setPwdError("Konfirmasi password baru tidak cocok");
      return;
    }

    if (newPassword.length < 6) {
      setPwdError("Password minimal 6 karakter");
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setPwdSuccess("Password berhasil diganti. Sesi lain telah dibatalkan.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwdError(data.error || "Gagal mengganti password");
      }
    } catch {
      setPwdError("Koneksi gagal");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const formatGB = (bytes: number) => {
    return (bytes / (1000 * 1000 * 1000)).toFixed(2) + " GB";
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
      <Navigation />

      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5">
          <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Pengaturan
          </h1>
        </header>

        <div className="p-4 sm:p-6 max-w-2xl space-y-8">
          {/* Section: Storage Quota */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <HardDrive className="h-3.5 w-3.5" />
              <span>Penyimpanan (Batas 50 GB)</span>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-3">
              {loadingStorage ? (
                <div className="py-4 flex justify-center text-neutral-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : storage ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-bold tracking-tight">
                        {formatGB(storage.usedBytes)}
                      </span>
                      <span className="text-xs text-neutral-500 ml-1">
                        / {formatGB(storage.quotaBytes)} terpakai ({storage.percentageUsed.toFixed(1)}%)
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500">
                      Tersisa: {formatGB(storage.freeBytes)}
                    </span>
                  </div>

                  {/* Clean progress meter */}
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        storage.percentageUsed >= 90
                          ? "bg-rose-500"
                          : storage.percentageUsed >= 80
                          ? "bg-amber-500"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${Math.min(100, storage.percentageUsed)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-neutral-500">
                    Kapasitas mencakup file asli, varian thumbnail, dan file Trash.
                  </p>
                </>
              ) : null}
            </div>
          </section>

          {/* Section: Password */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <KeyRound className="h-3.5 w-3.5" />
              <span>Kata Sandi Bersama</span>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    Password Saat Ini
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    Password Baru (Min. 6 Karakter)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>

                {pwdError && (
                  <p className="text-xs text-rose-500">{pwdError}</p>
                )}

                {pwdSuccess && (
                  <p className="text-xs text-emerald-500">{pwdSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={pwdLoading || !currentPassword || !newPassword}
                  className="px-3.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {pwdLoading ? "Memperbarui..." : "Perbarui Password"}
                </button>
              </form>
            </div>
          </section>

          {/* Section: Appearance & Trash */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5">
              <div className="flex items-center gap-2.5">
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span className="text-xs font-medium">Tema Gelap</span>
              </div>
              <button
                onClick={toggleTheme}
                className="px-2.5 py-1 rounded text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {isDark ? "Aktif" : "Nonaktif"}
              </button>
            </div>

            <div className="flex items-center justify-between border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5">
              <div className="flex items-center gap-2.5">
                <Trash2 className="h-4 w-4 text-neutral-500" />
                <span className="text-xs font-medium">Buka Trash</span>
              </div>
              <Link
                href="/trash"
                className="px-2.5 py-1 rounded text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Lihat
              </Link>
            </div>

            <div className="flex items-center justify-between border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5">
              <div className="flex items-center gap-2.5 text-rose-500">
                <LogOut className="h-4 w-4" />
                <span className="text-xs font-medium">Keluar dari Galeri</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 rounded text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
