import { PDFViewer } from "@embedpdf/react-pdf-viewer";

interface ViewerProps {
  pdfBlobUrl: string | null;
}

export default function EmbedPdfViewer({ pdfBlobUrl }: ViewerProps) {
  if (!pdfBlobUrl) {
    return (
      <div className="flex h-[550px] items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50">
        <p className="text-gray-500">Click "Generate High-Fidelity Preview" to load doc reader</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] border rounded-lg overflow-hidden shadow-inner bg-slate-100">
      <PDFViewer
        config={{
          src: pdfBlobUrl,
          theme: { preference: "light" },
        }}
      />
    </div>
  );
}
