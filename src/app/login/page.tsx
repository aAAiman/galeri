"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setErrorMessage(data.error || "Password salah.");
      }
    } catch {
      setErrorMessage("Koneksi ke server bermasalah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fff9f9] text-neutral-900 relative overflow-hidden">
      {/* Ambient Couple Background */}
      <div
        className="couple-ambient-bg"
        style={{ backgroundImage: "url('/couple/collage.jpg')", opacity: 0.12 }}
        aria-hidden="true"
      />

      <div className="w-full max-w-xs relative z-10">
        <div className="border border-[#f4d8de] rounded-2xl p-6 space-y-5 bg-white/95 backdrop-blur-md shadow-xl shadow-rose-100/50">
          <div className="flex flex-col items-center text-center">
            {/* Couple Circular Avatar */}
            <div className="relative mb-3">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-[#d96b82] ring-4 ring-[#fcdde3] shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/couple/collage.jpg"
                  alt="Aiman & Pacar"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-xs">
                <span className="text-sm">❤️</span>
              </div>
            </div>

            <h1 className="text-base font-bold tracking-tight text-neutral-900">
              GaleriKita
            </h1>
            <p className="text-xs text-[#c87385] font-medium mt-0.5">
              Ruang Kenangan Kita Berdua ♡
            </p>
            <p className="text-[11px] text-neutral-500 mt-2">
              Masukkan password bersama untuk membuka galeri
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password bersama..."
                  required
                  autoFocus
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-white border border-[#f4d8de] text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#d96b82] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-500 text-center">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 rounded-xl bg-[#d96b82] hover:bg-[#c7556e] text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-rose-200"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{loading ? "Membuka..." : "Buka Galeri Kita ♡"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
