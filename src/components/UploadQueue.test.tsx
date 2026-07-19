// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import UploadQueue from "./UploadQueue";
import type { QueueFile } from "./UploadQueue";

describe("UploadQueue", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty queue message and header correctly", () => {
    const setFiles = vi.fn();
    const setActiveFileIndex = vi.fn();

    render(
      <UploadQueue
        files={[]}
        setFiles={setFiles}
        activeFileIndex={null}
        setActiveFileIndex={setActiveFileIndex}
      />,
    );

    expect(screen.getByText("Document Queue (0)")).toBeTruthy();
    expect(screen.getByText("Drag & drop PDFs here or click to browse")).toBeTruthy();
  });

  it("renders files in the queue with size and status", () => {
    const setFiles = vi.fn();
    const setActiveFileIndex = vi.fn();
    const file1 = new File(["dummy content 1"], "document1.pdf", { type: "application/pdf" });
    Object.defineProperty(file1, "size", { value: 1024 * 1024 * 1.5 }); // 1.5 MB

    const file2 = new File(["dummy content 2"], "document2.pdf", { type: "application/pdf" });
    Object.defineProperty(file2, "size", { value: 1024 * 1024 * 2.2 }); // 2.2 MB

    const files: QueueFile[] = [
      { file: file1, status: "completed" },
      { file: file2, status: "pending" },
    ];

    render(
      <UploadQueue
        files={files}
        setFiles={setFiles}
        activeFileIndex={0}
        setActiveFileIndex={setActiveFileIndex}
      />,
    );

    expect(screen.getByText("Document Queue (2)")).toBeTruthy();
    expect(screen.getByText("document1.pdf")).toBeTruthy();
    expect(screen.getByText("1.50 MB")).toBeTruthy();
    expect(screen.getByText("document2.pdf")).toBeTruthy();
    expect(screen.getByText("2.20 MB")).toBeTruthy();
  });

  it("triggers setActiveFileIndex on clicking a file item", () => {
    const setFiles = vi.fn();
    const setActiveFileIndex = vi.fn();
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    const files: QueueFile[] = [{ file, status: "pending" }];

    render(
      <UploadQueue
        files={files}
        setFiles={setFiles}
        activeFileIndex={null}
        setActiveFileIndex={setActiveFileIndex}
      />,
    );

    const fileItem = screen.getByText("doc.pdf").closest("div");
    if (!fileItem) throw new Error("File item element not found");
    fireEvent.click(fileItem);
    expect(setActiveFileIndex).toHaveBeenCalledWith(0);
  });

  it("handles removeFile logic correctly", () => {
    const setFiles = vi.fn();
    const setActiveFileIndex = vi.fn();
    const file1 = new File(["1"], "doc1.pdf", { type: "application/pdf" });
    const file2 = new File(["2"], "doc2.pdf", { type: "application/pdf" });
    const files: QueueFile[] = [
      { file: file1, status: "pending" },
      { file: file2, status: "pending" },
    ];

    render(
      <UploadQueue
        files={files}
        setFiles={setFiles}
        activeFileIndex={1}
        setActiveFileIndex={setActiveFileIndex}
      />,
    );

    const removeButtons = screen.getAllByRole("button");
    fireEvent.click(removeButtons[0]);

    expect(setFiles).toHaveBeenCalledWith([{ file: file2, status: "pending" }]);
    expect(setActiveFileIndex).toHaveBeenCalledWith(0);
  });

  it("allows file dropping", () => {
    const setFiles = vi.fn();
    const setActiveFileIndex = vi.fn();
    render(
      <UploadQueue
        files={[]}
        setFiles={setFiles}
        activeFileIndex={null}
        setActiveFileIndex={setActiveFileIndex}
      />,
    );

    const dropzone = screen.getByText("Drag & drop PDFs here or click to browse").parentElement;
    if (!dropzone) throw new Error("Dropzone parent element not found");

    const file = new File(["test file content"], "dropped.pdf", { type: "application/pdf" });

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(setFiles).toHaveBeenCalled();
  });
});
