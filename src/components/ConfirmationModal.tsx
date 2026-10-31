"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col items-center text-center">
        <div
          className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${
            isDangerous
              ? "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
              : "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
          }`}
        >
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 mb-1.5">
          {title}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center gap-2.5 w-full">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 shadow-md ${
              isDangerous
                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                : "bg-sky-600 hover:bg-sky-500 shadow-sky-600/20"
            }`}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
