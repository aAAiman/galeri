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

import { useUpload } from "./UploadContext";

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
}: UploadModalProps) {
  const { uploadFiles } = useUpload();
  const [items, setItems] = useState<{ id: string; file: File }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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
    const newItems = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
    }));

    setItems((prev) => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const startUploads = () => {
    if (items.length === 0) return;
    const filesToUpload = items.map((i) => i.file);
    uploadFiles(filesToUpload, targetAlbumId, targetAlbumName);
    setItems([]);
    onClose();
  };

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
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => {
                  const isVideo = item.file.type.startsWith("video/");
                  const formatSize = (bytes: number) => {
                    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
                    if (bytes < 1024 * 1024 * 1024)
                      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
                    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
                  };

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="text-neutral-400 shrink-0">
                          {isVideo ? (
                            <FileVideo className="h-4 w-4 text-sky-500" />
                          ) : (
                            <FileImage className="h-4 w-4 text-[#d96b82]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs truncate font-medium text-neutral-800 dark:text-neutral-200">
                            {item.file.name}
                          </p>
                          <span className="text-[10px] text-neutral-400 block">
                            {formatSize(item.file.size)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                        title="Hapus"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
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
            type="button"
            onClick={() => {
              setItems([]);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Batal
          </button>

          {items.length > 0 && (
            <button
              type="button"
              onClick={startUploads}
              className="px-4 py-1.5 rounded-lg bg-neutral-900 dark:bg-white rose:bg-[#d96b82] text-white dark:text-black rose:text-white font-medium text-xs shadow-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="h-3 w-3" />
              <span>Unggah di Latar Belakang ({items.length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
