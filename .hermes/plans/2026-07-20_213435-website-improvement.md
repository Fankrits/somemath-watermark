# PDF Watermark Studio — Comprehensive UX/UI & Frontend Improvement Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Elevate PDF Watermark Studio from a functional internal tool into a polished, professional, accessible, and trustworthy product — improving visual design hierarchy, interaction quality, performance, resilience, and user trust.

**Architecture:** Single-page TanStack Start app (React 19 + Vite+). Client-side PDF processing via `pdf-lib` with a server-fn fallback. Three-column desktop layout (queue · preview · controls). All processing is 100% local (no upload). Improvements are incremental and non-breaking — each task ships independently.

**Tech Stack:** React 19, TanStack Router/Start/Query, Tailwind CSS v4 (CSS-first `@theme`), Radix UI primitives (shadcn-style), `pdf-lib`, `@embedpdf/react-pdf-viewer`, `lucide-react`, Vite+ (`vp` CLI), Vitest, Bun runtime.

---

## Current State Assessment

### What works well

- **Core functionality is solid:** text + image watermarks, tile/repeat, 9-point placement, fine offsets, batch download + ZIP export.
- **Privacy-first positioning** ("100% local · no upload") is a real differentiator and is surfaced in the header.
- **Design system foundations exist:** a coherent "lagoon/sea-ink" palette, `island-shell` cards, `island-kicker` labels, Fraunces display + Manrope body fonts.
- **Tests exist** for the three main components and watermark utils.
- **Live preview** with debounced auto-render and server fallback.

### Key problems (this plan addresses)

1. **Title still says "TanStack Start Starter"** — broken first impression, bad SEO.
2. **No empty/onboarding state** — landing on the app shows an empty preview with no guidance, value prop, or sample.
3. **`WatermarkCanvasPreview.tsx` is dead code** — superseded by `EmbedPdfViewer` but still in the tree, confusing maintainers and risking accidental imports.
4. **`WatermarkControls` is 679 lines** — a monolith mixing mode switching, text config, image config, placement, tile, and offsets. Hard to maintain and test.
5. **`index.tsx` `Home` is 392 lines** with inline base64 helpers, a server fn, localStorage effects, debounce logic, batch processing, and layout — too many responsibilities.
6. **Controls use `any` types** (`textConfig: any`, `imageConfig: any`) — loses type safety the `watermark-utils.ts` types were built for.
7. **No presets** — users must hand-tune every parameter every session.
8. **No keyboard shortcuts, undo/redo, or config reset.**
9. **No dark-mode toggle** despite a full `.dark` palette already defined.
10. **Mobile experience is an afterthought** — `grid-cols-1 lg:grid-cols-[...]` collapses but the 3 panels stack awkwardly with no navigation affordance.
11. **No error surface** — failed renders are silently `console.error`'d; the user sees nothing.
12. **No accessibility review** — focus traps, ARIA, keyboard nav on the placement grid, color contrast.
13. **`processAndDownload` re-reads `imageFile.arrayBuffer()` inside the loop** — wasteful for N files.
14. **No progress feedback during batch** beyond per-file status chips.
15. **PowerSync wiring is inert** — provider wraps the app but no collections are used; dead weight in the bundle and a source of confusion.

---

## Guiding Design Principles

1. **Trust through clarity.** A tool that modifies legal/financial documents must feel safe. Show what will happen before it happens (preview), confirm destructive actions, and never lose user data silently.
2. **Progressive disclosure.** Surface the 80% controls prominently; tuck advanced controls (offsets, tile spacing) behind disclosure.
3. **Immediate feedback.** Every action produces visible state within 100ms (optimistic UI, skeleton states, progress bars).
4. **One primary action per screen.** The "Export ZIP" button should be the obvious CTA; everything else supports it.
5. **Keyboard-first for power users.** Drag-and-drop is great, but `[Enter]` to apply, `[Esc]` to clear, `[⌘K]` for presets.
6. **Type safety as a UX feature.** Typed configs catch regressions that would otherwise surface as broken renders.

---

## Plan Overview (phases)

| Phase | Theme                              | Tasks                                                                  |
| ----- | ---------------------------------- | ---------------------------------------------------------------------- |
| 1     | **Foundations & cleanup**          | Fix title/meta, remove dead code, type the controls, extract constants |
| 2     | **Architecture refactor**          | Split `Home` into hooks, split `WatermarkControls` into subcomponents  |
| 3     | **Design system polish**           | Token audit, spacing scale, dark-mode toggle, empty states             |
| 4     | **Interaction & UX**               | Presets, keyboard shortcuts, undo/redo, config reset, error toasts     |
| 5     | **Batch & performance**            | Hoist image reads, progress bar, concurrency, memory hygiene           |
| 6     | **Accessibility & responsiveness** | ARIA, focus management, mobile layout, reduced-motion                  |
| 7     | **Delight & finishing**            | Animations, micro-interactions, sample PDF, copy/onboarding copy       |

Each task below is independently shippable and ends with a commit.

Tasks are written as **bite-sized, verifiable units**. Each task states: files touched, what changes, acceptance criteria, and a suggested commit message. Implement in order; later phases build on earlier ones but tasks within a phase can be reordered.

---

## Phase 1 — Foundations & cleanup

> Goal: fix first impressions, kill dead code, restore type safety. No visual changes yet — just a clean baseline.

### Task 1.1 — Fix title and document metadata

**Files:** `src/routes/__root.tsx`
**Change:** Replace the `TanStack Start Starter` title and add proper meta tags.

- Title: `PDF Watermark Studio — Private, Local PDF Watermarking`
- Add meta: `description` ("Watermark PDFs entirely in your browser. Files never leave your device."), `og:title`, `og:description`, `og:type=website`, theme-color, and a favicon link.
- Add `lang="en"` verification (already present) and `color-scheme: light dark` meta.

**Acceptance:**

- Browser tab shows the new title.
- `document.querySelector('meta[name=description]')` returns the new description.
- No console warnings.

**Commit:** `fix: correct document title and add proper metadata`

---

### Task 1.2 — Remove dead `WatermarkCanvasPreview` component

**Files:** `src/components/WatermarkCanvasPreview.tsx`, `src/components/WatermarkCanvasPreview.test.tsx`
**Change:** Delete both files. Grep the tree to confirm no live imports remain (the only references are inside its own test).

- Run `grep -rn "WatermarkCanvasPreview" src` — expect zero hits after deletion.

**Acceptance:**

- `vp check` passes.
- `vp test` passes (the deleted test goes with it).
- Dev server still renders the preview via `EmbedPdfViewer`.

**Commit:** `chore: remove dead WatermarkCanvasPreview component and test`

---

### Task 1.3 — Type the controls props with real interfaces

**Files:** `src/components/WatermarkControls.tsx`
**Change:** Replace `textConfig: any` / `imageConfig: any` / `setTextConfig: (config: any) => void` with the actual types exported from `src/lib/watermark-utils.ts`.

- Import `TextWatermarkConfig`, `ImageWatermarkConfig` (or whatever the exported names are — verify first).
- Replace the `updateText` / `updateImage` helpers' `key: string, val: any` with typed generic helpers (`updateText<K extends keyof TextWatermarkConfig>(key: K, val: TextWatermarkConfig[K])`).
- Update `WatermarkControls.test.tsx` if it passes `any` shaped props.

**Acceptance:**

- `vp check` (which runs `tsc`) passes with zero `any` in this file.
- Hovering a control in the IDE shows the correct type.
- All existing tests still pass.

**Commit:** `refactor(controls): type text/image config props instead of any`

---

### Task 1.4 — Extract magic numbers into a constants module

**Files:** new `src/lib/watermark-constants.ts`, `src/components/WatermarkControls.tsx`, `src/routes/index.tsx`
**Change:** Pull hard-coded tunables into named, documented constants:

- `DEBOUNCE_MS = 600` (preview render debounce)
- `DEFAULT_TEXT_CONFIG`, `DEFAULT_IMAGE_CONFIG` (the inline defaults currently duplicated)
- `PREVIEW_DPI = 150`, `MAX_BATCH_FILES`, `MAX_FILE_MB`
- `STORAGE_KEYS = { textConfig, imageConfig, mode, position, ... }` to kill stringly-typed `localStorage.getItem("...")` calls.

**Acceptance:**

- No `600`, `150`, or bare `"textConfig"` string literals remain in `index.tsx` / `WatermarkControls.tsx`.
- `vp test` passes.

**Commit:** `refactor: extract watermark constants and storage keys`

---

### Task 1.5 — Remove inert PowerSync wiring

**Files:** `src/integrations/powersync/provider.tsx`, `src/routes/__root.tsx`, possibly `src/lib/powersync/*`, `package.json`
**Change:** The PowerSync provider wraps the app but no collections are used. Remove the provider, the `AppSchema`/`BackendConnector` stubs, and the `@powersync/*` dependencies from `package.json`.

- After removal, `__root.tsx` renders children directly inside `<body>`.
- Confirm no imports of `@powersync/react` or `@powersync/web` remain.

**Acceptance:**

- `vp install` succeeds; bundle size drops (verify with `vp build` size report).
- App boots with no console errors about missing providers.
- All tests pass.

**Commit:** `chore: remove unused PowerSync integration`

> ⚠️ **Verify before deleting:** confirm with a grep that no route or component reads from PowerSync. If anything does, do not delete — surface it instead.

---

## Phase 2 — Architecture refactor

> Goal: split the two monoliths (`Home` 392 lines, `WatermarkControls` 679 lines) into composable, testable units. Pure refactor — no behavior change.

### Task 2.1 — Extract `useWatermarkState` hook

**Files:** new `src/hooks/use-watermark-state.ts`, `src/routes/index.tsx`
**Change:** Move all watermark state (mode, textConfig, imageConfig, imageFile, position, tile, offsets) plus its localStorage persistence effects into a single `useWatermarkState()` hook returning `{ state, actions }`.

- `index.tsx` becomes purely layout + composition.
- The hook owns: `useState` calls, `useEffect` for localStorage load/save, the reset action.

**Acceptance:**

- `index.tsx` shrinks by ~120 lines.
- Hook is unit-testable in isolation (add `use-watermark-state.test.ts` with a minimal renderHook test).
- Behavior unchanged: reload preserves config, reset clears it.

**Commit:** `refactor: extract useWatermarkState hook from Home`

---

### Task 2.2 — Extract `usePreviewRenderer` hook

**Files:** new `src/hooks/use-preview-renderer.ts`, `src/routes/index.tsx`
**Change:** Move the debounced preview-render `useEffect` (currently lines ~140–210 in `index.tsx`) and the server-fn call into `usePreviewRenderer({ files, mode, textConfig, imageConfig, imageFile })`.

- Returns `{ previewUrl, isRendering, renderError }`.
- Hoist the `imageFile.arrayBuffer()` read out of the effect into a `useMemo` keyed on `imageFile` so it's cached, not re-read on every debounce fire.

**Acceptance:**

- Preview still updates within `DEBOUNCE_MS` of a control change.
- `isRendering` flips true during render and false after.
- A new test asserts the hook transitions idle → rendering → idle.

**Commit:** `refactor: extract usePreviewRenderer hook with cached image buffer`

---

### Task 2.3 — Extract `useBatchProcessor` hook

**Files:** new `src/hooks/use-batch-processor.ts`, `src/routes/index.tsx`
**Change:** Move `processAndDownload` and its per-file status state into `useBatchProcessor({ files, mode, textConfig, imageConfig, imageFile })`.

- Returns `{ process, isProcessing, progress, perFileStatus }`.
- `progress` is a `{ done, total }` object (feeds Phase 5's progress bar).
- The image `arrayBuffer` is read **once** before the loop (it's already hoisted in `processAndDownload` — keep that, expose it as `imageBytesCache`).

**Acceptance:**

- Batch download still produces correct ZIPs / single PDFs.
- `progress.done / progress.total` is accurate mid-batch.
- `index.tsx` loses another ~80 lines.

**Commit:** `refactor: extract useBatchProcessor hook with progress state`

---

### Task 2.4 — Split `WatermarkControls` into subcomponents

**Files:** new `src/components/controls/TextConfigPanel.tsx`, `ImageConfigPanel.tsx`, `PlacementGrid.tsx`, `TileControls.tsx`, `OffsetControls.tsx`; trim `src/components/WatermarkControls.tsx`
**Change:** `WatermarkControls.tsx` becomes a thin shell: a `<Tabs>` for mode + composition of the subpanels. Each subpanel owns its slice of config and calls the typed setters.

- `PlacementGrid` is the 3×3 position selector — extract as a pure presentational component with `position` and `onPositionChange` props.
- Keep all existing Radix UI primitives in place; just move JSX.

**Acceptance:**

- `WatermarkControls.tsx` is under 150 lines.
- Each subpanel has a focused unit test (render + interaction).
- No behavior change — visual diff is zero.

**Commit:** `refactor(controls): split WatermarkControls into focused subpanels`

---

### Task 2.5 — Move base64 helpers and server fn into `lib/`

**Files:** new `src/lib/pdf-helpers.ts`, new `src/server/watermark.ts` (or `src/lib/watermark.server.ts`); `src/routes/index.tsx`
**Change:** The inline base64 helpers and `createServerFn` definition move out of `index.tsx` into dedicated modules. `index.tsx` imports them.

**Acceptance:**

- `index.tsx` is now under 150 lines and reads as pure composition.
- Server fn still works (preview renders, batch processes).
- `vp check` passes.

**Commit:** `refactor: move pdf helpers and server fn into lib`

---

## Phase 3 — Design system polish

> Goal: tighten the visual language, ship dark mode, and give the app a real empty state.

### Task 3.1 — Design token audit

**Files:** `src/styles.css`, component files
**Change:** Audit the `@theme` block. Remove unused tokens, consolidate duplicates (e.g. `sea-ink-300` vs `sea-ink-400` used once). Document the spacing scale (`--space-1` … `--space-12`) and ensure components use tokens, not raw `px`/`rem`.

- Run a quick grep for `px-` / `gap-[0-9]px` / `text-[0-9]px` in `src/components` and replace with token-based classes.

**Acceptance:**

- `styles.css` `@theme` block has a comment header explaining each token group.
- No raw pixel values in component files except borders/shadows.

**Commit:** `style: audit and document design tokens`

---

### Task 3.2 — Dark mode toggle

**Files:** new `src/components/theme-toggle.tsx`; `src/routes/__root.tsx`; `src/hooks/use-theme.ts`
**Change:** Add a `useTheme()` hook persisted to localStorage (key: `theme`, values: `light | dark | system`). Toggle button in the header. Apply by setting `class="dark"` on `<html>` (Tailwind v4 dark variant already wired).

- Default to `system` (respects `prefers-color-scheme`).
- Avoid flash-of-wrong-theme by inlining a tiny script in `<head>` that sets the class before hydration.

**Acceptance:**

- Clicking the toggle flips theme instantly.
- Reloading preserves the choice.
- No FOUC on first paint.

**Commit:** `feat: add dark mode toggle with system preference and no FOUC`

---

### Task 3.3 — Empty / onboarding state

**Files:** new `src/components/empty-state.tsx`; `src/routes/index.tsx`
**Change:** When `files.length === 0`, the preview column shows a welcoming empty state instead of a blank viewer:

- A muted illustration (lucide `FileText` + `Droplets` composite, or a simple SVG).
- Headline: "Watermark your PDFs — privately."
- Subhead: "Drag a PDF here, or click to choose. Files never leave your browser."
- Primary CTA button: "Choose PDF" (opens file picker).
- Secondary: "Try a sample" (loads a bundled 1-page sample PDF — see Task 7.2).

**Acceptance:**

- First visit shows the empty state, not a blank canvas.
- "Choose PDF" triggers the same file input as the queue's dropzone.
- Keyboard focus moves to the CTA on mount.

**Commit:** `feat: welcoming empty state with clear primary action`

---

### Task 3.4 — Visual hierarchy pass on the controls panel

**Files:** `src/components/WatermarkControls.tsx` and subpanels
**Change:** Apply progressive disclosure:

- Mode selector becomes two large card-buttons (Text / Image) with icon + label, not a plain Tabs.
- Collapsible "Advanced" section wraps offsets + tile spacing (collapsed by default).
- "Export ZIP" is a prominent sticky footer on the controls column; secondary actions ("Export single", "Reset") sit above it as ghost buttons.

**Acceptance:**

- The Export CTA is visually the strongest element in the right column.
- Advanced controls are hidden by default and revealed on click.
- All controls remain reachable by keyboard.

**Commit:** `style: progressive disclosure and stronger export CTA`

---

## Phase 4 — Interaction & UX

> Goal: make power users fast and make mistakes recoverable.

### Task 4.1 — Presets system

**Files:** new `src/lib/presets.ts`, new `src/components/presets-menu.tsx`; `src/components/WatermarkControls.tsx`
**Change:** Ship 4–5 built-in presets: `Confidential (diagonal)`, `Draft (large, centered)`, `Logo (tiled)`, `Date stamp (corner)`, `Custom…`. Each preset is a partial config applied on top of the current state. "Custom" lets the user save the current config as a named preset in localStorage.

- Triggered from a "Presets" button in the controls header or via `⌘K`.

**Acceptance:**

- Selecting a preset applies all its fields instantly and the preview updates.
- Custom presets persist across reloads and can be deleted.
- `⌘K` opens the menu; arrow keys navigate; Enter applies.

**Commit:** `feat: presets system with built-ins and custom save`

---

### Task 4.2 — Keyboard shortcuts

**Files:** new `src/hooks/use-keyboard-shortcuts.ts`; `src/routes/index.tsx`
**Change:** Global shortcuts (only when not typing in an input):

- `⌘K` — presets
- `⌘E` — export ZIP
- `⌘S` — export single (or ZIP if multiple)
- `⌘Z` / `⌘⇧Z` — undo / redo (Task 4.3)
- `Esc` — clear file selection
- `?` — show shortcuts cheatsheet

**Acceptance:**

- Each shortcut works from anywhere outside an input.
- A `?`-triggered modal lists all shortcuts.
- Shortcuts are disabled while focus is in a text field.

**Commit:** `feat: global keyboard shortcuts with cheatsheet`

---

### Task 4.3 — Undo / redo for config changes

**Files:** new `src/hooks/use-undoable-state.ts`; `src/hooks/use-watermark-state.ts`
**Change:** Wrap the watermark config state in a history stack (cap at 50 entries). Every config mutation pushes the previous state. `⌘Z` pops back; `⌘⇧Z` re-applies.

- Only config (mode, text/image, position, tile, offsets) is undoable — not the file queue (files are large and not really "undoable").

**Acceptance:**

- Changing font size, then position, then opacity, then pressing `⌘Z` three times walks back each change.
- Redo re-applies them in order.
- History is bounded; memory doesn't grow.

**Commit:** `feat: undo/redo for watermark config`

---

### Task 4.4 — Config reset with confirmation

**Files:** `src/components/WatermarkControls.tsx`
**Change:** "Reset" button opens a small confirmation dialog ("Reset all watermark settings? This won't affect your files.") before clearing. Use a Radix AlertDialog.

- Reset restores `DEFAULT_TEXT_CONFIG` / `DEFAULT_IMAGE_CONFIG`, not `undefined`.

**Acceptance:**

- Clicking Reset and confirming clears all fields and the preview updates.
- Clicking Cancel leaves everything untouched.
- Dialog traps focus and closes on Esc.

**Commit:** `feat: confirmation dialog before resetting config`

---

### Task 4.5 — Error toasts

**Files:** new `src/components/toast.tsx` (or use an existing Radix-based toast); `src/hooks/use-preview-renderer.ts`, `src/hooks/use-batch-processor.ts`
**Change:** Surface `renderError` and batch failures as dismissible toasts (top-right, auto-dismiss after 6s, `aria-live="assertive"`).

- A failed preview render shows: "Couldn't render preview — the file may be corrupted. [Retry] [Dismiss]".
- A failed batch file shows: "Failed to watermark `invoice.pdf`."

**Acceptance:**

- Simulating a render error (feed a non-PDF) shows a toast within 1s.
- Toast is announced to screen readers.
- Retry re-runs the render.

**Commit:** `feat: surface render and batch errors as toasts`

---

## Phase 5 — Batch & performance

> Goal: make batch processing observable and efficient.

### Task 5.1 — Batch progress bar

**Files:** new `src/components/batch-progress.tsx`; `src/routes/index.tsx`
**Change:** When `isProcessing` is true, render a sticky progress bar showing `done / total` with a percentage and current filename. Use an indeterminate state for the render phase.

- After completion, show "✓ Watermarked N files" for 3s then hide.

**Acceptance:**

- Progress bar appears within 100ms of starting a batch.
- Percentage updates monotonically.
- Cancel button stops the batch (bonus; see Task 5.4 if split out).

**Commit:** `feat: batch progress bar with current-file indicator`

---

### Task 5.2 — Cache image bytes across preview + batch

**Files:** `src/hooks/use-preview-renderer.ts`, `src/hooks/use-batch-processor.ts`
**Change:** Both hooks currently call `imageFile.arrayBuffer()` independently. Lift the decode into a shared `useImageBytes(imageFile)` hook (memoized on `imageFile`) and pass `imageBytes | null` into both. Eliminates duplicate reads.

**Acceptance:**

- Adding a `console.count("arrayBuffer")` shows the image is decoded at most once per `imageFile` change.
- Preview and batch both still work.

**Commit:** `perf: share decoded image bytes between preview and batch`

---

### Task 5.3 — Concurrent batch with bounded parallelism

**Files:** `src/hooks/use-batch-processor.ts`
**Change:** Process up to 3 files in parallel (pdf-lib is sync-friendly; wrap in `Promise.all` chunks of 3). Preserve per-file status order. Update `progress` atomically per file.

**Acceptance:**

- A 10-file batch completes measurably faster than serial.
- Per-file status updates appear in order.
- No memory blowup (verify by watching DevTools Memory during a 20-file batch).

**Commit:** `perf: process batch files with bounded parallelism`

---

### Task 5.4 — Cancelable batch

**Files:** `src/hooks/use-batch-processor.ts`, `src/components/batch-progress.tsx`
**Change:** Add a `cancel()` action backed by an `AbortController`-style flag. The loop checks it between files and exits early, leaving already-processed files intact.

**Acceptance:**

- Starting a 20-file batch and hitting Cancel within 500ms stops it.
- Files processed before cancellation are still downloadable (offer "Download N completed" button).

**Commit:** `feat: cancelable batch with partial-download recovery`

---

### Task 5.5 — Memory hygiene

**Files:** `src/hooks/use-batch-processor.ts`, `src/routes/index.tsx`
**Change:** Explicitly null out `Uint8Array` references and revoke `URL.createObjectURL` URLs after download. Add a `useEffect` cleanup in the preview hook to revoke stale preview URLs on re-render.

**Acceptance:**

- DevTools Memory shows no leaked object URLs after a render→re-render cycle.
- A 50-file batch doesn't crash the tab on a mid-tier laptop.

**Commit:** `perf: revoke object URLs and null large buffers after use`

---

## Phase 6 — Accessibility & responsiveness

> Goal: the app is fully usable by keyboard, screen reader, and on phones.

### Task 6.1 — ARIA & semantics pass

**Files:** all component files
**Change:**

- Every interactive element has an accessible name (`aria-label` where text isn't visible).
- The placement grid is a `role="radiogroup"` with each cell a `role="radio"` and `aria-checked`.
- Sliders have `aria-label` and `aria-valuetext` (e.g. "Opacity 40%").
- Color picker exposes its hex value via `aria-label`.
- Preview canvas region has `role="region"` and `aria-label="Live preview"`.

**Acceptance:**

- axe DevTools reports zero critical issues on the main view.
- Tab order is logical; visible focus ring on every control.

**Commit:** `a11y: comprehensive ARIA and semantics pass`

---

### Task 6.2 — Focus management

**Files:** `src/components/empty-state.tsx`, `src/components/presets-menu.tsx`, dialogs
**Change:**

- On mount with no files, focus moves to the "Choose PDF" CTA.
- Opening a dialog/preset menu moves focus to its first item; closing returns focus to the trigger.
- Tab is trapped inside open modals/menus.

**Acceptance:**

- Manual keyboard walkthrough confirms trap and restore.
- `vp test` includes a focus-management test for at least one dialog.

**Commit:** `a11y: focus management for empty state and dialogs`

---

### Task 6.3 — Mobile layout

**Files:** `src/routes/index.tsx`, new `src/components/mobile-tabs.tsx`
**Change:** On `< lg`, replace the 3-column grid with a tabbed single-column layout: tabs for "Files", "Preview", "Settings". Preview is the default tab when a file is loaded; Files is default when empty.

- Sticky bottom action bar on mobile holds the Export button.

**Acceptance:**

- On a 375px viewport, all three panels are reachable via tabs.
- No horizontal scroll.
- Export button is thumb-reachable at the bottom.

**Commit:** `feat: mobile tabbed layout with sticky export bar`

---

### Task 6.4 — Reduced motion

**Files:** `src/styles.css`, animation-using components
**Change:** Respect `prefers-reduced-motion: reduce` — disable the debounce spinner pulse, dialog slide-ins, and any transition animations. Replace with instant state changes.

**Acceptance:**

- With macOS "Reduce motion" on, no animations play.
- All functionality still works; only motion is removed.

**Commit:** `a11y: respect prefers-reduced-motion`

---

## Phase 7 — Delight & finishing

> Goal: ship the last 10% that makes it feel finished.

### Task 7.1 — Micro-interactions

**Files:** `src/styles.css`, components
**Change:** Subtle, tasteful motion: file drop highlights the dropzone with a 200ms ease; successful export triggers a brief check-mark confetti burst (CSS-only, no library); preset apply animates the preview with a 150ms crossfade.

- All gated behind `prefers-reduced-motion`.

**Acceptance:**

- Feels responsive, not flashy.
- Motion is optional and disabled when requested.

**Commit:** `feat: tasteful micro-interactions on drop and export`

---

### Task 7.2 — Sample PDF and one-click demo

**Files:** new `public/sample.pdf` (a generated 1-page A4), `src/components/empty-state.tsx`
**Change:** "Try a sample" loads the bundled sample PDF into the queue with a sensible default watermark already applied (semi-transparent "SAMPLE" diagonal). Lets users see value before touching their own files.

**Acceptance:**

- Clicking "Try a sample" adds the file and switches the preview tab.
- Sample is a real, valid PDF (verify with `pdf-lib` load).
- Bundle adds < 30KB.

**Commit:** `feat: one-click sample PDF demo`

---

### Task 7.3 — Copy & microcopy pass

**Files:** all components
**Change:** Audit every string. Examples:

- "Process" → "Watermark & Download"
- "No files" → "Drag a PDF here to begin"
- "Error" → specific, actionable messages
- Header tagline: tighten "100% local · no upload" → "Your files never leave this browser."

**Acceptance:**

- No generic "Error" or "Submit" strings remain.
- All CTAs are verb phrases.

**Commit:** `feat: copy and microcopy polish`

---

### Task 7.4 — Final QA & release checklist

**Files:** `README.md`, this plan
**Change:** Manual walkthrough:

- [ ] First paint shows empty state, correct title.
- [ ] Drag-and-drop, file picker, sample all work.
- [ ] Text + image watermarks render correctly.
- [ ] Presets apply and persist.
- [ ] Undo/redo, keyboard shortcuts, dark mode all function.
- [ ] Batch of 20 files completes with progress bar.
- [ ] Mobile layout usable on 375px.
- [ ] axe reports zero critical issues.
- [ ] `vp check` and `vp test` pass clean.
- [ ] Update `README.md` with feature list + screenshot.

**Commit:** `docs: update README and finalize release`

---

## Sequencing & dependencies

```
Phase 1 (1.1–1.5) ──┐
                    ├──▶ Phase 2 (2.1–2.5) ──┐
                    │                        ├──▶ Phase 3 (3.1–3.4) ──▶ Phase 4 (4.1–4.5) ──┐
                    │                        │                                                  ├──▶ Phase 6 ──▶ Phase 7
                    │                        └──▶ Phase 5 (5.1–5.5) ───────────────────────────┘
                    └── Tasks 1.1, 1.2, 1.5 are safe to ship in parallel.
```

- **Phase 1 is prerequisite** to everything — don't refactor on top of dead code and `any`.
- **Phase 2 unlocks Phases 3–5** because hooks are the integration points for new features.
- **Phases 3, 4, 5 are largely independent** after Phase 2 and can be parallelized across subagents.
- **Phase 6 depends on the final component structure** from Phase 2 and design language from Phase 3.
- **Phase 7 is last** — delight is built on a stable foundation.

---

## Risks & mitigations

| Risk                                          | Mitigation                                                      |
| --------------------------------------------- | --------------------------------------------------------------- |
| Refactor breaks preview/batch                 | Each task ends with `vp test`; keep visual diff zero in Phase 2 |
| PowerSync removal surprises a hidden consumer | Task 1.5 includes a grep gate before deletion                   |
| Undo stack grows unbounded                    | Cap at 50 entries (Task 4.3)                                    |
| Parallel batch increases memory               | Task 5.3 keeps parallelism at 3; Task 5.5 revokes URLs          |
| Dark-mode FOUC                                | Task 3.2 inlines a pre-hydration script                         |
| Sample PDF bloats bundle                      | Task 7.2 budgets < 30KB and verifies                            |

---

## Done

When all phases ship, PDF Watermark Studio is: correctly titled, type-safe, dead-code-free, decomposed into testable hooks, dark-mode capable, keyboard-first, accessible, observable during batch, responsive on mobile, and genuinely delightful to use.
