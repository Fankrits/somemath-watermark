import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

export type WatermarkPlacement =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "tile"
  | "custom";

export interface TextWatermarkConfig {
  text: string;
  fontFamily: string; // Standard PDF font name or custom font identifier
  fontSize: number;
  color: string; // HEX color e.g. '#ff0000'
  opacity: number; // 0 to 1
  rotation: number; // in degrees
  placement: WatermarkPlacement;
  xOffset: number;
  yOffset: number;
  gridSpacingX?: number;
  gridSpacingY?: number;
  isBold?: boolean;
  isItalic?: boolean;
}

export interface ImageWatermarkConfig {
  scale: number; // 0.1 to 2.0
  opacity: number; // 0 to 1
  rotation: number; // in degrees
  placement: WatermarkPlacement;
  xOffset: number;
  yOffset: number;
  gridSpacingX?: number;
  gridSpacingY?: number;
}

/**
 * Parses a HEX color string into RGB values normalized between 0 and 1.
 * Supports both 3-digit and 6-digit hex formats, with or without '#'.
 */
function parseHexColor(colorStr: string): { r: number; g: number; b: number } {
  let hex = colorStr.replace("#", "").trim();
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6) {
    // Default to black if invalid hex
    return { r: 0, g: 0, b: 0 };
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return {
    r: isNaN(r) ? 0 : r,
    g: isNaN(g) ? 0 : g,
    b: isNaN(b) ? 0 : b,
  };
}

/**
 * Determines the standard PDF font name based on user fontFamily choice and styling preferences.
 */
function resolveStandardFont(fontFamily: string, isBold = false, isItalic = false): StandardFonts {
  const family = fontFamily.toLowerCase();

  if (family.includes("times")) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
    if (isBold) return StandardFonts.TimesRomanBold;
    if (isItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }

  if (family.includes("courier")) {
    if (isBold && isItalic) return StandardFonts.CourierBoldOblique;
    if (isBold) return StandardFonts.CourierBold;
    if (isItalic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }

  // Default to Helvetica
  if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique;
  if (isBold) return StandardFonts.HelveticaBold;
  if (isItalic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

export async function applyTextWatermark(
  pdfBytes: Uint8Array,
  config: TextWatermarkConfig,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  const fontName = resolveStandardFont(config.fontFamily, config.isBold, config.isItalic);
  const font = await pdfDoc.embedFont(fontName);

  const { r, g, b } = parseHexColor(config.color);

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(config.text, config.fontSize);
    const textHeight = config.fontSize;

    let drawPoints: Array<{ x: number; y: number }> = [];

    if (config.placement === "tile") {
      const spacingX = config.gridSpacingX || 200;
      const spacingY = config.gridSpacingY || 200;
      for (let x = 50; x < width; x += spacingX) {
        for (let y = 50; y < height; y += spacingY) {
          drawPoints.push({ x, y });
        }
      }
    } else {
      let x = 0;
      let y = 0;
      switch (config.placement) {
        case "top-left":
          x = 20;
          y = height - textHeight - 20;
          break;
        case "top-center":
          x = (width - textWidth) / 2;
          y = height - textHeight - 20;
          break;
        case "top-right":
          x = width - textWidth - 20;
          y = height - textHeight - 20;
          break;
        case "middle-left":
          x = 20;
          y = (height - textHeight) / 2;
          break;
        case "middle-center":
          x = (width - textWidth) / 2;
          y = (height - textHeight) / 2;
          break;
        case "middle-right":
          x = width - textWidth - 20;
          y = (height - textHeight) / 2;
          break;
        case "bottom-left":
          x = 20;
          y = 20;
          break;
        case "bottom-center":
          x = (width - textWidth) / 2;
          y = 20;
          break;
        case "bottom-right":
          x = width - textWidth - 20;
          y = 20;
          break;
        default: // custom or fallback
          x = 0;
          y = 0;
          break;
      }
      drawPoints.push({ x: x + config.xOffset, y: y + config.yOffset });
    }

    for (const point of drawPoints) {
      page.drawText(config.text, {
        x: point.x,
        y: point.y,
        size: config.fontSize,
        font: font,
        color: rgb(r, g, b),
        opacity: config.opacity,
        rotate: degrees(config.rotation),
      });
    }
  }

  return await pdfDoc.save();
}

export async function applyImageWatermark(
  pdfBytes: Uint8Array,
  imageBytes: Uint8Array,
  imageType: "png" | "jpeg",
  config: ImageWatermarkConfig,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  let embeddedImage;
  if (imageType === "png") {
    embeddedImage = await pdfDoc.embedPng(imageBytes);
  } else {
    embeddedImage = await pdfDoc.embedJpg(imageBytes);
  }

  for (const page of pages) {
    const { width, height } = page.getSize();
    const imgWidth = embeddedImage.width * config.scale;
    const imgHeight = embeddedImage.height * config.scale;

    let drawPoints: Array<{ x: number; y: number }> = [];

    if (config.placement === "tile") {
      const spacingX = config.gridSpacingX || imgWidth + 100;
      const spacingY = config.gridSpacingY || imgHeight + 100;
      for (let x = 50; x < width; x += spacingX) {
        for (let y = 50; y < height; y += spacingY) {
          drawPoints.push({ x, y });
        }
      }
    } else {
      let x = 0;
      let y = 0;
      switch (config.placement) {
        case "top-left":
          x = 20;
          y = height - imgHeight - 20;
          break;
        case "top-center":
          x = (width - imgWidth) / 2;
          y = height - imgHeight - 20;
          break;
        case "top-right":
          x = width - imgWidth - 20;
          y = height - imgHeight - 20;
          break;
        case "middle-left":
          x = 20;
          y = (height - imgHeight) / 2;
          break;
        case "middle-center":
          x = (width - imgWidth) / 2;
          y = (height - imgHeight) / 2;
          break;
        case "middle-right":
          x = width - imgWidth - 20;
          y = (height - imgHeight) / 2;
          break;
        case "bottom-left":
          x = 20;
          y = 20;
          break;
        case "bottom-center":
          x = (width - imgWidth) / 2;
          y = 20;
          break;
        case "bottom-right":
          x = width - imgWidth - 20;
          y = 20;
          break;
        default: // custom or fallback
          x = 0;
          y = 0;
          break;
      }
      drawPoints.push({ x: x + config.xOffset, y: y + config.yOffset });
    }

    for (const point of drawPoints) {
      page.drawImage(embeddedImage, {
        x: point.x,
        y: point.y,
        width: imgWidth,
        height: imgHeight,
        opacity: config.opacity,
        rotate: degrees(config.rotation),
      });
    }
  }

  return await pdfDoc.save();
}
