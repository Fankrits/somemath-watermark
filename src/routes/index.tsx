import React, { useState, Suspense, useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import WatermarkControls from "#/components/WatermarkControls";
import UploadQueue from "#/components/UploadQueue";
import type { QueueFile } from "#/components/UploadQueue";
import type { TextWatermarkConfig, ImageWatermarkConfig } from "#/lib/watermark-utils";
import { Button } from "#/components/ui/button";
import JSZip from "jszip";
import { Download, FileDown, Layers } from "lucide-react";

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

const DEBOUNCE_MS = 600;

function Home() {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [files, setFiles] = useState<QueueFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [textConfig, setTextConfig] = useState<TextWatermarkConfig>({
    text: "CONFIDENTIAL",
    fontFamily: "Helvetica",
    fontSize: 32,
    color: "#ff0000",
    opacity: 0.5,
    rotation: -45,
    placement: "middle-center",
    xOffset: 0,
    yOffset: 0,
    isBold: false,
    isItalic: false,
  });

  const [imageConfig, setImageConfig] = useState<ImageWatermarkConfig>({
    scale: 0.5,
    opacity: 0.5,
    rotation: 0,
    placement: "middle-center",
    xOffset: 0,
    yOffset: 0,
  });

  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);

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

        let binary = "";
        for (let i = 0; i < outputBytes.byteLength; i++)
          binary += String.fromCharCode(outputBytes[i]);
        const base64 = window.btoa(binary);
        setViewerUrl(`data:application/pdf;base64,${base64}`);
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--lagoon)] shadow-md">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight display-title text-[var(--sea-ink)] leading-none">
                PDF Watermark Studio
              </h1>
              <p className="text-[10px] text-[var(--sea-ink-soft)] font-medium">
                100% local · no upload · live preview
              </p>
            </div>
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

      {/* ── THREE-COLUMN LAYOUT ── */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 px-4 py-6">
        {/* LEFT: File queue */}
        <aside className="flex flex-col gap-4">
          <UploadQueue
            files={files}
            setFiles={setFiles}
            activeFileIndex={activeFileIndex}
            setActiveFileIndex={setActiveFileIndex}
          />
        </aside>

        {/* CENTER: Single live EmbedPDF preview */}
        <main className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="island-kicker">Live Preview</p>
            {isGenerating && (
              <span className="text-[10px] font-semibold text-[var(--lagoon)] animate-pulse">
                ● Rendering…
              </span>
            )}
          </div>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-[640px] island-shell rounded-2xl text-[var(--sea-ink-soft)]">
                Loading viewer…
              </div>
            }
          >
            <EmbedPdfViewer pdfBlobUrl={viewerUrl} isLoading={isGenerating} />
          </Suspense>
        </main>

        {/* RIGHT: Controls */}
        <aside className="flex flex-col gap-4">
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
