import { useState } from "react";
import { Type, ImageIcon, Bold, Italic, Grid3X3, AlignCenter } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerEyeDropper,
  ColorPickerFormatSelect,
  ColorPickerHueSlider,
  ColorPickerAlphaSlider,
  ColorPickerInput,
  ColorPickerTrigger,
  ColorPickerSwatch,
} from "./ui/color-picker";
import type { WatermarkPlacement } from "#/lib/watermark-utils";

interface ControlsProps {
  mode?: "text" | "image";
  activeMode?: "text" | "image";
  setMode: (mode: "text" | "image") => void;
  textConfig: any;
  setTextConfig: (config: any) => void;
  imageConfig: any;
  setImageConfig: (config: any) => void;
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
}

// 3×3 grid + tile + custom positions
const PLACEMENT_GRID: Array<{ value: WatermarkPlacement; label: string }> = [
  { value: "top-left", label: "↖" },
  { value: "top-center", label: "↑" },
  { value: "top-right", label: "↗" },
  { value: "middle-left", label: "←" },
  { value: "middle-center", label: "✦" },
  { value: "middle-right", label: "→" },
  { value: "bottom-left", label: "↙" },
  { value: "bottom-center", label: "↓" },
  { value: "bottom-right", label: "↘" },
];

function PositionGrid({
  value,
  onChange,
}: {
  value: WatermarkPlacement;
  onChange: (v: WatermarkPlacement) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {PLACEMENT_GRID.map((pos) => {
        const isActive = value === pos.value;
        return (
          <button
            key={pos.value}
            type="button"
            title={pos.value.replace(/-/g, " ")}
            onClick={() => onChange(pos.value)}
            className={[
              "h-10 w-full rounded-lg border text-lg font-bold transition-all duration-150 select-none",
              "hover:border-[var(--lagoon)] hover:bg-[var(--lagoon)]/10 hover:text-[var(--lagoon-deep)]",
              isActive
                ? "border-[var(--lagoon)] bg-[var(--lagoon)]/20 text-[var(--lagoon-deep)] shadow-sm shadow-[var(--lagoon)]/30"
                : "border-[var(--line)] bg-white/40 text-[var(--sea-ink-soft)]",
            ].join(" ")}
          >
            {pos.label}
          </button>
        );
      })}
    </div>
  );
}

export default function WatermarkControls({
  mode,
  activeMode,
  setMode,
  textConfig,
  setTextConfig,
  imageConfig,
  setImageConfig,
  imageFile: _imageFile,
  setImageFile,
}: ControlsProps) {
  const resolvedMode = activeMode || mode || "text";
  const [tileEnabled, setTileEnabled] = useState(
    textConfig.placement === "tile" || imageConfig.placement === "tile",
  );

  const updateText = (key: string, val: any) => setTextConfig({ ...textConfig, [key]: val });
  const updateImage = (key: string, val: any) => setImageConfig({ ...imageConfig, [key]: val });

  const currentPlacement: WatermarkPlacement =
    resolvedMode === "text" ? textConfig.placement : imageConfig.placement;

  const handlePlacementChange = (v: WatermarkPlacement) => {
    if (resolvedMode === "text") updateText("placement", v);
    else updateImage("placement", v);
  };

  const handleTileToggle = (enabled: boolean) => {
    setTileEnabled(enabled);
    const v: WatermarkPlacement = enabled ? "tile" : "middle-center";
    if (resolvedMode === "text") updateText("placement", v);
    else updateImage("placement", v);
  };

  return (
    <div className="island-shell rounded-2xl overflow-hidden">
      {/* ── MODE SELECTOR ── */}
      <div className="p-4 border-b border-[var(--line)]">
        <p className="island-kicker mb-3">Watermark Type</p>
        <div className="grid grid-cols-2 gap-2">
          {(["text", "image"] as const).map((m) => {
            const active = resolvedMode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={[
                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                  active
                    ? "border-[var(--lagoon)] bg-[var(--lagoon)]/15 text-[var(--lagoon-deep)] shadow-md shadow-[var(--lagoon)]/20"
                    : "border-[var(--line)] bg-white/30 text-[var(--sea-ink-soft)] hover:border-[var(--lagoon)]/50 hover:bg-[var(--lagoon)]/5",
                ].join(" ")}
              >
                {m === "text" ? (
                  <Type
                    className={`h-6 w-6 ${active ? "text-[var(--lagoon-deep)]" : "text-[var(--sea-ink-soft)]"}`}
                  />
                ) : (
                  <ImageIcon
                    className={`h-6 w-6 ${active ? "text-[var(--lagoon-deep)]" : "text-[var(--sea-ink-soft)]"}`}
                  />
                )}
                <span className="text-xs font-semibold capitalize">{m} Watermark</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* ── TEXT MODE ── */}
        {resolvedMode === "text" ? (
          <>
            <div>
              <Label
                htmlFor="watermark-text"
                className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide"
              >
                Text Content
              </Label>
              <Input
                id="watermark-text"
                value={textConfig.text || ""}
                onChange={(e) => updateText("text", e.target.value)}
                placeholder="CONFIDENTIAL"
                className="mt-1.5 bg-white/50"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
                Font Family
              </Label>
              <Select
                value={textConfig.fontFamily}
                onValueChange={(val) => updateText("fontFamily", val)}
              >
                <SelectTrigger className="mt-1.5 bg-white/50">
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

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={textConfig.isBold ? "default" : "outline"}
                className="flex-1 gap-1.5"
                onClick={() => updateText("isBold", !textConfig.isBold)}
              >
                <Bold className="h-3.5 w-3.5" /> Bold
              </Button>
              <Button
                type="button"
                size="sm"
                variant={textConfig.isItalic ? "default" : "outline"}
                className="flex-1 gap-1.5 italic"
                onClick={() => updateText("isItalic", !textConfig.isItalic)}
              >
                <Italic className="h-3.5 w-3.5" /> Italic
              </Button>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
                  Font Size ({textConfig.fontSize}px)
                </Label>
                <Slider
                  min={12}
                  max={96}
                  step={1}
                  value={[textConfig.fontSize]}
                  onValueChange={([val]) => updateText("fontSize", val)}
                  className="mt-2"
                />
              </div>
              <div className="shrink-0">
                <Label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide block mb-1.5">
                  Color
                </Label>
                <ColorPicker
                  value={textConfig.color}
                  onValueChange={(val) => updateText("color", val)}
                >
                  <ColorPickerTrigger className="h-9 w-12 rounded-lg border border-[var(--line)] p-0 shadow-sm">
                    <ColorPickerSwatch className="h-full w-full rounded-[inherit]" />
                  </ColorPickerTrigger>
                  <ColorPickerContent className="z-50">
                    <ColorPickerArea />
                    <ColorPickerHueSlider />
                    <ColorPickerAlphaSlider />
                    <div className="flex items-center gap-2">
                      <ColorPickerEyeDropper />
                      <ColorPickerInput />
                      <ColorPickerFormatSelect />
                    </div>
                  </ColorPickerContent>
                </ColorPicker>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
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
              <Label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
                Rotation ({textConfig.rotation}°)
              </Label>
              <Slider
                min={-180}
                max={180}
                step={5}
                value={[textConfig.rotation]}
                onValueChange={([val]) => updateText("rotation", val)}
                className="mt-2"
              />
            </div>
          </>
        ) : (
          /* ── IMAGE MODE ── */
          <>
            <div>
              <Label
                htmlFor="image-file"
                className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide"
              >
                Upload Image
              </Label>
              <Input
                id="image-file"
                type="file"
                accept="image/png, image/jpeg"
                onChange={(e) => {
                  if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                }}
                className="mt-1.5 bg-white/50 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[var(--lagoon)] file:text-white"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
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
              <Label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
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
              <Label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
                Rotation ({imageConfig.rotation}°)
              </Label>
              <Slider
                min={-180}
                max={180}
                step={5}
                value={[imageConfig.rotation]}
                onValueChange={([val]) => updateImage("rotation", val)}
                className="mt-2"
              />
            </div>
          </>
        )}

        {/* ── POSITION SECTION (shared) ── */}
        <div className="border-t border-[var(--line)] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="island-kicker flex items-center gap-1.5">
              <AlignCenter className="h-3 w-3" /> Position
            </p>
          </div>

          <PositionGrid
            value={tileEnabled ? "tile" : currentPlacement}
            onChange={(v) => {
              setTileEnabled(false);
              handlePlacementChange(v);
            }}
          />

          {/* Tile toggle */}
          <button
            type="button"
            onClick={() => handleTileToggle(!tileEnabled)}
            className={[
              "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-150",
              tileEnabled
                ? "border-[var(--lagoon)] bg-[var(--lagoon)]/15 text-[var(--lagoon-deep)]"
                : "border-[var(--line)] bg-white/30 text-[var(--sea-ink-soft)] hover:border-[var(--lagoon)]/40",
            ].join(" ")}
          >
            <span className="flex items-center gap-2">
              <Grid3X3 className="h-3.5 w-3.5" /> Tile / Repeat Pattern
            </span>
            <span
              className={`h-4 w-7 rounded-full transition-colors duration-200 relative ${tileEnabled ? "bg-[var(--lagoon)]" : "bg-[var(--line)]"}`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ${tileEnabled ? "translate-x-3.5" : "translate-x-0.5"}`}
              />
            </span>
          </button>

          {/* Fine-tune offsets */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="offset-x" className="text-xs text-[var(--sea-ink-soft)]">
                X Offset (px)
              </Label>
              <Input
                id="offset-x"
                type="number"
                value={resolvedMode === "text" ? textConfig.xOffset : imageConfig.xOffset}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (resolvedMode === "text") updateText("xOffset", v);
                  else updateImage("xOffset", v);
                }}
                className="mt-1 bg-white/50 text-sm h-8"
              />
            </div>
            <div>
              <Label htmlFor="offset-y" className="text-xs text-[var(--sea-ink-soft)]">
                Y Offset (px)
              </Label>
              <Input
                id="offset-y"
                type="number"
                value={resolvedMode === "text" ? textConfig.yOffset : imageConfig.yOffset}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (resolvedMode === "text") updateText("yOffset", v);
                  else updateImage("yOffset", v);
                }}
                className="mt-1 bg-white/50 text-sm h-8"
              />
            </div>
          </div>

          {/* Tile spacing (only shown when tiling) */}
          {tileEnabled && (
            <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <Label className="text-xs text-[var(--sea-ink-soft)]">H Spacing (px)</Label>
                <Input
                  type="number"
                  value={
                    resolvedMode === "text"
                      ? (textConfig.gridSpacingX ?? 200)
                      : (imageConfig.gridSpacingX ?? 200)
                  }
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (resolvedMode === "text") updateText("gridSpacingX", v);
                    else updateImage("gridSpacingX", v);
                  }}
                  className="mt-1 bg-white/50 text-sm h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-[var(--sea-ink-soft)]">V Spacing (px)</Label>
                <Input
                  type="number"
                  value={
                    resolvedMode === "text"
                      ? (textConfig.gridSpacingY ?? 200)
                      : (imageConfig.gridSpacingY ?? 200)
                  }
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (resolvedMode === "text") updateText("gridSpacingY", v);
                    else updateImage("gridSpacingY", v);
                  }}
                  className="mt-1 bg-white/50 text-sm h-8"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
