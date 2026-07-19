# Design Specification: Client-Side PDF Watermarker Studio

This document defines the requirements, architecture, and implementation details for a client-side, secure PDF watermarking application built using Vite+, React, TanStack Start, and shadcn-like Tailwind components.

---

## 1. Requirements & Features

### 1.1 Secure, Client-Side PDF Processing

- **No Server Uploads:** All processing (reading, editing, rendering, and writing PDFs) runs entirely in the user's browser via `pdf-lib` and `pdfjs-dist`. Files never leave the local environment, ensuring total document security and confidentiality.
- **Offline-Ready:** Works without active internet communication once the page and required dynamic fonts are cached.

### 1.2 Watermark Modes & Styling

The application supports two watermark types: **Text Watermarks** and **Image Watermarks**.

#### Text Watermark Controls

- **Text Content:** Custom text input string (e.g., "CONFIDENTIAL", "INTERNAL USE ONLY", "COPY").
- **Fonts:**
  - Standard built-in PDF fonts (Helvetica, Times Roman, Courier).
  - Selected Google Fonts loaded dynamically as TTF files (Inter, Roboto, Montserrat, Playfair Display) to ensure professional branding.
- **Font Size & Styling:** Range slider for font size, toggle buttons for Bold, Italic, and font color picker.
- **Opacity:** Fine-grain slider (0% to 100%).
- **Rotation:** Angle slider (-180° to 180°).
- **Placement Options:**
  - **Single Point Alignment:** 9-point grid (Top-Left, Top-Center, Top-Right, Middle-Left, Middle-Center, Middle-Right, Bottom-Left, Bottom-Center, Bottom-Right).
  - **Tiled / Grid Pattern:** Repeated watermark across the entire page with spacing controls.
  - **Custom Offsets:** Standard coordinate margins (X-offset, Y-offset) for fine alignment.

#### Image Watermark Controls

- **Image Upload:** Upload file selector supporting PNG, JPEG, and WebP formats.
- **Scaling:** Zoom slider to adjust physical width/height relative to the PDF page size.
- **Opacity:** Slider (0% to 100%).
- **Rotation:** Angle slider (-180° to 180°).
- **Placement Options:** Same 9-point grid alignment, tiled pattern, and custom coordinate offsets.

### 1.3 High-Fidelity Previews

- **Real-time Canvas Editor:** A canvas rendering of the first page of the active PDF. The page preview is compiled directly via `pdf-lib` (applying the watermark directly into the PDF bytes in memory) and rendered on canvas using `pdfjs-dist` in real-time, matching the actual generated PDF output identically.
- **Full Reader Preview (embedpdf):** A toggle to load the generated watermarked PDF binary in-memory and render it inside the `@embedpdf/react-pdf-viewer` panel to review the exact results on all pages.

### 1.4 Batch Processing & Downloads

- **Multi-File Queue:** Supports uploading multiple PDFs concurrently. Shows file name, size, page count, and status (Pending, Processing, Done).
- **Batch Action:** Apply configuration to all files in the queue concurrently using asynchronous loops.
- **Download Formats:**
  - **Individual Download:** Single download button per file.
  - **Batch ZIP Download:** Packages all watermarked files into a single ZIP file using `jszip`.

---

## 2. Technical Stack

- **Frontend Engine:** Vite+ with React 19 and TanStack Router/Start.
- **Styling:** Tailwind CSS (v4) + Shadcn UI primitive styles.
- **PDF Engine:**
  - `pdf-lib` (v1) for PDF reading, text/image drawing, font embedding, and output serialization.
  - `pdfjs-dist` for client-side rendering of PDF pages to `<canvas>`.
  - `@embedpdf/react-pdf-viewer` for displaying the generated PDF file within a rich reader component.
- **Archive Utility:** `jszip` for in-memory ZIP package creation.

---

## 3. Component Architecture & UI Layout

We will implement a responsive, single-page split dashboard layout:

```
+-----------------------------------------------------------------------------------+
|  Logo & App Title                                               Secure (Client)   |
+-----------------------------------------------------------------------------------+
|  LEFT: Control Panel (Sidebar)         |  RIGHT: Preview & Queue (Main Workspace) |
|  - File Upload Zone / Queue List       |                                          |
|  - Watermark Type Selector (Text/Img)  |  TABS:                                   |
|  - Style Customizers                   |  [ Live Workspace ]  [ High-Fi Reader ]  |
|    - Text, Font, Size, Color           |  --------------------------------------- |
|    - Opacity, Rotation, Scale          |                                          |
|  - Placement Settings                  |  Shows Canvas Page   Renders embedpdf    |
|    - Grid vs Tile vs Offsets           |  with Live Overlay   with full document  |
|                                        |                                          |
|  - Apply Batch & Download Button       |                                          |
+-----------------------------------------------------------------------------------+
```

---

## 4. Edge Cases & Error Handling

1. **Massive PDFs / Out Of Memory (OOM):** Limit batch processing limits if files exceed 100MB, or alert users to process in groups of 5 files.
2. **Encrypted/Password-Protected PDFs:** `pdf-lib` will throw an error when loading encrypted files. We will catch this error and display a friendly message asking for the password or indicating that encrypted files are not supported.
3. **Corrupt Images:** Handle image loading exceptions cleanly and display validation errors if PNG/JPEG file parses fail.
4. **Google Font Loading Failure:** Fallback gracefully to Helvetica/Times Roman standard PDF fonts if external web requests for custom TTF font files fail.
