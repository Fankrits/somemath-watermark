// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import { render, screen, cleanup } from "@testing-library/react";
import EmbedPdfViewer from "./EmbedPdfViewer";

vi.mock("@embedpdf/react-pdf-viewer", () => {
  return {
    PDFViewer: ({ config }: any) => (
      <div data-testid="mocked-pdf-viewer">Mocked PDFViewer: {config.src}</div>
    ),
  };
});

describe("EmbedPdfViewer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty state when pdfBlobUrl is null", () => {
    render(<EmbedPdfViewer pdfBlobUrl={null} />);
    expect(
      screen.getByText('Click "Generate High-Fidelity Preview" to load doc reader'),
    ).toBeTruthy();
  });

  it("renders PDFViewer when pdfBlobUrl is provided", () => {
    render(<EmbedPdfViewer pdfBlobUrl="blob:http://localhost/mock-pdf" />);
    const pdfViewer = screen.getByTestId("mocked-pdf-viewer");
    expect(pdfViewer).toBeTruthy();
    expect(pdfViewer.textContent).toContain("blob:http://localhost/mock-pdf");
  });
});
