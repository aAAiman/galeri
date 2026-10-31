"use client";

import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileImage,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderPlus,
} from "lucide-react";

interface UploadFileItem {
  id: string;
  file: File;
  progress: number;
  status: "waiting" | "uploading" | "completed" | "failed";
  errorMessage?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAlbumId?: number | null;
  targetAlbumName?: string | null;
  onUploadSuccess?: () => void;
}

export function UploadModal({
  isOpen,
  onClose,
  targetAlbumId,
  targetAlbumName,
  onUploadSuccess,
}: UploadModalProps) {
  const [items, setItems] = useState<UploadFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    const newItems: UploadFileItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      progress: 0,
      status: "waiting",
    }));

    setItems((prev) => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const uploadFile = async (item: UploadFileItem) => {
    try {
      // Direct upload with XHR for smooth, native upload progress
      const formData = new FormData();
      formData.append("file", item.file);
      if (targetAlbumId) {
        formData.append("targetAlbumId", targetAlbumId.toString());
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload/direct");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id ? { ...i, progress: percent } : i
              )
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, progress: 100, status: "completed" }
                  : i
              )
            );
            resolve();
          } else {
            let errorMsg = "Upload gagal";
            try {
              const res = JSON.parse(xhr.responseText);
              errorMsg = res.error || errorMsg;
            } catch {
              // ignore
            }
            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, status: "failed", errorMessage: errorMsg }
                  : i
              )
            );
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: "failed", errorMessage: "Jaringan bermasalah" }
                : i
            )
          );
          reject(new Error("Network error"));
        };

        xhr.send(formData);
      });
    } catch {
      // handeled in xhr
    }
  };

  const startUploads = async () => {
    setIsProcessing(true);
    const waitingItems = items.filter((i) => i.status === "waiting");

    // Concurrency limit 2 as recommended in PRD 17.2.F
    const queue = [...waitingItems];
    const worker = async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        setItems((prev) =>
          prev.map((i) => (i.id === next.id ? { ...i, status: "uploading" } : i))
        );
        await uploadFile(next);
      }
    };

    await Promise.all([worker(), worker()]);

    setIsProcessing(false);
    if (onUploadSuccess) {
      onUploadSuccess();
    }
  };

  const completedCount = items.filter((i) => i.status === "completed").length;
  const isAllFinished = items.length > 0 && completedCount === items.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
              Unggah Foto & Video
            </h2>
            {targetAlbumName ? (
              <p className="text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1 mt-0.5">
                <FolderPlus className="h-3.5 w-3.5" />
                Masuk ke album: <strong>{targetAlbumName}</strong>
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                Media akan langsung tampil di Home Galeri
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dropzone area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              isDragging
                ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20"
                : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-950/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="h-12 w-12 rounded-full bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                Seret file foto/video ke sini atau{" "}
                <span className="text-sky-600 dark:text-sky-400 underline">
                  pilih file
                </span>
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Mendukung JPG, PNG, WebP, GIF, MP4, MOV, WebM (Kapasitas maks 50 GB)
              </p>
            </div>
          </div>

          {/* Upload Queue List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
                <span>Daftar File ({items.length})</span>
                <span>
                  {completedCount}/{items.length} selesai
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => {
                  const isVideo = item.file.type.startsWith("video/");
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3"
                    >
                      <div className="h-9 w-9 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500">
                        {isVideo ? (
                          <FileVideo className="h-4 w-4" />
                        ) : (
                          <FileImage className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-medium truncate text-zinc-800 dark:text-zinc-200">
                            {item.file.name}
                          </p>
                          <span className="text-[11px] text-zinc-400 shrink-0">
                            {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              item.status === "failed"
                                ? "bg-rose-500"
                                : item.status === "completed"
                                ? "bg-emerald-500"
                                : "bg-sky-500"
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        {item.errorMessage && (
                          <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {item.errorMessage}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center">
                        {item.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : item.status === "uploading" ? (
                          <Loader2 className="h-4 w-4 text-sky-500 animate-spin" />
                        ) : item.status === "failed" ? (
                          <AlertCircle className="h-5 w-5 text-rose-500" />
                        ) : (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <button
            onClick={() => {
              setItems([]);
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {isAllFinished ? "Tutup" : "Batal"}
          </button>

          {items.length > 0 && !isAllFinished && (
            <button
              onClick={startUploads}
              disabled={isProcessing}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-md shadow-sky-600/20 flex items-center gap-2 cursor-pointer"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {isProcessing
                  ? "Sedang Mengunggah..."
                  : `Unggah ${items.filter((i) => i.status === "waiting").length} File`}
              </span>
            </button>
          )}

          {isAllFinished && (
            <button
              onClick={() => {
                setItems([]);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all"
            >
              Selesai ({completedCount} file terunggah)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
