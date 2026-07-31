# SomeMath Watermark Studio (`watermark-adv`)

**SomeMath Watermark Studio** is a high-performance web application designed for applying customizable text and image watermarks to PDF documents in real time. Built with **TanStack Start**, **React 19**, **`pdf-lib`**, and the **Vite+** unified toolchain, it features client-side PDF processing with server-side fallbacks, batch file queue management, interactive live previewing, and flexible placement controls.

---

## 🚀 Features

- **Text & Image Watermarking**:
  - **Text Mode**: Custom text input, standard PDF fonts (Helvetica, Times, Courier) & embedded Google Fonts (Inter, Roboto, Montserrat), font size, bold/italic options, HEX color picker, opacity control, and rotation (-180° to +180°).
  - **Image Mode**: Upload custom PNG or JPEG image logos (or use default branding image), image scale adjustment, opacity control, and rotation angle.
- **Flexible Positioning & Grid Tiling**:
  - **9 Placement Presets**: Top-Left, Top-Center, Top-Right, Middle-Left, Middle-Center, Middle-Right, Bottom-Left, Bottom-Center, Bottom-Right.
  - **Grid Repetition (Tiling)**: Repeat watermarks in a grid pattern across pages with customizable X/Y spacing (`gridSpacingX`, `gridSpacingY`).
  - **Fine Offset Tuning**: Granular X and Y pixel offsets for pixel-perfect position alignment.
- **Interactive Live Preview**:
  - Embedded PDF viewer (`@embedpdf/react-pdf-viewer`) with debounced auto-rendering (600ms window) for instant feedback on configuration changes.
- **Batch Processing & File Queue**:
  - Upload multiple PDF files simultaneously via file browser or full-screen Drag & Drop overlay.
  - Real-time file processing status indicators (Pending, Processing, Completed, Failed).
  - One-click **Download All** or **Export ZIP** archive powered by `JSZip`.
- **Session Persistence**:
  - Remembers active watermark mode and detailed configuration settings in `localStorage` across browser sessions.
- **Dual Processing Architecture**:
  - Fast client-side PDF manipulation via `pdf-lib`.
  - Automatic fallback to TanStack Start server functions (`applyWatermarkServerFn`) for complex operations or unsupported browser environments.

---

## 🛠️ Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React 19, SSR, TanStack Router)
- **PDF Processing**: [`pdf-lib`](https://pdf-lib.js.org/) & [`@embedpdf/react-pdf-viewer`](https://github.com/embedpdf/embedpdf)
- **Toolchain**: [Vite+](https://viteplus.dev/) (`vp` CLI wrapping Vite, Rolldown, and Vitest)
- **Styling**: Tailwind CSS v4, Radix UI primitives, Lucide React icons
- **Server Adapter**: Nitro server adapter (compatible with Node.js and Bun runtime)
- **Compression**: JSZip for batch archive exports

---

## 📁 Project Structure

```
watermark-adv/
├── public/                  # Static assets (logo, default watermark image)
├── src/
│   ├── components/          # UI components
│   │   ├── WatermarkControls.tsx   # Watermark configuration panel & presets
│   │   ├── UploadQueue.tsx         # Batch queue manager & drop zone
│   │   └── EmbedPdfViewer.tsx      # EmbedPDF preview component
│   ├── lib/
│   │   ├── watermark-utils.ts      # Core pdf-lib watermarking engine & font fetcher
│   │   └── watermark-constants.ts  # Default configurations & localStorage keys
│   └── routes/
│       ├── __root.tsx              # Root layout & HTML shell
│       └── index.tsx               # Main studio app page & batch handlers
├── package.json
└── vite.config.ts           # Vite & Vite+ configuration
```

---

## 🏁 Getting Started

### Prerequisites

- **Bun** or **Node.js** (v18+ recommended)
- **Vite+ (`vp`)** toolchain

### Installation

Install project dependencies:

```bash
vp install
# or with Bun
bun install
```

### Running Local Development Server

Start the dev server (runs on `http://localhost:3005` by default):

```bash
npm run dev
# or
bun run dev
```

---

## 🧪 Testing

Run the test suite using Vitest via Vite+:

```bash
vp test
# or
bun --bun vp test run
```

The test suite covers:

- Core `pdf-lib` and `jszip` integration (`src/sanity.test.ts`)
- Watermark application utilities (`src/lib/watermark-utils.test.ts`)
- Component rendering & interactions (`UploadQueue`, `WatermarkControls`, `EmbedPdfViewer`)

---

## 📦 Building & Production Deployment

### Build Application

Build the production bundle:

```bash
npm run build
```

### Start Production Server

Launch the output server:

```bash
npm run start
```

Or execute the Nitro server script directly:

```bash
node .output/server/index.mjs
```

---

## 📄 License

Proprietary / Private project.
