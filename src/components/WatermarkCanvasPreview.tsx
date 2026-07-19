import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { applyTextWatermark, applyImageWatermark } from "#/lib/watermark-utils";
import type { TextWatermarkConfig, ImageWatermarkConfig } from "#/lib/watermark-utils";

// Set up PDF.js worker locally
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PreviewProps {
  pdfFile: File | null;
  textConfig?: TextWatermarkConfig;
  textWatermark?: TextWatermarkConfig;
  imageConfig?: ImageWatermarkConfig;
  imageWatermark?: ImageWatermarkConfig;
  mode: "text" | "image";
  imageFile: File | null;
}

export default function WatermarkCanvasPreview({
  pdfFile,
  textConfig,
  textWatermark,
  imageConfig,
  imageWatermark,
  mode,
  imageFile,
}: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);

  // Render PDF page to canvas with watermark applied
  useEffect(() => {
    if (!pdfFile || !canvasRef.current) return;

    let active = true;
    let currentPdfDoc: any = null;
    let currentRenderTask: any = null;

    const renderPage = async () => {
      setLoading(true);
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        if (!active) return;
        const pdfBytes = new Uint8Array(arrayBuffer);
        let watermarkedBytes: Uint8Array;

        const activeTextConfig = textWatermark || textConfig;
        const activeImageConfig = imageWatermark || imageConfig;

        // Apply watermark using pdf-lib core functions in-memory
        if (mode === "text") {
          if (activeTextConfig) {
            watermarkedBytes = await applyTextWatermark(pdfBytes, activeTextConfig);
          } else {
            watermarkedBytes = pdfBytes;
          }
        } else {
          if (imageFile && activeImageConfig) {
            const imageArrayBuffer = await imageFile.arrayBuffer();
            if (!active) return;
            const imgType = imageFile.type.includes("png") ? "png" : "jpeg";
            watermarkedBytes = await applyImageWatermark(
              pdfBytes,
              new Uint8Array(imageArrayBuffer),
              imgType as any,
              activeImageConfig,
            );
          } else {
            watermarkedBytes = pdfBytes;
          }
        }
        if (!active) return;

        const loadingTask = pdfjsLib.getDocument({ data: watermarkedBytes });
        const pdfDoc = await loadingTask.promise;
        if (!active) {
          if (pdfDoc && typeof (pdfDoc as any).destroy === "function") {
            (pdfDoc as any).destroy();
          }
          return;
        }
        currentPdfDoc = pdfDoc;

        const page = await pdfDoc.getPage(1); // Renders the first page
        if (!active) return;

        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d")!;

        // Scale canvas according to its display wrapper
        const containerWidth = containerRef.current?.clientWidth || viewport.width;
        const scale = (containerWidth - 32) / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        setPageDimensions({ width: scaledViewport.width, height: scaledViewport.height });

        // Clear canvas context first
        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
          canvas: canvas,
        };
        currentRenderTask = page.render(renderContext);
        await currentRenderTask.promise;
      } catch (err) {
        if (err && (err as any).name === "RenderingCancelledException") {
          return;
        }
        console.error("Error rendering page:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    // Debounce preview updates slightly to avoid high CPU usage during slider dragging
    const timeout = setTimeout(renderPage, 150);
    return () => {
      active = false;
      clearTimeout(timeout);
      if (currentRenderTask && typeof currentRenderTask.cancel === "function") {
        currentRenderTask.cancel();
      }
      if (currentPdfDoc && typeof currentPdfDoc.destroy === "function") {
        currentPdfDoc.destroy();
      }
    };
  }, [pdfFile, textConfig, textWatermark, imageConfig, imageWatermark, mode, imageFile]);

  if (!pdfFile) {
    return (
      <div className="flex h-[500px] items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50">
        <p className="text-gray-500">Upload a PDF to view the live preview editor</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-slate-900 border rounded-lg shadow-inner p-4 flex justify-center"
    >
      {loading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white z-10">
          Updating preview...
        </div>
      )}
      <div
        className="relative border shadow-lg bg-white"
        style={{ width: pageDimensions.width, height: pageDimensions.height }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
