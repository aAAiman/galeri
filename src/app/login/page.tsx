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
    <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-xs">
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-5 bg-white dark:bg-neutral-950">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              GaleriKita
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Masukkan password bersama untuk mengakses galeri
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoFocus
                  className="w-full pl-3 pr-9 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
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
              <p className="text-xs text-rose-500">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{loading ? "Memverifikasi..." : "Buka Galeri"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
