import React, { useState, Suspense, useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import WatermarkControls from "#/components/WatermarkControls";
import UploadQueue from "#/components/UploadQueue";
import type { QueueFile } from "#/components/UploadQueue";
import type { TextWatermarkConfig, ImageWatermarkConfig } from "#/lib/watermark-utils";
import {
  DEBOUNCE_MS,
  DEFAULT_TEXT_CONFIG,
  DEFAULT_IMAGE_CONFIG,
  STORAGE_KEYS,
} from "#/lib/watermark-constants";
import { Button } from "#/components/ui/button";
import JSZip from "jszip";
import { Download, FileDown, Upload } from "lucide-react";

const EmbedPdfViewer = React.lazy(() =>
  typeof window !== "undefined"
    ? import("#/components/EmbedPdfViewer")
    : Promise.resolve({
        default: ({ isLoading }: { pdfBlobUrl: string | null; isLoading?: boolean }) => (
          <div className="flex items-center justify-center h-full text-[var(--sea-ink-soft)]">
            {isLoading ? "Applying watermark…" : "Loading viewer…"}
          </div>
        ),
      }),
);

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.byteLength; i++) binary += String.fromCharCode(arr[i]);
  return window.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const bin = window.atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const applyWatermarkServerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      pdfBase64: string;
      mode: "text" | "image";
      textConfig?: TextWatermarkConfig;
      imageConfig?: ImageWatermarkConfig;
      imageBase64?: string;
      imageType?: "png" | "jpeg";
    }) => data,
  )
  .handler(async ({ data }) => {
    const { applyTextWatermark, applyImageWatermark } = await import("#/lib/watermark-utils");
    const pdfBytes = new Uint8Array(Buffer.from(data.pdfBase64, "base64"));
    let out: Uint8Array;
    if (data.mode === "text") {
      if (!data.textConfig) throw new Error("Missing textConfig");
      out = await applyTextWatermark(pdfBytes, data.textConfig);
    } else {
      if (!data.imageBase64 || !data.imageType || !data.imageConfig)
        throw new Error("Missing image props");
      const imgBytes = new Uint8Array(Buffer.from(data.imageBase64, "base64"));
      out = await applyImageWatermark(pdfBytes, imgBytes, data.imageType, data.imageConfig);
    }
    return { pdfBase64: Buffer.from(out).toString("base64") };
  });

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [files, setFiles] = useState<QueueFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [textConfig, setTextConfig] = useState<TextWatermarkConfig>(DEFAULT_TEXT_CONFIG);

  const [imageConfig, setImageConfig] = useState<ImageWatermarkConfig>(DEFAULT_IMAGE_CONFIG);

  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const viewerUrlRef = useRef<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);

  // Load configuration from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem(STORAGE_KEYS.mode);
      if (savedMode === "text" || savedMode === "image") setMode(savedMode);

      const savedTextConfig = localStorage.getItem(STORAGE_KEYS.textConfig);
      if (savedTextConfig) {
        try {
          setTextConfig((prev) => ({ ...prev, ...JSON.parse(savedTextConfig) }));
        } catch (e) {
          console.error("Failed to parse textConfig from localStorage", e);
        }
      }

      const savedImageConfig = localStorage.getItem(STORAGE_KEYS.imageConfig);
      if (savedImageConfig) {
        try {
          setImageConfig((prev) => ({ ...prev, ...JSON.parse(savedImageConfig) }));
        } catch (e) {
          console.error("Failed to parse imageConfig from localStorage", e);
        }
      }
    }
  }, []);

  // Load default watermark image (/watermark.png converted from watermark.webp)
  useEffect(() => {
    fetch("/watermark.png")
      .then((res) => res.blob())
      .then((blob) => {
        const defaultFile = new File([blob], "watermark.png", { type: "image/png" });
        setImageFile(defaultFile);
      })
      .catch((err) => console.error("Failed to load default watermark image:", err));
  }, []);

  // Save configuration to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.mode, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.textConfig, JSON.stringify(textConfig));
    }
  }, [textConfig]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.imageConfig, JSON.stringify(imageConfig));
    }
  }, [imageConfig]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeItem = activeFileIndex !== null ? files[activeFileIndex] : null;

  // Core watermark generation function
  const applyAndRender = useCallback(
    async (file: File) => {
      setIsGenerating(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfBytes = new Uint8Array(arrayBuffer);
        let outputBytes: Uint8Array;

        try {
          const { applyTextWatermark, applyImageWatermark } = await import("#/lib/watermark-utils");
          if (mode === "text") {
            outputBytes = await applyTextWatermark(pdfBytes, textConfig);
          } else {
            if (!imageFile) {
              setIsGenerating(false);
              return;
            }
            const imgBuf = await imageFile.arrayBuffer();
            const imgType = imageFile.type.includes("png") ? "png" : "jpeg";
            outputBytes = await applyImageWatermark(
              pdfBytes,
              new Uint8Array(imgBuf),
              imgType as any,
              imageConfig,
            );
          }
        } catch {
          // Server fallback
          const pdfBase64 = uint8ArrayToBase64(pdfBytes);
          let imageBase64: string | undefined;
          let imageType: "png" | "jpeg" | undefined;
          if (mode === "image" && imageFile) {
            const imgBuf = await imageFile.arrayBuffer();
            imageBase64 = uint8ArrayToBase64(new Uint8Array(imgBuf));
            imageType = imageFile.type.includes("png") ? "png" : "jpeg";
          }
          const res = await applyWatermarkServerFn({
            data: { pdfBase64, mode, textConfig, imageConfig, imageBase64, imageType },
          });
          outputBytes = base64ToUint8Array(res.pdfBase64);
        }

        // Use Blob URL — EmbedPDF renders correctly with blob: not data:
        const blob = new Blob([outputBytes as any], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        // Revoke previous blob URL to avoid memory leaks
        if (viewerUrlRef.current && viewerUrlRef.current.startsWith("blob:")) {
          URL.revokeObjectURL(viewerUrlRef.current);
        }
        viewerUrlRef.current = blobUrl;
        setViewerUrl(blobUrl);
      } catch (err) {
        console.error("Preview generation failed:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [mode, textConfig, imageConfig, imageFile],
  );

  // Debounced auto-preview whenever file or configs change
  useEffect(() => {
    if (!activeItem) {
      setViewerUrl(null);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void applyAndRender(activeItem.file);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [activeItem, applyAndRender]);

  // Batch download
  const processAndDownload = async (asZip: boolean) => {
    if (files.length === 0) return;
    setProcessingBatch(true);
    try {
      const zip = asZip ? new JSZip() : null;
      const list = [...files];

      let imageBytes: Uint8Array | null = null;
      let imgType: "png" | "jpeg" = "png";
      if (mode === "image" && imageFile) {
        imageBytes = new Uint8Array(await imageFile.arrayBuffer());
        imgType = imageFile.type.includes("png") ? "png" : "jpeg";
      }

      for (let i = 0; i < files.length; i++) {
        list[i].status = "processing";
        setFiles([...list]);
        try {
          const pdfBytes = new Uint8Array(await files[i].file.arrayBuffer());
          let out: Uint8Array;
          try {
            const { applyTextWatermark, applyImageWatermark } =
              await import("#/lib/watermark-utils");
            if (mode === "text") {
              out = await applyTextWatermark(pdfBytes, textConfig);
            } else {
              if (!imageBytes) throw new Error("No watermark image.");
              out = await applyImageWatermark(pdfBytes, imageBytes, imgType, imageConfig);
            }
          } catch {
            const pdfBase64 = uint8ArrayToBase64(pdfBytes);
            let imageBase64: string | undefined;
            if (mode === "image" && imageFile)
              imageBase64 = uint8ArrayToBase64(new Uint8Array(await imageFile.arrayBuffer()));
            const res = await applyWatermarkServerFn({
              data: { pdfBase64, mode, textConfig, imageConfig, imageBase64, imageType: imgType },
            });
            out = base64ToUint8Array(res.pdfBase64);
          }

          const blob = new Blob([out as any], { type: "application/pdf" });
          const name = files[i].file.name.replace(/\.pdf$/, "_watermarked.pdf");
          if (asZip && zip) {
            zip.file(name, blob);
          } else {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
          }
          list[i].status = "completed";
        } catch {
          list[i].status = "failed";
        }
        setFiles([...list]);
      }

      if (asZip && zip) {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(zipBlob);
        a.download = "watermarked_pdfs.zip";
        a.click();
      }
    } finally {
      setProcessingBatch(false);
    }
  };

  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const dragCounter = useRef(0);

  const handleGlobalFiles = useCallback(
    (fileList: FileList | File[]) => {
      const added: QueueFile[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          added.push({ file, status: "pending" });
        }
      }
      if (added.length > 0) {
        setFiles((prev) => {
          const updated = [...prev, ...added];
          if (activeFileIndex === null) {
            setActiveFileIndex(prev.length);
          }
          return updated;
        });
      }
    },
    [activeFileIndex],
  );

  const handleGlobalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      setIsDraggingGlobal(true);
    }
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDraggingGlobal(false);
    }
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGlobal(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleGlobalFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative"
      onDragEnter={handleGlobalDragEnter}
      onDragLeave={handleGlobalDragLeave}
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
    >
      {/* ── GLOBAL DRAG & DROP OVERLAY ── */}
      {isDraggingGlobal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0193cd]/40 backdrop-blur-sm transition-all animate-in fade-in duration-200 pointer-events-none">
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-dashed border-white/60 bg-white/10 shadow-2xl text-white max-w-md text-center">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-brand tracking-tight">
                Drop PDF Files Anywhere
              </h2>
              <p className="text-sm opacity-90 mt-1">
                Release your files to automatically add them to the queue
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STICKY HEADER ── */}
      <header className="shrink-0 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-md z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="SomeMath Logo" className="h-9 w-9 object-contain" />
            <h1 className="text-xl font-extrabold brand-title leading-none select-none">
              SomeMath
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={files.length === 0 || processingBatch}
              onClick={() => processAndDownload(false)}
              className="gap-1.5 border-[var(--line)] bg-white/60 hover:bg-white/90 text-[var(--sea-ink)]"
            >
              <Download className="h-3.5 w-3.5" />
              {processingBatch ? "Processing…" : "Download All"}
            </Button>
            <Button
              size="sm"
              disabled={files.length === 0 || processingBatch}
              onClick={() => processAndDownload(true)}
              className="gap-1.5 bg-[var(--lagoon)] hover:bg-[var(--lagoon-deep)] text-white"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export ZIP
            </Button>
          </div>
        </div>
      </header>

      {/* ── THREE-COLUMN LAYOUT — fills remaining height ── */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 px-4 py-4 max-w-screen-2xl mx-auto w-full">
        {/* LEFT: File queue — scrollable */}
        <aside className="h-full overflow-y-auto">
          <UploadQueue
            files={files}
            setFiles={setFiles}
            activeFileIndex={activeFileIndex}
            setActiveFileIndex={setActiveFileIndex}
          />
        </aside>

        {/* CENTER: Single live EmbedPDF preview — fills height */}
        <main className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between mb-2 px-1 shrink-0">
            <p className="island-kicker">Live Preview</p>
            {isGenerating && (
              <span className="text-[10px] font-semibold text-[var(--lagoon)] animate-pulse">
                ● Rendering…
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full island-shell rounded-2xl text-[var(--sea-ink-soft)]">
                  Loading viewer…
                </div>
              }
            >
              <EmbedPdfViewer pdfBlobUrl={viewerUrl} isLoading={isGenerating} />
            </Suspense>
          </div>
        </main>

        {/* RIGHT: Controls — scrollable */}
        <aside className="h-full overflow-y-auto">
          <WatermarkControls
            mode={mode}
            setMode={setMode}
            textConfig={textConfig}
            setTextConfig={setTextConfig}
            imageConfig={imageConfig}
            setImageConfig={setImageConfig}
            imageFile={imageFile}
            setImageFile={setImageFile}
          />
        </aside>
      </div>
    </div>
  );
}
