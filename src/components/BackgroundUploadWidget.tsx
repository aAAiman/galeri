"use client";

import React from "react";
import {
  X,
  Minus,
  ChevronUp,
  ChevronDown,
  Upload,
  FileImage,
  FileVideo,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useUpload } from "./UploadContext";

export function BackgroundUploadWidget() {
  const {
    tasks,
    isWidgetOpen,
    isWidgetMinimized,
    cancelTask,
    closeWidget,
    toggleMinimize,
    activeUploadCount,
    overallProgress,
  } = useUpload();

  if (!isWidgetOpen || tasks.length === 0) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const isAllFinished = activeUploadCount === 0;

  // Minimized Floating Pill View (Google Drive style compact bar)
  if (isWidgetMinimized) {
    return (
      <div className="fixed bottom-16 md:bottom-4 right-3 md:right-5 z-50 select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
        <div
          onClick={toggleMinimize}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-neutral-900/95 dark:bg-neutral-800/95 rose:bg-[#fff0f3]/95 text-white rose:text-[#3a2228] border border-neutral-700/60 rose:border-[#f3c8d1] shadow-xl backdrop-blur-md cursor-pointer hover:scale-[1.02] transition-all text-xs font-medium"
        >
          {isAllFinished ? (
            <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-[#d96b82] shrink-0" />
          )}

          <div className="leading-tight">
            <span>
              {isAllFinished
                ? `${completedCount} file selesai diunggah`
                : `Mengunggah (${overallProgress}%) • ${activeUploadCount} item`}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize();
            }}
            className="p-1 rounded-full hover:bg-white/20 rose:hover:bg-rose-200/50 transition-colors ml-1"
            title="Perbesar panel upload"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>

          {isAllFinished && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeWidget();
              }}
              className="p-1 rounded-full hover:bg-white/20 rose:hover:bg-rose-200/50 transition-colors"
              title="Tutup"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Expanded View (Full Google Drive style card)
  return (
    <div className="fixed bottom-16 md:bottom-4 right-3 md:right-5 z-50 w-[92vw] sm:w-96 select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="border border-neutral-200/80 dark:border-neutral-800 rose:border-[#f4d8de] bg-white/95 dark:bg-neutral-900/95 rose:bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Card Header */}
        <div className="px-4 py-3 bg-neutral-900 rose:bg-[#3a2228] text-white flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isAllFinished ? (
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
            ) : (
              <Upload className="h-4 w-4 text-rose-300 animate-pulse shrink-0" />
            )}

            <div className="min-w-0 leading-tight">
              <p className="text-xs font-semibold truncate">
                {isAllFinished
                  ? `Selesai • ${completedCount} file tersimpan`
                  : `Mengunggah ${activeUploadCount} file...`}
              </p>
              <p className="text-[10px] text-white/70 truncate">
                {isAllFinished
                  ? "Semua media siap dilihat di galeri ♡"
                  : `Total progres ${overallProgress}%`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={toggleMinimize}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Kecilkan panel"
            >
              <ChevronDown className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={closeWidget}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isAllFinished ? "Tutup" : "Sembunyikan panel"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Global Progress Line */}
        {!isAllFinished && (
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1 overflow-hidden">
            <div
              className="h-full bg-[#d96b82] transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        )}

        {/* Upload Task Items List */}
        <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
          {tasks.map((task) => {
            const isVideo =
              task.file.type.startsWith("video/") ||
              [".mp4", ".mov", ".webm", ".mkv"].some((ext) =>
                task.name.toLowerCase().endsWith(ext)
              );

            return (
              <div
                key={task.id}
                className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/70 rose:border-[#fcecef] bg-white dark:bg-neutral-900/60 rose:bg-[#fff9f9] flex items-center gap-3 transition-colors group"
              >
                {/* Media Icon */}
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    isVideo
                      ? "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400"
                      : "bg-rose-50 dark:bg-rose-950/30 text-[#d96b82]"
                  }`}
                >
                  {isVideo ? (
                    <FileVideo className="h-4 w-4" />
                  ) : (
                    <FileImage className="h-4 w-4" />
                  )}
                </div>

                {/* Info & Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                      {task.name}
                    </p>
                    <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                      {task.status === "completed"
                        ? formatSize(task.size)
                        : `${formatSize(task.loaded)} / ${formatSize(task.size)}`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rose:bg-rose-100/50 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        task.status === "completed"
                          ? "bg-emerald-500"
                          : task.status === "failed"
                          ? "bg-rose-500"
                          : "bg-[#d96b82]"
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>

                  {/* Speed / Status text */}
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span
                      className={`truncate ${
                        task.status === "completed"
                          ? "text-emerald-600 font-medium"
                          : task.status === "failed"
                          ? "text-rose-500 font-medium"
                          : "text-neutral-500 rose:text-[#a38088]"
                      }`}
                    >
                      {task.errorMessage || task.speed || `${task.progress}%`}
                    </span>

                    {task.status === "uploading" && (
                      <span className="text-neutral-400 font-medium">
                        {task.progress}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Icon / Checkmark */}
                <div className="shrink-0 flex items-center justify-center w-6">
                  {task.status === "completed" ? (
                    <div className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    </div>
                  ) : task.status === "uploading" ? (
                    <div className="relative">
                      <Loader2 className="h-4 w-4 animate-spin text-[#d96b82]" />
                      <button
                        type="button"
                        onClick={() => cancelTask(task.id)}
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white dark:bg-neutral-800 text-neutral-500 hover:text-rose-500 rounded-full flex items-center justify-center transition-opacity"
                        title="Batalkan"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : task.status === "failed" ? (
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => cancelTask(task.id)}
                      className="p-1 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                      title="Hapus dari antrean"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
