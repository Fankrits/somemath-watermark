# PDF Watermarker Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a client-side secure web application using Vite+, React, TanStack Start/Router, and shadcn-like Tailwind components to add customizable text or image watermarks to existing PDFs with interactive previews, batch processing, and secure local downloads.

**Architecture:** The app performs all PDF manipulation in the browser via `pdf-lib` and rendering via `pdfjs-dist`. Watermark customization features instant rendering on a dynamic canvas-level HTML overlay, with high-fidelity validation using an embedded PDF reader (`@embedpdf/react-pdf-viewer`) on demand. Batch queue processing executes in async loops to generate individual and combined ZIP file outputs.

**Tech Stack:** React 19, Tailwind CSS v4, `pdf-lib`, `pdfjs-dist`, `@embedpdf/react-pdf-viewer`, `jszip`, `lucide-react`, `zod`.

## Global Constraints

- All processing must be 100% client-side; no PDFs or images are sent to any server.
- Design styles must use Tailwind v4 classes and follow the theme variables defined in `src/styles.css`.
- Do not introduce any new backend API endpoints or cloud databases.

---

### Task 1: Install Dependencies and Set Up Packages

**Files:**

- Modify: `package.json`

**Interfaces:**

- Consumes: Existing packages in `package.json`
- Produces: Installed npm packages: `pdf-lib`, `pdfjs-dist`, `jszip`, `@embedpdf/react-pdf-viewer`

* [ ] **Step 1: Propose installing packages**
      Run: `npm install pdf-lib pdfjs-dist jszip @embedpdf/react-pdf-viewer`
* [ ] **Step 2: Verify package versions and lockfile update**
      Check that the packages are successfully added to the `dependencies` section in `package.json`.
* [ ] **Step 3: Commit package.json changes**
  ```bash
  git add package.json package-lock.json
  git commit -m "chore: install pdf-lib, pdfjs-dist, jszip, and embedpdf"
  ```

---

### Task 2: Core PDF Watermarking Utility Functions

**Files:**

- Create: `src/lib/watermark-utils.ts`
- Create: `src/lib/watermark-utils.test.ts`

**Interfaces:**

- Produces:
  - Types: `TextWatermarkConfig`, `ImageWatermarkConfig`, `WatermarkPlacement`
  - Function: `applyTextWatermark(pdfBytes: Uint8Array, config: TextWatermarkConfig): Promise<Uint8Array>`
  - Function: `applyImageWatermark(pdfBytes: Uint8Array, imageBytes: Uint8Array, imageType: 'png' | 'jpeg', config: ImageWatermarkConfig): Promise<Uint8Array>`

* [ ] **Step 1: Write type definitions and interface structure**
      Create `src/lib/watermark-utils.ts` and define the configuration interfaces:
  ```typescript
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
  ```
* [ ] **Step 2: Implement PDF text watermarking using pdf-lib**
      Implement the function `applyTextWatermark` using `pdf-lib` drawing methods:
  ```typescript
  import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

  export async function applyTextWatermark(
    pdfBytes: Uint8Array,
    config: TextWatermarkConfig,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Choose standard PDF font
    let fontName = StandardFonts.Helvetica;
    if (config.fontFamily.toLowerCase().includes("times")) fontName = StandardFonts.TimesRoman;
    if (config.fontFamily.toLowerCase().includes("courier")) fontName = StandardFonts.Courier;

    const font = await pdfDoc.embedFont(fontName);

    // Parse HEX color
    const hex = config.color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

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
          default:
            x = config.xOffset;
            y = config.yOffset;
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
  ```
* [ ] **Step 3: Implement PDF image watermarking using pdf-lib**
      Implement the function `applyImageWatermark` to handle image draws:
  ```typescript
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
          default:
            x = config.xOffset;
            y = config.yOffset;
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
  ```
* [ ] **Step 4: Create a simple test file to verify PDF watermarking**
      Create `src/lib/watermark-utils.test.ts` and add unit tests to verify:
  ```typescript
  import { describe, it, expect } from "vitest";
  import { applyTextWatermark } from "./watermark-utils";
  import { PDFDocument } from "pdf-lib";

  describe("Watermark Utilities", () => {
    it("should successfully apply text watermark on a blank PDF document", async () => {
      // Create a basic blank PDF
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([600, 800]);
      const pdfBytes = await pdfDoc.save();

      const watermarkedBytes = await applyTextWatermark(pdfBytes, {
        text: "TEST WATERMARK",
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
  });
  ```
* [ ] **Step 5: Run tests and commit**
      Run: `npm run test`
      Expected: All tests pass.
  ```bash
  git add src/lib/watermark-utils.ts src/lib/watermark-utils.test.ts
  git commit -m "feat: implement text and image watermarking core utils with unit tests"
  ```

---

### Task 3: Font Loader Helper for Google Fonts

**Files:**

- Modify: `src/lib/watermark-utils.ts`

**Interfaces:**

- Produces:
  - Function: `fetchAndEmbedGoogleFont(pdfDoc: PDFDocument, fontName: string): Promise<PDFFont | null>`

* [ ] **Step 1: Add dynamic Google Font fetch and embed utility**
      In `src/lib/watermark-utils.ts`, implement font binary downloader:
  ```typescript
  import { PDFFont } from "pdf-lib";

  // Selected Google Fonts maps to TTF files
  const GOOGLE_FONT_URLS: Record<string, string> = {
    Inter: "https://cdn.jsdelivr.net/npm/@canvas-fonts/inter@1.0.4/Inter-Regular.ttf",
    Roboto: "https://cdn.jsdelivr.net/npm/@canvas-fonts/roboto@1.0.4/Roboto-Regular.ttf",
    Montserrat:
      "https://cdn.jsdelivr.net/npm/@canvas-fonts/montserrat@1.0.4/Montserrat-Regular.ttf",
  };

  export async function fetchAndEmbedGoogleFont(
    pdfDoc: PDFDocument,
    fontName: string,
  ): Promise<PDFFont | null> {
    const url = GOOGLE_FONT_URLS[fontName];
    if (!url) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Font fetch failed: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      return await pdfDoc.embedFont(new Uint8Array(arrayBuffer));
    } catch (error) {
      console.error("Error fetching font, using fallback:", error);
      return null;
    }
  }
  ```
* [ ] **Step 2: Update applyTextWatermark to support custom embedded fonts**
      Modify `applyTextWatermark` to load and embed custom Google Fonts:
  ```typescript
  // inside applyTextWatermark:
  let font;
  if (GOOGLE_FONT_URLS[config.fontFamily]) {
    const customFont = await fetchAndEmbedGoogleFont(pdfDoc, config.fontFamily);
    font = customFont || (await pdfDoc.embedFont(StandardFonts.Helvetica));
  } else {
    let fontName = StandardFonts.Helvetica;
    if (config.fontFamily.toLowerCase().includes("times")) fontName = StandardFonts.TimesRoman;
    if (config.fontFamily.toLowerCase().includes("courier")) fontName = StandardFonts.Courier;
    font = await pdfDoc.embedFont(fontName);
  }
  ```
* [ ] **Step 3: Commit font loading helpers**
  ```bash
  git add src/lib/watermark-utils.ts
  git commit -m "feat: add Google Font remote fetch and embedding capability"
  ```

---

### Task 4: Interactive Live Canvas Preview UI Component

**Files:**

- Create: `src/components/WatermarkCanvasPreview.tsx`

**Interfaces:**

- Produces:
  - Component: `<WatermarkCanvasPreview pdfFile={File} textWatermark={TextWatermarkConfig} imageWatermark={ImageWatermarkConfig} mode={'text' | 'image'} imageFile={File | null} />`

* [ ] **Step 1: Set up PDF.js page rendering onto HTML5 canvas with in-memory pdf-lib watermark application**
      Create `src/components/WatermarkCanvasPreview.tsx` and load `pdfjs-dist` and the watermark utilities:
  ```tsx
  import { useEffect, useRef, useState } from "react";
  import * as pdfjsLib from "pdfjs-dist";
  import { applyTextWatermark, applyImageWatermark } from "#/lib/watermark-utils";

  // Set up PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  interface PreviewProps {
    pdfFile: File | null;
    textConfig: any;
    imageConfig: any;
    mode: "text" | "image";
    imageFile: File | null;
  }

  export default function WatermarkCanvasPreview({
    pdfFile,
    textConfig,
    imageConfig,
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

      const renderPage = async () => {
        setLoading(true);
        try {
          const arrayBuffer = await pdfFile.arrayBuffer();
          const pdfBytes = new Uint8Array(arrayBuffer);
          let watermarkedBytes: Uint8Array;

          // Apply watermark using pdf-lib core functions in-memory
          if (mode === "text") {
            watermarkedBytes = await applyTextWatermark(pdfBytes, textConfig);
          } else {
            if (imageFile) {
              const imageArrayBuffer = await imageFile.arrayBuffer();
              const imgType = imageFile.type.includes("png") ? "png" : "jpeg";
              watermarkedBytes = await applyImageWatermark(
                pdfBytes,
                new Uint8Array(imageArrayBuffer),
                imgType as any,
                imageConfig,
              );
            } else {
              watermarkedBytes = pdfBytes;
            }
          }

          const loadingTask = pdfjsLib.getDocument({ data: watermarkedBytes });
          const pdfDoc = await loadingTask.promise;
          const page = await pdfDoc.getPage(1); // Renders the first page

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
          };
          await page.render(renderContext).promise;
        } catch (err) {
          console.error("Error rendering page:", err);
        } finally {
          setLoading(false);
        }
      };

      // Debounce preview updates slightly to avoid high CPU usage during slider dragging
      const timeout = setTimeout(renderPage, 150);
      return () => clearTimeout(timeout);
    }, [pdfFile, textConfig, imageConfig, mode, imageFile]);

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
  ```
* [ ] **Step 2: Commit preview component**
  ```bash
  git add src/components/WatermarkCanvasPreview.tsx
  git commit -m "feat: implement responsive HTML5 Canvas PDF reader rendering in-memory pdf-lib watermarks directly"
  ```

---

### Task 5: Watermark Control Options sidebar panel

**Files:**

- Create: `src/components/WatermarkControls.tsx`

**Interfaces:**

- Produces:
  - Component: `<WatermarkControls activeMode={mode} setMode={setMode} textConfig={textConfig} setTextConfig={setTextConfig} imageConfig={imageConfig} setImageConfig={setImageConfig} imageFile={imageFile} setImageFile={setImageFile} />`

* [ ] **Step 1: Implement the sidebar layout and controls panel**
      Create `src/components/WatermarkControls.tsx` using Shadcn-like components:
  ```tsx
  import { Button } from "./ui/button";
  import { Input } from "./ui/input";
  import { Label } from "./ui/label";
  import { Slider } from "./ui/slider";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

  interface ControlsProps {
    mode: "text" | "image";
    setMode: (mode: "text" | "image") => void;
    textConfig: any;
    setTextConfig: (config: any) => void;
    imageConfig: any;
    setImageConfig: (config: any) => void;
    imageFile: File | null;
    setImageFile: (file: File | null) => void;
  }

  export default function WatermarkControls({
    mode,
    setMode,
    textConfig,
    setTextConfig,
    imageConfig,
    setImageConfig,
    imageFile,
    setImageFile,
  }: ControlsProps) {
    const updateText = (key: string, val: any) => {
      setTextConfig({ ...textConfig, [key]: val });
    };

    const updateImage = (key: string, val: any) => {
      setImageConfig({ ...imageConfig, [key]: val });
    };

    return (
      <div className="space-y-6 p-6 border rounded-lg bg-white/70 shadow-sm backdrop-blur-md">
        <div>
          <Label className="text-sm font-semibold text-gray-700">Watermark Type</Label>
          <div className="flex gap-2 mt-2">
            <Button
              variant={mode === "text" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("text")}
            >
              Text
            </Button>
            <Button
              variant={mode === "image" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("image")}
            >
              Image
            </Button>
          </div>
        </div>

        {mode === "text" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="watermark-text" className="text-xs font-semibold">
                Text Content
              </Label>
              <Input
                id="watermark-text"
                value={textConfig.text}
                onChange={(e) => updateText("text", e.target.value)}
                placeholder="CONFIDENTIAL"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Font Family</Label>
              <Select
                value={textConfig.fontFamily}
                onValueChange={(val) => updateText("fontFamily", val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Helvetica">Helvetica (Standard)</SelectItem>
                  <SelectItem value="Times Roman">Times Roman (Standard)</SelectItem>
                  <SelectItem value="Courier">Courier (Standard)</SelectItem>
                  <SelectItem value="Inter">Inter (Google Fonts)</SelectItem>
                  <SelectItem value="Roboto">Roboto (Google Fonts)</SelectItem>
                  <SelectItem value="Montserrat">Montserrat (Google Fonts)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs font-semibold">Font Size ({textConfig.fontSize}px)</Label>
                <Slider
                  min={12}
                  max={96}
                  step={1}
                  value={[textConfig.fontSize]}
                  onValueChange={([val]) => updateText("fontSize", val)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Color</Label>
                <input
                  type="color"
                  value={textConfig.color}
                  onChange={(e) => updateText("color", e.target.value)}
                  className="block h-9 w-12 border rounded-md mt-1 cursor-pointer bg-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">
                Opacity ({Math.round(textConfig.opacity * 100)}%)
              </Label>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[textConfig.opacity]}
                onValueChange={([val]) => updateText("opacity", val)}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Rotation ({textConfig.rotation}°)</Label>
              <Slider
                min={-180}
                max={180}
                step={5}
                value={[textConfig.rotation]}
                onValueChange={([val]) => updateText("rotation", val)}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Placement</Label>
              <Select
                value={textConfig.placement}
                onValueChange={(val) => updateText("placement", val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="middle-center">Center</SelectItem>
                  <SelectItem value="top-left">Top-Left</SelectItem>
                  <SelectItem value="top-center">Top-Center</SelectItem>
                  <SelectItem value="top-right">Top-Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom-Left</SelectItem>
                  <SelectItem value="bottom-center">Bottom-Center</SelectItem>
                  <SelectItem value="bottom-right">Bottom-Right</SelectItem>
                  <SelectItem value="tile">Tile Grid</SelectItem>
                  <SelectItem value="custom">Custom Offsets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {textConfig.placement === "custom" && (
              <div className="flex gap-2">
                <div>
                  <Label className="text-xs font-semibold">X Offset (px)</Label>
                  <Input
                    type="number"
                    value={textConfig.xOffset}
                    onChange={(e) => updateText("xOffset", Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Y Offset (px)</Label>
                  <Input
                    type="number"
                    value={textConfig.yOffset}
                    onChange={(e) => updateText("yOffset", Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Upload Image</Label>
              <Input
                type="file"
                accept="image/png, image/jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImageFile(e.target.files[0]);
                  }
                }}
                className="mt-1 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">
                Scale ({Math.round(imageConfig.scale * 100)}%)
              </Label>
              <Slider
                min={0.1}
                max={2.0}
                step={0.05}
                value={[imageConfig.scale]}
                onValueChange={([val]) => updateImage("scale", val)}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">
                Opacity ({Math.round(imageConfig.opacity * 100)}%)
              </Label>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[imageConfig.opacity]}
                onValueChange={([val]) => updateImage("opacity", val)}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Rotation ({imageConfig.rotation}°)</Label>
              <Slider
                min={-180}
                max={180}
                step={5}
                value={[imageConfig.rotation]}
                onValueChange={([val]) => updateImage("rotation", val)}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Placement</Label>
              <Select
                value={imageConfig.placement}
                onValueChange={(val) => updateImage("placement", val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="middle-center">Center</SelectItem>
                  <SelectItem value="top-left">Top-Left</SelectItem>
                  <SelectItem value="top-center">Top-Center</SelectItem>
                  <SelectItem value="top-right">Top-Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom-Left</SelectItem>
                  <SelectItem value="bottom-center">Bottom-Center</SelectItem>
                  <SelectItem value="bottom-right">Bottom-Right</SelectItem>
                  <SelectItem value="tile">Tile Grid</SelectItem>
                  <SelectItem value="custom">Custom Offsets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {imageConfig.placement === "custom" && (
              <div className="flex gap-2">
                <div>
                  <Label className="text-xs font-semibold">X Offset (px)</Label>
                  <Input
                    type="number"
                    value={imageConfig.xOffset}
                    onChange={(e) => updateImage("xOffset", Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Y Offset (px)</Label>
                  <Input
                    type="number"
                    value={imageConfig.yOffset}
                    onChange={(e) => updateImage("yOffset", Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  ```
* [ ] **Step 2: Commit control sidebar component**
  ```bash
  git add src/components/WatermarkControls.tsx
  git commit -m "feat: implement full watermark customization control panel sidebar component"
  ```

---

### Task 6: Batch File Queue Manager UI Component

**Files:**

- Create: `src/components/UploadQueue.tsx`

**Interfaces:**

- Produces:
  - Component: `<UploadQueue files={files} setFiles={setFiles} activeFileIndex={activeFileIndex} setActiveFileIndex={setActiveFileIndex} />`

* [ ] **Step 1: Implement the drag-and-drop file queue component**
      Create `src/components/UploadQueue.tsx` using Tailwind styles:
  ```tsx
  import { useDropzone } from "react-dropzone"; // Wait, let's write simple native drag and drop to avoid new libraries if possible, or support basic file inputs.
  import { useState } from "react";
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
      <div className="space-y-4 p-6 border rounded-lg bg-white/70 shadow-sm backdrop-blur-md">
        <h3 className="text-sm font-semibold text-gray-700">Document Queue ({files.length})</h3>

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
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:bg-gray-50/50"
          }`}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/pdf";
            input.multiple = true;
            input.onchange = (e) => {
              const filesList = (e.target as HTMLInputElement).files;
              if (filesList) handleFiles(filesList);
            };
            input.click();
          }}
        >
          <FileText className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-xs text-gray-500 text-center font-medium">
            Drag & drop PDFs here or click to browse
          </p>
        </div>

        {files.length > 0 && (
          <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
            {files.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setActiveFileIndex(idx)}
                className={`flex items-center justify-between p-2.5 rounded-md border text-xs cursor-pointer transition-all ${
                  activeFileIndex === idx
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-gray-200 hover:bg-gray-50/80 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  {item.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
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
  ```
* [ ] **Step 2: Commit files queue manager component**
  ```bash
  git add src/components/UploadQueue.tsx
  git commit -m "feat: implement drag-and-drop document upload queue list panel"
  ```

---

### Task 7: EmbedPDF Final Preview Integration Panel

**Files:**

- Create: `src/components/EmbedPdfViewer.tsx`

**Interfaces:**

- Produces:
  - Component: `<EmbedPdfViewer pdfBlobUrl={string | null} />`

* [ ] **Step 1: Create embedpdf reader tab loader**
      Create `src/components/EmbedPdfViewer.tsx` rendering `@embedpdf/react-pdf-viewer`:
  ```tsx
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
  ```
* [ ] **Step 2: Commit embedpdf component**
  ```bash
  git add src/components/EmbedPdfViewer.tsx
  git commit -m "feat: integrate @embedpdf/react-pdf-viewer for high fidelity PDF previews"
  ```

---

### Task 8: Assemble Dashboard and Build Final Application Layout

**Files:**

- Modify: `src/routes/index.tsx`

**Interfaces:**

- Consumes: all components implemented in Tasks 4, 5, 6, and 7
- Produces: Complete PDF watermarking client-side dashboard page

* [ ] **Step 1: Assemble layout and logic in the main page**
      Rewrite `src/routes/index.tsx` to handle compilation state and downloads:
  ```tsx
  import { useState } from "react";
  import { createFileRoute } from "@tanstack/react-router";
  import WatermarkCanvasPreview from "#/components/WatermarkCanvasPreview";
  import WatermarkControls from "#/components/WatermarkControls";
  import UploadQueue, { QueueFile } from "#/components/UploadQueue";
  import EmbedPdfViewer from "#/components/EmbedPdfViewer";
  import { applyTextWatermark, applyImageWatermark } from "#/lib/watermark-utils";
  import { Button } from "#/components/ui/button";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
  import JSZip from "jszip";
  import { Download, FileDown, Layers } from "lucide-react";

  export const Route = createFileRoute("/")({ component: Home });

  function Home() {
    const [mode, setMode] = useState<"text" | "image">("text");
    const [files, setFiles] = useState<QueueFile[]>([]);
    const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [textConfig, setTextConfig] = useState({
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

    const [imageConfig, setImageConfig] = useState({
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

        const blob = new Blob([outputBytes], { type: "application/pdf" });
        if (viewerBlobUrl) URL.revokeObjectURL(viewerBlobUrl);
        setViewerBlobUrl(URL.createObjectURL(blob));
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

            if (mode === "text") {
              outputBytes = await applyTextWatermark(pdfBytes, textConfig);
            } else {
              if (!imageBytes) throw new Error("No watermark image uploaded.");
              outputBytes = await applyImageWatermark(pdfBytes, imageBytes, imgType, imageConfig);
            }

            const blob = new Blob([outputBytes], { type: "application/pdf" });

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
                <WatermarkCanvasPreview
                  pdfFile={activeItem ? activeItem.file : null}
                  textConfig={textConfig}
                  imageConfig={imageConfig}
                  mode={mode}
                  imageFile={imageFile}
                />
              </TabsContent>

              <TabsContent value="reader" className="mt-6">
                <EmbedPdfViewer pdfBlobUrl={viewerBlobUrl} />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    );
  }
  ```
* [ ] **Step 2: Run verification checks and test builds**
      Validate code formatting and type checks:
      Run: `vp check`
      Verify that the Vite build is successful and there are no lint or TS compilation errors:
      Run: `npm run build`
* [ ] **Step 3: Commit all changes**
  ```bash
  git add src/routes/index.tsx
  git commit -m "feat: integrate dashboard routing layout, styling, and processing actions"
  ```
