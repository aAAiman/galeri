import Link from "next/link";
import { ImageOff, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 select-none">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-5 animate-in fade-in duration-200">
        {/* Minimalist icon container */}
        <div className="h-16 w-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center border border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500">
          <ImageOff className="h-8 w-8 stroke-[1.75]" />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Error 404
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs leading-relaxed">
            Halaman atau media yang Anda cari tidak tersedia, telah dihapus, atau tautan yang dimasukkan salah.
          </p>
        </div>

        {/* Back action */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Galeri</span>
        </Link>
      </div>
    </div>
  );
}
