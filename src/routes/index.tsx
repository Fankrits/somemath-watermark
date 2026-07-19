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
import { Download, FileDown, Layers } from "lucide-react";

const WatermarkCanvasPreview = React.lazy(() =>
  typeof window !== "undefined"
    ? import("#/components/WatermarkCanvasPreview")
    : Promise.resolve({
        default: () => <div className="p-8 text-center text-gray-500">Loading editor...</div>,
      }),
);

const EmbedPdfViewer = React.lazy(() =>
  typeof window !== "undefined"
    ? import("#/components/EmbedPdfViewer")
    : Promise.resolve({
        default: () => <div className="p-8 text-center text-gray-500">Loading reader...</div>,
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

  const activeItem = activeFileIndex !== null ? files[activeFileIndex] : null;

  // Generate high-fidelity preview binary for current active document
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
          data: {
            pdfBase64,
            mode,
            textConfig,
            imageConfig,
            imageBase64,
            imageType,
          },
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
    } catch (err) {
      console.error("Error generating preview document:", err);
      alert("Failed to generate preview: " + err);
    } finally {
      setGeneratingPreview(false);
    }
  };

  // Run batch processing for all files in queue
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
            // Trigger direct download
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
    <div className="min-h-screen py-10 px-4 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2 display-title">
            <Layers className="h-7 w-7 text-primary" /> PDF Watermarking Studio
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Add text or image watermarks securely and locally in your browser.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button
            variant="outline"
            disabled={files.length === 0 || processingBatch}
            onClick={() => processAndDownload(false)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Download Separately
          </Button>
          <Button
            disabled={files.length === 0 || processingBatch}
            onClick={() => processAndDownload(true)}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" /> Download ZIP Archive
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <UploadQueue
            files={files}
            setFiles={setFiles}
            activeFileIndex={activeFileIndex}
            setActiveFileIndex={setActiveFileIndex}
          />

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

        <main className="lg:col-span-8 space-y-6">
          <Tabs defaultValue="workspace" className="w-full">
            <div className="flex items-center justify-between border-b pb-2">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="workspace">Live Workspace</TabsTrigger>
                <TabsTrigger value="reader">High-Fi Reader</TabsTrigger>
              </TabsList>
              {activeItem && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={generatingPreview}
                  onClick={generatePreviewDoc}
                  className="flex items-center gap-1.5"
                >
                  {generatingPreview ? "Generating..." : "Generate High-Fidelity Preview"}
                </Button>
              )}
            </div>

            <TabsContent value="workspace" className="mt-6">
              <Suspense
                fallback={<div className="p-8 text-center text-gray-500">Loading editor...</div>}
              >
                <WatermarkCanvasPreview
                  pdfFile={activeItem ? activeItem.file : null}
                  textConfig={textConfig}
                  imageConfig={imageConfig}
                  mode={mode}
                  imageFile={imageFile}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="reader" className="mt-6">
              <Suspense
                fallback={<div className="p-8 text-center text-gray-500">Loading reader...</div>}
              >
                <EmbedPdfViewer pdfBlobUrl={viewerBlobUrl} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
