import { describe, it, expect } from "vite-plus/test";
import { applyTextWatermark, applyImageWatermark } from "./watermark-utils";
import { PDFDocument } from "pdf-lib";

// A valid 1x1 transparent PNG in base64
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const tinyPngBytes = new Uint8Array(Buffer.from(TINY_PNG_BASE64, "base64"));

// A valid 1x1 black JPEG in base64
const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
const tinyJpegBytes = new Uint8Array(Buffer.from(TINY_JPEG_BASE64, "base64"));

describe("Watermark Utilities", () => {
  const createBlankPdf = async (): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([600, 800]);
    return await pdfDoc.save();
  };

  describe("applyTextWatermark", () => {
    it("should successfully apply Helvetica text watermark on a blank PDF document", async () => {
      const pdfBytes = await createBlankPdf();
      const watermarkedBytes = await applyTextWatermark(pdfBytes, {
        text: "CONFIDENTIAL",
        fontFamily: "Helvetica",
        fontSize: 32,
        color: "#ff0000",
        opacity: 0.5,
        rotation: 45,
        placement: "middle-center",
        xOffset: 0,
        yOffset: 0,
      });

      expect(watermarkedBytes.length).toBeGreaterThan(pdfBytes.length);
      const loadedDoc = await PDFDocument.load(watermarkedBytes);
      expect(loadedDoc.getPageCount()).toBe(1);
    });

    it("should support other standard fonts like TimesRoman and Courier", async () => {
      const pdfBytes = await createBlankPdf();

      const timesBytes = await applyTextWatermark(pdfBytes, {
        text: "TIMES WATERMARK",
        fontFamily: "Times New Roman",
        fontSize: 24,
        color: "#00ff00",
        opacity: 0.8,
        rotation: 0,
        placement: "bottom-left",
        xOffset: 10,
        yOffset: 10,
        isBold: true,
        isItalic: true,
      });

      const courierBytes = await applyTextWatermark(pdfBytes, {
        text: "COURIER WATERMARK",
        fontFamily: "Courier New",
        fontSize: 24,
        color: "#0000ff",
        opacity: 0.8,
        rotation: 0,
        placement: "top-right",
        xOffset: -10,
        yOffset: -10,
        isBold: false,
        isItalic: true,
      });

      expect(timesBytes.length).toBeGreaterThan(pdfBytes.length);
      expect(courierBytes.length).toBeGreaterThan(pdfBytes.length);
    });

    it("should support tile placement", async () => {
      const pdfBytes = await createBlankPdf();
      const watermarkedBytes = await applyTextWatermark(pdfBytes, {
        text: "TILE",
        fontFamily: "Helvetica",
        fontSize: 12,
        color: "#000000",
        opacity: 0.1,
        rotation: 30,
        placement: "tile",
        xOffset: 0,
        yOffset: 0,
        gridSpacingX: 100,
        gridSpacingY: 100,
      });

      expect(watermarkedBytes.length).toBeGreaterThan(pdfBytes.length);
    });

    it("should support custom placement", async () => {
      const pdfBytes = await createBlankPdf();
      const watermarkedBytes = await applyTextWatermark(pdfBytes, {
        text: "CUSTOM",
        fontFamily: "Helvetica",
        fontSize: 12,
        color: "#000000",
        opacity: 0.1,
        rotation: 0,
        placement: "custom",
        xOffset: 150,
        yOffset: 250,
      });

      expect(watermarkedBytes.length).toBeGreaterThan(pdfBytes.length);
    });
  });

  describe("applyImageWatermark", () => {
    it("should successfully apply a PNG image watermark", async () => {
      const pdfBytes = await createBlankPdf();
      const watermarkedBytes = await applyImageWatermark(pdfBytes, tinyPngBytes, "png", {
        scale: 1.0,
        opacity: 0.7,
        rotation: 0,
        placement: "middle-center",
        xOffset: 0,
        yOffset: 0,
      });

      expect(watermarkedBytes.length).toBeGreaterThan(pdfBytes.length);
      const loadedDoc = await PDFDocument.load(watermarkedBytes);
      expect(loadedDoc.getPageCount()).toBe(1);
    });

    it("should successfully apply a JPEG image watermark with tile placement", async () => {
      const pdfBytes = await createBlankPdf();
      const watermarkedBytes = await applyImageWatermark(pdfBytes, tinyJpegBytes, "jpeg", {
        scale: 0.5,
        opacity: 0.5,
        rotation: 90,
        placement: "tile",
        xOffset: 0,
        yOffset: 0,
        gridSpacingX: 150,
        gridSpacingY: 150,
      });

      expect(watermarkedBytes.length).toBeGreaterThan(pdfBytes.length);
    });

    it("should successfully apply an image watermark with custom placement", async () => {
      const pdfBytes = await createBlankPdf();
      const watermarkedBytes = await applyImageWatermark(pdfBytes, tinyPngBytes, "png", {
        scale: 1.5,
        opacity: 0.8,
        rotation: 45,
        placement: "custom",
        xOffset: 100,
        yOffset: 200,
      });

      expect(watermarkedBytes.length).toBeGreaterThan(pdfBytes.length);
    });
  });
});
