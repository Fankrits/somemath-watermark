// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";
import WatermarkCanvasPreview from "./WatermarkCanvasPreview";
import * as watermarkUtils from "#/lib/watermark-utils";
import * as pdfjsLib from "pdfjs-dist";

// Mock watermark utility functions
vi.mock("#/lib/watermark-utils", async (importOriginal) => {
  const original = await importOriginal<typeof watermarkUtils>();
  return {
    ...original,
    applyTextWatermark: vi.fn(async (pdfBytes) => pdfBytes),
    applyImageWatermark: vi.fn(async (pdfBytes) => pdfBytes),
  };
});

// Mock pdfjs-dist
vi.mock("pdfjs-dist", () => {
  const mockViewport = {
    width: 600,
    height: 800,
  };

  const mockPage = {
    getViewport: vi.fn(() => mockViewport),
    render: vi.fn(() => ({
      promise: Promise.resolve(),
    })),
  };

  const mockDoc = {
    getPage: vi.fn(async () => mockPage),
  };

  const mockLoadingTask = {
    promise: Promise.resolve(mockDoc),
  };

  return {
    GlobalWorkerOptions: {
      workerSrc: "",
    },
    version: "mocked-version",
    getDocument: vi.fn(() => mockLoadingTask),
  };
});

describe("WatermarkCanvasPreview", () => {
  const textConfig = {
    text: "CONFIDENTIAL",
    fontFamily: "Helvetica",
    fontSize: 32,
    color: "#ff0000",
    opacity: 0.5,
    rotation: 45,
    placement: "middle-center" as const,
    xOffset: 0,
    yOffset: 0,
  };

  const imageConfig = {
    scale: 1.0,
    opacity: 0.5,
    rotation: 0,
    placement: "middle-center" as const,
    xOffset: 0,
    yOffset: 0,
  };

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
    } as any);
  });

  it("renders placeholder when pdfFile is null", () => {
    render(
      <WatermarkCanvasPreview
        pdfFile={null}
        mode="text"
        imageFile={null}
        textConfig={textConfig}
        imageConfig={imageConfig}
      />,
    );

    const placeholderText = screen.queryByText("Upload a PDF to view the live preview editor");
    expect(placeholderText).not.toBeNull();
  });

  it("renders canvas and calls watermark utilities when pdfFile is provided", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", {
      type: "application/pdf",
    });

    const { container } = render(
      <WatermarkCanvasPreview
        pdfFile={file}
        mode="text"
        imageFile={null}
        textConfig={textConfig}
        imageConfig={imageConfig}
      />,
    );

    // Wait for the render page task
    await waitFor(() => {
      expect(pdfjsLib.getDocument).toHaveBeenCalled();
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
  });

  it("calls applyImageWatermark when in image mode with imageFile", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", {
      type: "application/pdf",
    });
    const imageFile = new File([new Uint8Array([4, 5, 6])], "logo.png", {
      type: "image/png",
    });

    const { container } = render(
      <WatermarkCanvasPreview
        pdfFile={file}
        mode="image"
        imageFile={imageFile}
        textConfig={textConfig}
        imageConfig={imageConfig}
      />,
    );

    await waitFor(() => {
      expect(watermarkUtils.applyImageWatermark).toHaveBeenCalled();
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
  });
});
