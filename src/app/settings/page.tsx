"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import {
  HardDrive,
  KeyRound,
  ShieldCheck,
  Moon,
  Sun,
  LogOut,
  AlertTriangle,
  CheckCircle2,
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

  // Dark mode toggle
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Detect system or class dark mode
    if (typeof window !== "undefined") {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setIsDark(isDarkMode);
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
      setPwdError("Password baru minimal 6 karakter");
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
        setPwdSuccess(data.message || "Password berhasil diganti!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwdError(data.error || "Gagal mengganti password");
      }
    } catch {
      setPwdError("Terjadi kesalahan jaringan");
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
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navigation />

      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-12">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 px-4 md:px-8 py-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Pengaturan Website
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola kata sandi bersama, kapasitas penyimpanan 50 GB, dan preferensi tampilan
          </p>
        </header>

        <div className="p-4 md:p-8 max-w-4xl space-y-6">
          {/* Storage Management Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    Kapasitas Penyimpanan Server (50 GB Limit)
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Mencakup foto asli, video, thumbnail, dan file Trash
                  </p>
                </div>
              </div>

              {storage && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    storage.status === "full_100"
                      ? "bg-rose-100 dark:bg-rose-950/50 text-rose-600"
                      : storage.status === "critical_90"
                      ? "bg-rose-100 dark:bg-rose-950/50 text-rose-600"
                      : storage.status === "warning_80"
                      ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600"
                      : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600"
                  }`}
                >
                  {storage.status === "full_100"
                    ? "Penuh (Upload Ditutup)"
                    : storage.status === "critical_90"
                    ? "Kritis (≥90%)"
                    : storage.status === "warning_80"
                    ? "Peringatan (≥80%)"
                    : "Kapasitas Aman"}
                </span>
              )}
            </div>

            {loadingStorage ? (
              <div className="py-6 flex justify-center text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : storage ? (
              <div className="space-y-4">
                {/* Visual Progress Bar */}
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      storage.percentageUsed >= 90
                        ? "bg-rose-500"
                        : storage.percentageUsed >= 80
                        ? "bg-amber-500"
                        : "bg-sky-500"
                    }`}
                    style={{ width: `${Math.min(100, storage.percentageUsed)}%` }}
                  />
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80">
                    <p className="text-[11px] text-zinc-500">Total Kuota</p>
                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {formatGB(storage.quotaBytes)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80">
                    <p className="text-[11px] text-zinc-500">Terpakai</p>
                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {formatGB(storage.usedBytes)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80">
                    <p className="text-[11px] text-zinc-500">Tersisa</p>
                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatGB(storage.freeBytes)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80">
                    <p className="text-[11px] text-zinc-500">Persentase</p>
                    <p className="font-bold text-sm text-sky-600 dark:text-sky-400 mt-0.5">
                      {storage.percentageUsed.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {storage.percentageUsed >= 80 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      Penyimpanan hampir penuh. Anda dapat mengosongkan Trash untuk membebaskan ruang server.
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Change Password Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Ubah Password Bersama
                </h2>
                <p className="text-xs text-zinc-500">
                  Password dienkripsi dengan Argon2id. Mengubah password akan membatalkan seluruh sesi yang sedang aktif di perangkat lain.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Password Baru (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {pwdError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{pwdError}</span>
                </div>
              )}

              {pwdSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{pwdSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={pwdLoading || !currentPassword || !newPassword}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {pwdLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Perbarui Password Bersama</span>
              </button>
            </form>
          </div>

          {/* Preferences & Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Theme Toggle */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                  {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                    Mode Tampilan
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {isDark ? "Tema Gelap Aktif" : "Tema Terang Aktif"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Ganti Tema
              </button>
            </div>

            {/* Trash Shortcut */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                    Kelola Trash
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Pulihkan atau hapus file permanen
                  </p>
                </div>
              </div>
              <Link
                href="/trash"
                className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Buka Trash
              </Link>
            </div>
          </div>

          {/* Logout Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                Keluar dari Sesi
              </h3>
              <p className="text-[11px] text-zinc-500">
                Mengakhiri sesi autentikasi pada browser ini
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
