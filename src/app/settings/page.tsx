"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { useTheme } from "@/components/ThemeProvider";
import {
  HardDrive,
  KeyRound,
  Sun,
  Heart,
  Sparkles,
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
  const { theme, setTheme, toggleTheme } = useTheme();

  const [storage, setStorage] = useState<StorageData | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");

  // Background customization state
  const [bgMode, setBgMode] = useState("wallpaper");
  const [bgPhoto, setBgPhoto] = useState("/couple/collage.jpg");
  const [bgClarity, setBgClarity] = useState("balanced");
  const [bgBlur, setBgBlur] = useState("none");

  const fetchStorage = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchStorage();
    try {
      const savedMode = localStorage.getItem("galerikita_bg_mode");
      const savedPhoto = localStorage.getItem("galerikita_bg_photo");
      const savedClarity = localStorage.getItem("galerikita_bg_clarity");
      const savedBlur = localStorage.getItem("galerikita_bg_blur");

      if (savedMode) setBgMode(savedMode);
      if (savedPhoto) setBgPhoto(savedPhoto);
      if (savedClarity) setBgClarity(savedClarity);
      if (savedBlur) setBgBlur(savedBlur);
    } catch {}
  }, [fetchStorage]);

  const handleUpdateBg = (
    mode: string,
    photo: string,
    clarity: string,
    blur: string
  ) => {
    setBgMode(mode);
    setBgPhoto(photo);
    setBgClarity(clarity);
    setBgBlur(blur);
    try {
      localStorage.setItem("galerikita_bg_mode", mode);
      localStorage.setItem("galerikita_bg_photo", photo);
      localStorage.setItem("galerikita_bg_clarity", clarity);
      localStorage.setItem("galerikita_bg_blur", blur);
      window.dispatchEvent(new Event("galerikita_bg_updated"));
    } catch {}
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
    <div className="min-h-screen flex bg-transparent text-neutral-900">
      <Navigation />

      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 rose:bg-[#fff9f9]/85 backdrop-blur-md border-b border-neutral-200/80 rose:border-[#f4d8de]/80 px-4 py-2.5">
          <div className="max-w-2xl mx-auto w-full">
            <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Pengaturan
            </h1>
          </div>
        </header>

        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-8">
          {/* Section: Storage Quota */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 rose:text-[#a38088]">
              <HardDrive className="h-3.5 w-3.5" />
              <span>Penyimpanan (Batas 50 GB)</span>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rose:border-[#f4d8de] bg-white/90 rose:bg-white/90 backdrop-blur-md rounded-xl p-4 space-y-3 shadow-xs">
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
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rose:bg-[#fcecef] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${storage.percentageUsed >= 90
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
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 rose:text-[#a38088]">
              <KeyRound className="h-3.5 w-3.5" />
              <span>Kata Sandi Bersama</span>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rose:border-[#f4d8de] bg-white/90 rose:bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-xs">
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
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 rose:border-[#f4d8de] bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-500 rose:focus:ring-[#d96b82]"
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
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 rose:border-[#f4d8de] bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-500 rose:focus:ring-[#d96b82]"
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
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 rose:border-[#f4d8de] bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-500 rose:focus:ring-[#d96b82]"
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
                  className="px-3.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-white rose:bg-[#d96b82] hover:rose:bg-[#c7556e] text-white dark:text-black text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                >
                  {pwdLoading ? "Memperbarui..." : "Perbarui Password"}
                </button>
              </form>
            </div>
          </section>

          {/* Section: Appearance & Themes */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 rose:text-[#a38088]">
              <Sparkles className="h-3.5 w-3.5 text-[#d96b82]" />
              <span>Tema Tampilan</span>
            </div>

            <div className="border border-neutral-200 rose:border-[#f4d8de] bg-white/90 rose:bg-white/90 backdrop-blur-md rounded-xl p-4 space-y-3 shadow-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Rose Romance Theme Card */}
                <button
                  type="button"
                  onClick={() => setTheme("rose")}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                    theme === "rose"
                      ? "border-[#d96b82] ring-2 ring-[#d96b82]/30 bg-[#fcecef] text-[#d96b82] font-semibold"
                      : "border-neutral-200 rose:border-[#f4d8de] hover:border-[#d96b82] text-neutral-700 rose:text-[#3a2228] bg-white/70"
                  }`}
                >
                  <Heart className="h-5 w-5 fill-[#d96b82] text-[#d96b82]" />
                  <span className="text-xs font-medium">Pink Romantis</span>
                  <span className="text-[10px] text-[#c87385] opacity-90">🌸 Sakura & Nuansa Cinta</span>
                </button>

                {/* Light Theme Card */}
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                    theme === "light"
                      ? "border-blue-500 ring-2 ring-blue-500/20 bg-neutral-100 text-neutral-900 font-semibold"
                      : "border-neutral-200 hover:border-neutral-400 text-neutral-700 bg-white/70"
                  }`}
                >
                  <Sun className="h-5 w-5 text-amber-500" />
                  <span className="text-xs font-medium">Terang Bersih</span>
                  <span className="text-[10px] opacity-70">☀️ Netral & Minimalis</span>
                </button>
              </div>
            </div>

            {/* Section: Couple Wallpaper & Background (Mobile & Desktop) */}
            <div className="border border-neutral-200 rose:border-[#f4d8de] bg-white/90 rose:bg-white/90 backdrop-blur-md rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-[#d96b82] fill-[#d96b82]" />
                  <span className="text-xs font-semibold text-neutral-800 rose:text-[#3a2228]">
                    Foto Background / Wallpaper (HP & Laptop)
                  </span>
                </div>
                <span className="text-[10px] text-[#d96b82] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-medium">
                  Tampak di Semua Layar
                </span>
              </div>

              {/* Photos Picker */}
              <div>
                <span className="text-[11px] font-medium text-neutral-700 rose:text-[#3a2228] block mb-2">
                  Pilih Foto Berdua untuk Dijadikan Background:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { src: "/couple/collage.jpg", label: "Kolase 4 Pose" },
                    { src: "/couple/strip.png", label: "Neo Photo Strip" },
                    { src: "/couple/portrait.jpg", label: "Kesayangan" },
                    { src: "/couple/candid.jpg", label: "Selfie Ceria" },
                    { src: "/couple/stickers.jpg", label: "Stiker Cetak" },
                    { src: "/couple/closeup.jpg", label: "Close-up" },
                  ].map((item) => {
                    const isSelected = bgPhoto === item.src;
                    return (
                      <button
                        key={item.src}
                        type="button"
                        onClick={() => handleUpdateBg("wallpaper", item.src, bgClarity, bgBlur)}
                        className={`flex flex-col items-center p-1.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                          isSelected
                            ? "border-[#d96b82] ring-2 ring-[#d96b82]/30 bg-rose-50/70"
                            : "border-neutral-200 rose:border-[#f4d8de] hover:border-[#d96b82] bg-white"
                        }`}
                      >
                        <div className="h-16 w-full rounded-lg overflow-hidden mb-1 relative bg-neutral-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.src}
                            alt={item.label}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-[#d96b82] text-white rounded-full p-0.5 shadow-xs">
                              <span className="text-[9px] block px-1 font-bold">✓</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-neutral-700 rose:text-[#3a2228] truncate w-full">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clarity / Visibility Control */}
              <div>
                <span className="text-[11px] font-medium text-neutral-700 rose:text-[#3a2228] block mb-2">
                  Kejelasan Foto di Layar Handphone:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "clear", label: "Jelas (40%)", desc: "Foto sangat terlihat" },
                    { id: "balanced", label: "Sedang (28%)", desc: "Seimbang & rapi" },
                    { id: "subtle", label: "Halus (16%)", desc: "Aksen samar" },
                  ].map((cl) => (
                    <button
                      key={cl.id}
                      type="button"
                      onClick={() => handleUpdateBg("wallpaper", bgPhoto, cl.id, bgBlur)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        bgClarity === cl.id && bgMode === "wallpaper"
                          ? "border-[#d96b82] ring-2 ring-[#d96b82]/20 bg-[#fcecef] text-[#d96b82] font-semibold"
                          : "border-neutral-200 rose:border-[#f4d8de] text-neutral-700 bg-white"
                      }`}
                    >
                      <span className="text-xs block">{cl.label}</span>
                      <span className="text-[9px] opacity-75">{cl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Blur / Sharpness Control */}
              <div>
                <span className="text-[11px] font-medium text-neutral-700 rose:text-[#3a2228] block mb-2">
                  Ketajaman Foto Wajah & Momen:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateBg("wallpaper", bgPhoto, bgClarity, "none")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      bgBlur === "none" && bgMode === "wallpaper"
                        ? "border-[#d96b82] ring-2 ring-[#d96b82]/20 bg-[#fcecef] text-[#d96b82] font-semibold"
                        : "border-neutral-200 rose:border-[#f4d8de] text-neutral-700 bg-white"
                    }`}
                  >
                    <span className="text-xs block">✨ Jernih & Asli (Tanpa Blur)</span>
                    <span className="text-[9px] opacity-75">Wajah & momen berdua terlihat tajam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateBg("wallpaper", bgPhoto, bgClarity, "soft")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      bgBlur === "soft" && bgMode === "wallpaper"
                        ? "border-[#d96b82] ring-2 ring-[#d96b82]/20 bg-[#fcecef] text-[#d96b82] font-semibold"
                        : "border-neutral-200 rose:border-[#f4d8de] text-neutral-700 bg-white"
                    }`}
                  >
                    <span className="text-xs block">🌸 Sentuhan Lembut (Soft)</span>
                    <span className="text-[9px] opacity-75">Sedikit blur artistik</span>
                  </button>
                </div>
              </div>

              {/* Wallpaper toggle */}
              <div className="pt-2 border-t border-neutral-100 rose:border-rose-100 flex items-center justify-between">
                <span className="text-xs text-neutral-600 rose:text-[#5a3840]">
                  Gunakan Foto Sebagai Background
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateBg(bgMode === "wallpaper" ? "none" : "wallpaper", bgPhoto, bgClarity, bgBlur)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    bgMode === "wallpaper"
                      ? "bg-[#d96b82] text-white"
                      : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {bgMode === "wallpaper" ? "Aktif" : "Nonaktif (Polos)"}
                </button>
              </div>
            </div>

            <Link
              href="/trash"
              className="w-full flex items-center justify-between border border-neutral-200 dark:border-neutral-800 rose:border-[#f4d8de] hover:border-neutral-300 dark:hover:border-neutral-700 rounded-xl p-3.5 bg-white/90 dark:bg-neutral-900 rose:bg-white/90 backdrop-blur-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all cursor-pointer text-left group shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200">
                <Trash2 className="h-4 w-4 text-neutral-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">Buka Trash</span>
              </div>
              <span className="px-2.5 py-1 rounded text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors font-medium">
                Lihat
              </span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-between border border-rose-200 dark:border-neutral-800 rounded-xl p-3.5 bg-white dark:bg-neutral-900 hover:bg-rose-50/70 dark:hover:bg-rose-950/20 hover:border-rose-300 dark:hover:border-rose-900 text-rose-500 transition-all cursor-pointer text-left group shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-rose-500">
                <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="text-xs font-medium">Keluar dari Galeri</span>
              </div>
              <span className="px-2.5 py-1 rounded text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/50 transition-colors font-medium">
                Keluar
              </span>
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
