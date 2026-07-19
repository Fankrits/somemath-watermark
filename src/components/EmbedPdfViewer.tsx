import { PDFViewer } from "@embedpdf/react-pdf-viewer";
import { Loader2, FileText } from "lucide-react";

interface ViewerProps {
  pdfBlobUrl: string | null;
  isLoading?: boolean;
}

export default function EmbedPdfViewer({ pdfBlobUrl, isLoading = false }: ViewerProps) {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden island-shell"
      style={{ minHeight: 640 }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--lagoon)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--sea-ink-soft)]">
            Applying watermark…
          </p>
        </div>
      )}

      {/* Empty state */}
      {!pdfBlobUrl && !isLoading && (
        <div className="flex h-full min-h-[640px] flex-col items-center justify-center gap-4 text-center px-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--lagoon)]/10 border border-[var(--lagoon)]/20">
            <FileText className="h-10 w-10 text-[var(--lagoon)]" />
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--sea-ink)]">No PDF selected</p>
            <p className="text-sm text-[var(--sea-ink-soft)] mt-1">
              Upload a PDF from the file queue on the left and the live preview will appear here
              automatically.
            </p>
          </div>
        </div>
      )}

      {/* PDF viewer */}
      {pdfBlobUrl && (
        <PDFViewer
          config={{
            src: pdfBlobUrl,
            theme: { preference: "light" },
          }}
          style={{ width: "100%", height: "100%", minHeight: 640 }}
        />
      )}
    </div>
  );
}
