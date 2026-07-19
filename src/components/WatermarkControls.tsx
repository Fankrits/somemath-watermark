import { useState, useRef } from "react";
import {
  Type,
  ImageIcon,
  Bold,
  Italic,
  Grid3X3,
  AlignCenter,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
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
  { value: "top-left", label: "Top Left" },
  { value: "top-center", label: "Top Center" },
  { value: "top-right", label: "Top Right" },
  { value: "middle-left", label: "Center Left" },
  { value: "middle-center", label: "Center" },
  { value: "middle-right", label: "Center Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-right", label: "Bottom Right" },
];

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (val: T) => void;
  disabled?: boolean;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: SegmentedControlProps<T>) {
  return (
    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl border border-[var(--line)] bg-white/20 shadow-inner">
      {options.map((opt) => {
        const isActive = value === opt.value && !disabled;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={[
              "py-2 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer select-none text-center outline-none",
              disabled
                ? "opacity-30 cursor-not-allowed text-[var(--sea-ink-soft)]"
                : isActive
                  ? "bg-[var(--lagoon)]/25 text-[var(--lagoon-deep)] shadow-sm shadow-[var(--lagoon)]/10 ring-1 ring-[var(--lagoon)]/10"
                  : "text-[var(--sea-ink-soft)] hover:bg-white/40 hover:text-[var(--sea-ink)]",
            ].join(" ")}
          >
            {opt.label}
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
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <Tabs
          value={resolvedMode}
          onValueChange={(val) => setMode(val as "text" | "image")}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 w-full bg-white/40 border border-[var(--line)]">
            <TabsTrigger
              value="text"
              aria-label="Text Watermark"
              onClick={() => setMode("text")}
              className="gap-1.5 py-2 cursor-pointer data-[state=active]:bg-[var(--lagoon)]/15 data-[state=active]:text-[var(--lagoon-deep)]"
            >
              <Type className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Text Watermark</span>
            </TabsTrigger>
            <TabsTrigger
              value="image"
              aria-label="Image Watermark"
              onClick={() => setMode("image")}
              className="gap-1.5 py-2 cursor-pointer data-[state=active]:bg-[var(--lagoon)]/15 data-[state=active]:text-[var(--lagoon-deep)]"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Image Watermark</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files?.[0]) {
                    const file = e.dataTransfer.files[0];
                    if (file.type.includes("png") || file.type.includes("jpeg")) {
                      setImageFile(file);
                    }
                  }
                }}
                className={`mt-1.5 flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                  dragActive
                    ? "border-[var(--lagoon)] bg-[var(--lagoon)]/10 text-[var(--lagoon-deep)]"
                    : "border-[var(--line)] bg-white/40 hover:bg-white/60 text-[var(--sea-ink-soft)] hover:border-[var(--lagoon)]/50"
                }`}
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                {_imageFile ? (
                  <div className="flex items-center justify-between w-full gap-2 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <ImageIcon className="h-5 w-5 text-[var(--lagoon)] shrink-0" />
                      <div className="text-left overflow-hidden">
                        <p className="font-semibold text-[var(--sea-ink)] truncate max-w-[150px]">
                          {_imageFile.name}
                        </p>
                        <p className="text-[10px] text-[var(--sea-ink-soft)]">
                          {(_imageFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-7 w-7 text-gray-400 mb-1.5" />
                    <p className="text-[11px] text-center font-medium">
                      Drag & drop image here or click to browse
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5">PNG or JPEG only</p>
                  </>
                )}
                {/* Keep file input labeled and linked for standard HTML functionality & test compatibility */}
                <input
                  id="image-file"
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                  }}
                />
              </div>
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
        <div className="border-t border-[var(--line)] pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="island-kicker flex items-center gap-1.5">
              <AlignCenter className="h-3 w-3" /> Position Alignment
            </p>
          </div>

          {/* Interactive Document Page Layout Grid */}
          <div className="flex justify-center py-2">
            <div className="w-44 aspect-[3/4] border border-[var(--line)] bg-white/30 shadow-sm rounded-xl relative overflow-hidden transition-all duration-300 hover:shadow-md hover:bg-white/50 group/paper">
              {/* Visual paper lines grid */}
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-transparent bg-[size:8px_8px]" />

              {/* Tiled preview backdrop representation */}
              {tileEnabled && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-2 gap-2 opacity-25 pointer-events-none">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center border border-dashed border-[var(--sea-ink-soft)]/20 rounded text-[7px] font-bold uppercase tracking-widest text-[var(--sea-ink-soft)] rotate-[-15deg] select-none"
                    >
                      {resolvedMode === "text" ? textConfig.text?.substring(0, 3) || "TXT" : "IMG"}
                    </div>
                  ))}
                </div>
              )}

              {/* Floating alignment badge */}
              {!tileEnabled && (
                <div
                  className={`absolute pointer-events-none transition-all duration-300 ease-out z-10 ${
                    currentPlacement === "top-left"
                      ? "top-3 left-3"
                      : currentPlacement === "top-center"
                        ? "top-3 left-1/2 -translate-x-1/2"
                        : currentPlacement === "top-right"
                          ? "top-3 right-3"
                          : currentPlacement === "middle-left"
                            ? "top-1/2 -translate-y-1/2 left-3"
                            : currentPlacement === "middle-center"
                              ? "top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2"
                              : currentPlacement === "middle-right"
                                ? "top-1/2 -translate-y-1/2 right-3"
                                : currentPlacement === "bottom-left"
                                  ? "bottom-3 left-3"
                                  : currentPlacement === "bottom-center"
                                    ? "bottom-3 left-1/2 -translate-x-1/2"
                                    : currentPlacement === "bottom-right"
                                      ? "bottom-3 right-3"
                                      : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  }`}
                >
                  <div
                    className="transition-all duration-300 ease-out flex items-center justify-center px-1.5 py-0.5 rounded border border-[var(--lagoon)]/30 bg-[var(--lagoon)]/15 shadow-sm whitespace-nowrap"
                    style={{
                      transform: `rotate(${resolvedMode === "text" ? textConfig.rotation : imageConfig.rotation}deg)`,
                    }}
                  >
                    {resolvedMode === "text" ? (
                      <span className="text-[7px] font-extrabold text-[var(--lagoon-deep)] truncate max-w-[50px] select-none uppercase tracking-wider">
                        {textConfig.text || "WATERMARK"}
                      </span>
                    ) : (
                      <ImageIcon className="h-2.5 w-2.5 text-[var(--lagoon-deep)]" />
                    )}
                  </div>
                </div>
              )}

              {/* Grid dots selector */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0 p-1.5 z-20">
                {PLACEMENT_GRID.map((pos) => {
                  const isActive = currentPlacement === pos.value && !tileEnabled;
                  return (
                    <button
                      key={pos.value}
                      type="button"
                      title={pos.label}
                      onClick={() => {
                        setTileEnabled(false);
                        handlePlacementChange(pos.value);
                      }}
                      className="flex justify-center items-center relative group/btn w-full h-full cursor-pointer focus:outline-none"
                    >
                      {/* Interactive dot target */}
                      <div
                        className={`rounded-full transition-all duration-200 ${
                          isActive
                            ? "w-2.5 h-2.5 bg-[var(--lagoon)] ring-4 ring-[var(--lagoon)]/25"
                            : "w-1 h-1 bg-gray-300/80 group-hover/btn:w-2 group-hover/btn:h-2 group-hover/btn:bg-[var(--lagoon)]/60"
                        }`}
                      />
                      {/* Pulse effect */}
                      {isActive && (
                        <div className="absolute w-5 h-5 rounded-full bg-[var(--lagoon)]/25 animate-ping pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Alignment Segmented Controllers */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--sea-ink-soft)] block">
                Vertical Alignment
              </span>
              <SegmentedControl
                options={[
                  { value: "top", label: "Top" },
                  { value: "middle", label: "Center" },
                  { value: "bottom", label: "Bottom" },
                ]}
                value={
                  tileEnabled
                    ? "middle"
                    : (() => {
                        if (currentPlacement === "tile" || currentPlacement === "custom")
                          return "middle";
                        const parts = currentPlacement.split("-");
                        return (parts[0] as "top" | "middle" | "bottom") || "middle";
                      })()
                }
                onChange={(v) => {
                  setTileEnabled(false);
                  const parts = currentPlacement.split("-");
                  const h = parts[1] || "center";
                  handlePlacementChange(`${v}-${h}` as WatermarkPlacement);
                }}
                disabled={tileEnabled}
              />
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--sea-ink-soft)] block">
                Horizontal Alignment
              </span>
              <SegmentedControl
                options={[
                  { value: "left", label: "Left" },
                  { value: "center", label: "Center" },
                  { value: "right", label: "Right" },
                ]}
                value={
                  tileEnabled
                    ? "center"
                    : (() => {
                        if (currentPlacement === "tile" || currentPlacement === "custom")
                          return "center";
                        const parts = currentPlacement.split("-");
                        return (parts[1] as "left" | "center" | "right") || "center";
                      })()
                }
                onChange={(h) => {
                  setTileEnabled(false);
                  const parts = currentPlacement.split("-");
                  const v = parts[0] || "middle";
                  handlePlacementChange(`${v}-${h}` as WatermarkPlacement);
                }}
                disabled={tileEnabled}
              />
            </div>
          </div>

          {/* Tile toggle */}
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--line)] bg-white/30 text-xs font-semibold text-[var(--sea-ink-soft)]">
            <span className="flex items-center gap-2">
              <Grid3X3 className="h-3.5 w-3.5" /> Tile / Repeat Pattern
            </span>
            <Switch checked={tileEnabled} onCheckedChange={handleTileToggle} />
          </div>

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
