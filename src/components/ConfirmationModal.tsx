"use client";

import React from "react";
import { Loader2 } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-xs shadow-lg p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors flex items-center gap-1.5 cursor-pointer ${
              isDangerous
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-neutral-900 dark:bg-white dark:text-black hover:opacity-90"
            }`}
          >
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
