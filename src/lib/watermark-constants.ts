import type { TextWatermarkConfig, ImageWatermarkConfig } from "./watermark-utils";

/**
 * Tunable constants for the watermark studio. Centralized so magic numbers
 * don't get sprinkled across components, and so defaults can be reused by
 * tests, presets, and the reset action.
 */

/** Debounce window (ms) before a preview re-render is triggered after a config change. */
export const DEBOUNCE_MS = 600;

/** localStorage keys — all prefixed `pdf-watermark-` for easy inspection/clearing. */
export const STORAGE_KEYS = {
  mode: "pdf-watermark-mode",
  textConfig: "pdf-watermark-textConfig",
  imageConfig: "pdf-watermark-imageConfig",
} as const;

/** Initial text watermark config. Used on first load and by the reset action. */
export const DEFAULT_TEXT_CONFIG: TextWatermarkConfig = {
  text: "CONFIDENTIAL",
  fontFamily: "Helvetica",
  fontSize: 32,
  color: "#ff0000",
  opacity: 0.5,
  rotation: -45,
  placement: "middle-center",
  xOffset: 0,
  yOffset: 0,
  isBold: false,
  isItalic: false,
};

/** Initial image watermark config. Used on first load and by the reset action. */
export const DEFAULT_IMAGE_CONFIG: ImageWatermarkConfig = {
  scale: 0.5,
  opacity: 0.5,
  rotation: 0,
  placement: "middle-center",
  xOffset: 0,
  yOffset: 0,
};
