"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileImage,
  FileVideo,
  Check,
  AlertCircle,
  Loader2,
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
                ? { ...i, status: "failed", errorMessage: "Koneksi terputus" }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-md shadow-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
              Unggah Media
            </h2>
            {targetAlbumName && (
              <p className="text-[11px] text-neutral-500">
                Ke album: {targetAlbumName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
              isDragging
                ? "border-neutral-500 bg-neutral-100 dark:bg-neutral-800"
                : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 bg-neutral-50/50 dark:bg-neutral-950/50"
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
            <Upload className="h-5 w-5 text-neutral-400" />
            <div className="text-center">
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Seret file ke sini atau <span className="underline">pilih file</span>
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                JPG, PNG, WebP, GIF, MP4, MOV, WebM
              </p>
            </div>
          </div>

          {/* Queue */}
          {items.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-0.5">
                <span>{items.length} file dipilih</span>
                <span>
                  {completedCount}/{items.length} selesai
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => {
                  const isVideo = item.file.type.startsWith("video/");
                  return (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center gap-2.5"
                    >
                      <div className="text-neutral-400 shrink-0">
                        {isVideo ? (
                          <FileVideo className="h-4 w-4" />
                        ) : (
                          <FileImage className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <p className="text-xs truncate text-neutral-800 dark:text-neutral-200">
                            {item.file.name}
                          </p>
                          <span className="text-[10px] text-neutral-400 shrink-0">
                            {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-200 ${
                              item.status === "failed"
                                ? "bg-rose-500"
                                : item.status === "completed"
                                ? "bg-emerald-500"
                                : "bg-blue-600"
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        {item.errorMessage && (
                          <p className="text-[10px] text-rose-500 mt-0.5">
                            {item.errorMessage}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {item.status === "completed" ? (
                          <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                        ) : item.status === "uploading" ? (
                          <Loader2 className="h-3.5 w-3.5 text-neutral-400 animate-spin" />
                        ) : item.status === "failed" ? (
                          <AlertCircle className="h-4 w-4 text-rose-500" />
                        ) : (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-neutral-400 hover:text-neutral-600"
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
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/50">
          <button
            onClick={() => {
              setItems([]);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {isAllFinished ? "Tutup" : "Batal"}
          </button>

          {items.length > 0 && !isAllFinished && (
            <button
              onClick={startUploads}
              disabled={isProcessing}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black font-medium text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>
                {isProcessing
                  ? "Mengunggah..."
                  : `Unggah (${items.filter((i) => i.status === "waiting").length})`}
              </span>
            </button>
          )}

          {isAllFinished && (
            <button
              onClick={() => {
                setItems([]);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black font-medium text-xs cursor-pointer"
            >
              Selesai
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
