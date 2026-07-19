import { useState, useRef } from "react";
import { Trash2, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";

export interface QueueFile {
  file: File;
  status: "pending" | "processing" | "completed" | "failed";
}

interface QueueProps {
  files: QueueFile[];
  setFiles: (files: QueueFile[]) => void;
  activeFileIndex: number | null;
  setActiveFileIndex: (index: number | null) => void;
}

export default function UploadQueue({
  files,
  setFiles,
  activeFileIndex,
  setActiveFileIndex,
}: QueueProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList) => {
    const added: QueueFile[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      if (file.type === "application/pdf") {
        added.push({ file, status: "pending" });
      }
    }
    const updated = [...files, ...added];
    setFiles(updated);
    if (activeFileIndex === null && updated.length > 0) {
      setActiveFileIndex(0);
    }
  };

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    if (activeFileIndex === idx) {
      setActiveFileIndex(next.length > 0 ? 0 : null);
    } else if (activeFileIndex !== null && activeFileIndex > idx) {
      setActiveFileIndex(activeFileIndex - 1);
    }
  };

  return (
    <div className="space-y-4 p-6 border border-[var(--line)] rounded-2xl bg-white/70 shadow-sm backdrop-blur-md">
      <h3 className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
        Document Queue ({files.length})
      </h3>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          dragActive
            ? "border-[var(--lagoon)] bg-[var(--lagoon)]/10 text-[var(--lagoon-deep)]"
            : "border-gray-300 hover:border-[var(--lagoon)]/50 hover:bg-gray-50/50"
        }`}
        onClick={() => {
          fileInputRef.current?.click();
        }}
      >
        <FileText className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-xs text-gray-500 text-center font-medium">
          Drag & drop PDFs here or click to browse
        </p>
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const filesList = e.target.files;
            if (filesList) handleFiles(filesList);
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
          {files.map((item, idx) => (
            <div
              key={idx}
              onClick={() => setActiveFileIndex(idx)}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all duration-200 ${
                activeFileIndex === idx
                  ? "border-[var(--lagoon)] bg-[var(--lagoon)]/10 ring-1 ring-[var(--lagoon)]/20"
                  : "border-gray-200 hover:bg-gray-50/80 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                {item.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-[var(--lagoon)] flex-shrink-0" />
                )}
                <span className="truncate font-medium text-gray-700">{item.file.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-gray-400">
                  {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
