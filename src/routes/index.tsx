import React, { useState, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import WatermarkControls from "#/components/WatermarkControls";
import UploadQueue from "#/components/UploadQueue";
import type { QueueFile } from "#/components/UploadQueue";
import type { TextWatermarkConfig, ImageWatermarkConfig } from "#/lib/watermark-utils";
import { Button } from "#/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import JSZip from "jszip";
import { Download, FileDown, Layers, Sparkles, Eye } from "lucide-react";

const WatermarkCanvasPreview = React.lazy(() =>
  typeof window !== "undefined"
    ? import("#/components/WatermarkCanvasPreview")
    : Promise.resolve({
        default: () => (
          <div className="flex items-center justify-center h-full text-[var(--sea-ink-soft)]">
            Loading editor...
          </div>
        ),
      }),
);

const EmbedPdfViewer = React.lazy(() =>
  typeof window !== "undefined"
    ? import("#/components/EmbedPdfViewer")
    : Promise.resolve({
        default: () => (
          <div className="flex items-center justify-center h-full text-[var(--sea-ink-soft)]">
            Loading reader...
          </div>
        ),
      }),
);

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return window.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const applyWatermarkServerFn = createServerFn({
  method: "POST",
})
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
    let outputBytes: Uint8Array;

    if (data.mode === "text") {
      if (!data.textConfig) throw new Error("Missing textConfig");
      outputBytes = await applyTextWatermark(pdfBytes, data.textConfig);
    } else {
      if (!data.imageBase64 || !data.imageType || !data.imageConfig) {
        throw new Error("Missing image properties");
      }
      const imageBytes = new Uint8Array(Buffer.from(data.imageBase64, "base64"));
      outputBytes = await applyImageWatermark(
        pdfBytes,
        imageBytes,
        data.imageType,
        data.imageConfig,
      );
    }

    const resultBase64 = Buffer.from(outputBytes).toString("base64");
    return { pdfBase64: resultBase64 };
  });

export const Route = createFileRoute("/")({ component: Home });

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

  const [viewerBlobUrl, setViewerBlobUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [previewTab, setPreviewTab] = useState("workspace");

  const activeItem = activeFileIndex !== null ? files[activeFileIndex] : null;

  const generatePreviewDoc = async () => {
    if (!activeItem) return;
    setGeneratingPreview(true);
    try {
      const arrayBuffer = await activeItem.file.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);
      let outputBytes: Uint8Array;

      try {
        const { applyTextWatermark, applyImageWatermark } = await import("#/lib/watermark-utils");
        if (mode === "text") {
          outputBytes = await applyTextWatermark(pdfBytes, textConfig);
        } else {
          if (!imageFile) {
            alert("Please select an image file first.");
            return;
          }
          const imageArrayBuffer = await imageFile.arrayBuffer();
          const imgType = imageFile.type.includes("png") ? "png" : "jpeg";
          outputBytes = await applyImageWatermark(
            pdfBytes,
            new Uint8Array(imageArrayBuffer),
            imgType as any,
            imageConfig,
          );
        }
      } catch (clientErr) {
        console.warn("Client-side watermark failed, trying server fallback:", clientErr);
        const pdfBase64 = uint8ArrayToBase64(pdfBytes);
        let imageBase64: string | undefined;
        let imageType: "png" | "jpeg" | undefined;
        if (mode === "image" && imageFile) {
          const imgAB = await imageFile.arrayBuffer();
          imageBase64 = uint8ArrayToBase64(new Uint8Array(imgAB));
          imageType = imageFile.type.includes("png") ? "png" : "jpeg";
        }
        const res = await applyWatermarkServerFn({
          data: { pdfBase64, mode, textConfig, imageConfig, imageBase64, imageType },
        });
        outputBytes = base64ToUint8Array(res.pdfBase64);
      }

      let binary = "";
      const len = outputBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(outputBytes[i]);
      }
      const base64 = window.btoa(binary);
      if (viewerBlobUrl && viewerBlobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(viewerBlobUrl);
      }
      setViewerBlobUrl(`data:application/pdf;base64,${base64}`);
      // Auto-switch to reader tab after generating
      setPreviewTab("reader");
    } catch (err) {
      console.error("Error generating preview document:", err);
      alert("Failed to generate preview: " + err);
    } finally {
      setGeneratingPreview(false);
    }
  };

  const processAndDownload = async (asZip: boolean) => {
    if (files.length === 0) return;
    setProcessingBatch(true);

    try {
      const zip = asZip ? new JSZip() : null;
      const processedFilesList = [...files];

      let imageBytes: Uint8Array | null = null;
      let imgType: "png" | "jpeg" = "png";
      if (mode === "image" && imageFile) {
        imageBytes = new Uint8Array(await imageFile.arrayBuffer());
        imgType = imageFile.type.includes("png") ? "png" : ("jpeg" as any);
      }

      for (let i = 0; i < files.length; i++) {
        processedFilesList[i].status = "processing";
        setFiles([...processedFilesList]);

        try {
          const arrayBuffer = await files[i].file.arrayBuffer();
          const pdfBytes = new Uint8Array(arrayBuffer);
          let outputBytes: Uint8Array;

          try {
            const { applyTextWatermark, applyImageWatermark } =
              await import("#/lib/watermark-utils");
            if (mode === "text") {
              outputBytes = await applyTextWatermark(pdfBytes, textConfig);
            } else {
              if (!imageBytes) throw new Error("No watermark image uploaded.");
              outputBytes = await applyImageWatermark(pdfBytes, imageBytes, imgType, imageConfig);
            }
          } catch (clientErr) {
            console.warn("Client-side watermark failed, trying server fallback:", clientErr);
            const pdfBase64 = uint8ArrayToBase64(pdfBytes);
            let imageBase64: string | undefined;
            if (mode === "image" && imageFile) {
              const imgAB = await imageFile.arrayBuffer();
              imageBase64 = uint8ArrayToBase64(new Uint8Array(imgAB));
            }
            const res = await applyWatermarkServerFn({
              data: {
                pdfBase64,
                mode,
                textConfig,
                imageConfig,
                imageBase64,
                imageType: imgType,
              },
            });
            outputBytes = base64ToUint8Array(res.pdfBase64);
          }

          const blob = new Blob([outputBytes as any], { type: "application/pdf" });

          if (asZip && zip) {
            const name = files[i].file.name.replace(/\.pdf$/, "_watermarked.pdf");
            zip.file(name, blob);
          } else {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = files[i].file.name.replace(/\.pdf$/, "_watermarked.pdf");
            link.click();
          }

          processedFilesList[i].status = "completed";
        } catch (e) {
          console.error("Error watermarking file " + files[i].file.name, e);
          processedFilesList[i].status = "failed";
        }
        setFiles([...processedFilesList]);
      }

      if (asZip && zip) {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipBlob);
        link.download = "watermarked_pdfs.zip";
        link.click();
      }
    } catch (err) {
      console.error("Batch download failed:", err);
    } finally {
      setProcessingBatch(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── TOP HEADER BAR ── */}
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
                100% local · no upload · no server
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
      <div className="flex-1 max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-0 px-4 py-6 gap-x-4">
        {/* ── LEFT: File Queue ── */}
        <aside className="flex flex-col gap-4">
          <UploadQueue
            files={files}
            setFiles={setFiles}
            activeFileIndex={activeFileIndex}
            setActiveFileIndex={setActiveFileIndex}
          />
        </aside>

        {/* ── CENTER: Preview ── */}
        <main className="flex flex-col gap-4 min-h-0">
          <Tabs value={previewTab} onValueChange={setPreviewTab} className="flex flex-col flex-1">
            <div className="flex items-center justify-between">
              <TabsList className="bg-white/50 border border-[var(--line)]">
                <TabsTrigger value="workspace" className="gap-1.5 text-xs">
                  <Sparkles className="h-3 w-3" /> Live Workspace
                </TabsTrigger>
                <TabsTrigger value="reader" className="gap-1.5 text-xs">
                  <Eye className="h-3 w-3" /> High-Fi Reader
                </TabsTrigger>
              </TabsList>

              {activeItem && (
                <Button
                  size="sm"
                  disabled={generatingPreview}
                  onClick={generatePreviewDoc}
                  className="gap-1.5 text-xs bg-[var(--lagoon)] hover:bg-[var(--lagoon-deep)] text-white"
                >
                  <Eye className="h-3 w-3" />
                  {generatingPreview ? "Generating…" : "Preview Watermarked PDF"}
                </Button>
              )}
            </div>

            <TabsContent value="workspace" className="flex-1 mt-4">
              <div className="island-shell rounded-2xl overflow-hidden" style={{ minHeight: 560 }}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-96 text-[var(--sea-ink-soft)]">
                      Loading editor…
                    </div>
                  }
                >
                  <WatermarkCanvasPreview
                    pdfFile={activeItem ? activeItem.file : null}
                    textConfig={textConfig}
                    imageConfig={imageConfig}
                    mode={mode}
                    imageFile={imageFile}
                  />
                </Suspense>
              </div>
            </TabsContent>

            <TabsContent value="reader" className="flex-1 mt-4">
              <div className="island-shell rounded-2xl overflow-hidden" style={{ minHeight: 560 }}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-96 text-[var(--sea-ink-soft)]">
                      Loading reader…
                    </div>
                  }
                >
                  <EmbedPdfViewer pdfBlobUrl={viewerBlobUrl} />
                </Suspense>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* ── RIGHT: Controls ── */}
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
