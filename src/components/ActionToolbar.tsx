"use client";

import React from "react";
import {
  X,
  FolderInput,
  FolderPlus,
  FolderMinus,
  Heart,
  Trash2,
  Download,
  CheckSquare,
} from "lucide-react";

interface ActionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMoveToAlbum?: () => void;
  onAddToAlbum?: () => void;
  onRemoveFromAlbum?: () => void;
  onToggleFavorite?: () => void;
  onDeleteToTrash?: () => void;
  onDownloadAll?: () => void;
  inAlbumContext?: boolean;
}

export function ActionToolbar({
  selectedCount,
  onClearSelection,
  onMoveToAlbum,
  onAddToAlbum,
  onRemoveFromAlbum,
  onToggleFavorite,
  onDeleteToTrash,
  onDownloadAll,
  inAlbumContext = false,
}: ActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 text-white border border-zinc-700/80 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 md:gap-3 animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center gap-2 pr-3 border-r border-zinc-700">
        <button
          onClick={onClearSelection}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Batal Seleksi"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold whitespace-nowrap">
          {selectedCount} dipilih
        </span>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        {/* Move to Album */}
        {onMoveToAlbum && (
          <button
            onClick={onMoveToAlbum}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 text-xs font-medium text-zinc-200 hover:text-white transition-colors"
            title="Pindahkan ke Album"
          >
            <FolderInput className="h-4 w-4 text-sky-400" />
            <span className="hidden sm:inline">Pindah Album</span>
          </button>
        )}

        {/* Add to Album */}
        {onAddToAlbum && (
          <button
            onClick={onAddToAlbum}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 text-xs font-medium text-zinc-200 hover:text-white transition-colors"
            title="Tambahkan ke Album"
          >
            <FolderPlus className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">Tambah Album</span>
          </button>
        )}

        {/* Remove from Album (if in album view) */}
        {inAlbumContext && onRemoveFromAlbum && (
          <button
            onClick={onRemoveFromAlbum}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 text-xs font-medium text-zinc-200 hover:text-amber-400 transition-colors"
            title="Keluarkan dari Album"
          >
            <FolderMinus className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">Keluarkan</span>
          </button>
        )}

        {/* Favorite */}
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-rose-400 transition-colors"
            title="Favoritkan"
          >
            <Heart className="h-4 w-4" />
          </button>
        )}

        {/* Download */}
        {onDownloadAll && (
          <button
            onClick={onDownloadAll}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Unduh File"
          >
            <Download className="h-4 w-4" />
          </button>
        )}

        {/* Delete to Trash */}
        {onDeleteToTrash && (
          <button
            onClick={onDeleteToTrash}
            className="p-2 rounded-xl hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 transition-colors"
            title="Hapus ke Trash"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
