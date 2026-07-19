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
            variant={resolvedMode === "text" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("text")}
          >
            Text
          </Button>
          <Button
            variant={resolvedMode === "image" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("image")}
          >
            Image
          </Button>
        </div>
      </div>

      {resolvedMode === "text" ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="watermark-text" className="text-xs font-semibold">
              Text Content
            </Label>
            <Input
              id="watermark-text"
              value={textConfig.text || ""}
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
              <div className="mt-1">
                <ColorPicker
                  value={textConfig.color}
                  onValueChange={(val) => updateText("color", val)}
                >
                  <ColorPickerTrigger className="h-9 w-12 rounded-md border p-0 shadow-sm">
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
                <Label htmlFor="text-x-offset" className="text-xs font-semibold">
                  X Offset (px)
                </Label>
                <Input
                  id="text-x-offset"
                  type="number"
                  value={textConfig.xOffset}
                  onChange={(e) => updateText("xOffset", Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="text-y-offset" className="text-xs font-semibold">
                  Y Offset (px)
                </Label>
                <Input
                  id="text-y-offset"
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
            <Label htmlFor="image-file" className="text-xs font-semibold">
              Upload Image
            </Label>
            <Input
              id="image-file"
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
                <Label htmlFor="image-x-offset" className="text-xs font-semibold">
                  X Offset (px)
                </Label>
                <Input
                  id="image-x-offset"
                  type="number"
                  value={imageConfig.xOffset}
                  onChange={(e) => updateImage("xOffset", Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="image-y-offset" className="text-xs font-semibold">
                  Y Offset (px)
                </Label>
                <Input
                  id="image-y-offset"
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
