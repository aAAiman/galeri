"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import * as tus from "tus-js-client";

export interface UploadTask {
  id: string;
  file: File;
  name: string;
  size: number;
  loaded: number;
  progress: number;
  speed: string;
  status: "waiting" | "uploading" | "paused" | "completed" | "failed";
  errorMessage?: string;
  targetAlbumId?: number | null;
  targetAlbumName?: string | null;
}

interface UploadContextType {
  tasks: UploadTask[];
  isWidgetOpen: boolean;
  isWidgetMinimized: boolean;
  uploadFiles: (
    files: File[],
    targetAlbumId?: number | null,
    targetAlbumName?: string | null
  ) => void;
  openFilePicker: (
    targetAlbumId?: number | null,
    targetAlbumName?: string | null
  ) => void;
  pauseTask: (id: string) => void;
  resumeTask: (id: string) => void;
  retryTask: (id: string) => void;
  cancelTask: (id: string) => void;
  clearFinished: () => void;
  closeWidget: () => void;
  toggleMinimize: () => void;
  activeUploadCount: number;
  overallProgress: number;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);

  // Synchronous tasks ref and FIFO queue ref
  const tasksRef = useRef<UploadTask[]>([]);
  const queueRef = useRef<UploadTask[]>([]);
  const activeWorkersCountRef = useRef(0);
  const MAX_CONCURRENT = 2;

  // Hidden file input for programmatically triggering file picker anywhere
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const currentTargetAlbumRef = useRef<{
    id?: number | null;
    name?: string | null;
  }>({});

  // Active TUS upload instances stored by task id
  const tusMapRef = useRef<Map<string, tus.Upload>>(new Map());

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const uploadSingleTask = async (task: UploadTask): Promise<void> => {
    return new Promise<void>((resolve) => {
      let lastLoaded = task.loaded || 0;
      let lastTime = Date.now();

      const upload = new tus.Upload(task.file, {
        endpoint: "/api/upload/tus",
        chunkSize: 8 * 1024 * 1024, // 8 MiB chunks
        retryDelays: [0, 1000, 3000, 5000, 10000],
        metadata: {
          filename: task.file.name,
          filetype: task.file.type || "application/octet-stream",
          targetAlbumId: task.targetAlbumId ? task.targetAlbumId.toString() : "",
        },
        onError: (error) => {
          console.error("TUS upload error for", task.name, error);
          tasksRef.current = tasksRef.current.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: "failed",
                  errorMessage: error.message || "Gagal mengunggah file",
                  speed: "Gagal",
                }
              : t
          );
          setTasks([...tasksRef.current]);
          resolve();
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const now = Date.now();
          const timeDelta = (now - lastTime) / 1000;
          let speedStr = "";

          if (timeDelta >= 0.5) {
            const bytesDelta = bytesUploaded - lastLoaded;
            const bytesPerSec = bytesDelta / Math.max(0.001, timeDelta);
            speedStr = formatBytes(bytesPerSec) + "/s";
            lastLoaded = bytesUploaded;
            lastTime = now;
          }

          const total = bytesTotal || task.size;
          const percent =
            total > 0
              ? Math.min(99, Math.round((bytesUploaded / total) * 100))
              : 0;

          tasksRef.current = tasksRef.current.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  loaded: bytesUploaded,
                  progress: percent,
                  speed: speedStr || t.speed || `${percent}%`,
                }
              : t
          );
          setTasks([...tasksRef.current]);
        },
        onSuccess: () => {
          tusMapRef.current.delete(task.id);
          tasksRef.current = tasksRef.current.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  loaded: task.size,
                  progress: 100,
                  status: "completed",
                  speed: "Selesai",
                }
              : t
          );
          setTasks([...tasksRef.current]);

          // Dispatch event so active galleries / album views can seamlessly auto-refresh
          try {
            window.dispatchEvent(
              new CustomEvent("galerikita:refresh", {
                detail: { targetAlbumId: task.targetAlbumId },
              })
            );
          } catch {
            // ignore
          }

          resolve();
        },
      });

      tusMapRef.current.set(task.id, upload);

      // Check if there are previous uploads in localStorage to resume seamlessly
      upload
        .findPreviousUploads()
        .then((previousUploads) => {
          if (previousUploads.length > 0) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        })
        .catch(() => {
          upload.start();
        });
    });
  };

  const runWorker = async () => {
    while (queueRef.current.length > 0) {
      const nextTask = queueRef.current.shift();
      if (!nextTask) break;

      // Verify task hasn't been canceled in the meantime
      const current = tasksRef.current.find((t) => t.id === nextTask.id);
      if (!current || current.status !== "waiting") continue;

      tasksRef.current = tasksRef.current.map((t) =>
        t.id === nextTask.id
          ? { ...t, status: "uploading", speed: "Memulai..." }
          : t
      );
      setTasks([...tasksRef.current]);

      await uploadSingleTask(nextTask);
    }
  };

  const processQueue = useCallback(() => {
    while (
      activeWorkersCountRef.current < MAX_CONCURRENT &&
      queueRef.current.length > 0
    ) {
      activeWorkersCountRef.current++;
      runWorker().finally(() => {
        activeWorkersCountRef.current--;
        if (queueRef.current.length > 0) {
          processQueue();
        }
      });
    }
  }, []);

  const uploadFiles = useCallback(
    (
      files: File[],
      targetAlbumId?: number | null,
      targetAlbumName?: string | null
    ) => {
      if (!files || files.length === 0) return;

      const newTasks: UploadTask[] = files.map((file) => ({
        id: "up_" + Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        loaded: 0,
        progress: 0,
        speed: "Menunggu giliran...",
        status: "waiting",
        targetAlbumId,
        targetAlbumName,
      }));

      // Append to ref & state
      tasksRef.current = [...tasksRef.current, ...newTasks];
      setTasks([...tasksRef.current]);
      setIsWidgetOpen(true);
      setIsWidgetMinimized(false);

      // Append to execution queue
      queueRef.current.push(...newTasks);

      // Immediately process queue
      processQueue();
    },
    [processQueue]
  );

  const openFilePicker = useCallback(
    (targetAlbumId?: number | null, targetAlbumName?: string | null) => {
      currentTargetAlbumRef.current = {
        id: targetAlbumId,
        name: targetAlbumName,
      };

      if (!hiddenInputRef.current) {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = "image/*,video/*,.mov,.mp4,.webm,.mkv,.heic,.jpg,.jpeg,.png";
        input.style.display = "none";
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            uploadFiles(
              Array.from(files),
              currentTargetAlbumRef.current.id,
              currentTargetAlbumRef.current.name
            );
          }
          input.value = "";
        };
        document.body.appendChild(input);
        hiddenInputRef.current = input;
      }

      hiddenInputRef.current.click();
    },
    [uploadFiles]
  );

  const pauseTask = useCallback((id: string) => {
    const upload = tusMapRef.current.get(id);
    if (upload) {
      upload.abort();
    }
    tasksRef.current = tasksRef.current.map((t) =>
      t.id === id ? { ...t, status: "paused", speed: "Dijeda" } : t
    );
    setTasks([...tasksRef.current]);
  }, []);

  const resumeTask = useCallback(
    (id: string) => {
      const upload = tusMapRef.current.get(id);
      if (upload) {
        tasksRef.current = tasksRef.current.map((t) =>
          t.id === id
            ? { ...t, status: "uploading", speed: "Melanjutkan..." }
            : t
        );
        setTasks([...tasksRef.current]);
        upload.start();
      } else {
        const task = tasksRef.current.find((t) => t.id === id);
        if (task) {
          tasksRef.current = tasksRef.current.map((t) =>
            t.id === id
              ? { ...t, status: "waiting", speed: "Menunggu giliran..." }
              : t
          );
          setTasks([...tasksRef.current]);
          queueRef.current.push(task);
          processQueue();
        }
      }
    },
    [processQueue]
  );

  const retryTask = useCallback(
    (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (task) {
        const oldUpload = tusMapRef.current.get(id);
        if (oldUpload) {
          oldUpload.abort();
          tusMapRef.current.delete(id);
        }
        tasksRef.current = tasksRef.current.map((t) =>
          t.id === id
            ? {
                ...t,
                status: "waiting",
                speed: "Menunggu giliran...",
                errorMessage: undefined,
              }
            : t
        );
        setTasks([...tasksRef.current]);
        queueRef.current.push(task);
        processQueue();
      }
    },
    [processQueue]
  );

  const cancelTask = useCallback((id: string) => {
    const upload = tusMapRef.current.get(id);
    if (upload) {
      upload.abort(true).catch(() => {});
      tusMapRef.current.delete(id);
    }
    queueRef.current = queueRef.current.filter((t) => t.id !== id);
    tasksRef.current = tasksRef.current.filter((t) => t.id !== id);
    setTasks([...tasksRef.current]);
  }, []);

  const clearFinished = useCallback(() => {
    tasksRef.current = tasksRef.current.filter(
      (t) =>
        t.status === "uploading" ||
        t.status === "waiting" ||
        t.status === "paused"
    );
    setTasks([...tasksRef.current]);
  }, []);

  const closeWidget = useCallback(() => {
    const hasActive = tasksRef.current.some(
      (t) =>
        t.status === "uploading" ||
        t.status === "waiting" ||
        t.status === "paused"
    );
    if (hasActive) {
      setIsWidgetMinimized(true);
    } else {
      setIsWidgetOpen(false);
      tasksRef.current = [];
      setTasks([]);
    }
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsWidgetMinimized((prev) => !prev);
  }, []);

  const activeUploadCount = tasks.filter(
    (t) =>
      t.status === "uploading" ||
      t.status === "waiting" ||
      t.status === "paused"
  ).length;

  const totalLoaded = tasks.reduce((sum, t) => sum + t.loaded, 0);
  const totalSize = tasks.reduce((sum, t) => sum + t.size, 0);
  const overallProgress =
    totalSize > 0 ? Math.round((totalLoaded / totalSize) * 100) : 0;

  return (
    <UploadContext.Provider
      value={{
        tasks,
        isWidgetOpen,
        isWidgetMinimized,
        uploadFiles,
        openFilePicker,
        pauseTask,
        resumeTask,
        retryTask,
        cancelTask,
        clearFinished,
        closeWidget,
        toggleMinimize,
        activeUploadCount,
        overallProgress,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}
