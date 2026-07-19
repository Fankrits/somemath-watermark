// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import WatermarkControls from "./WatermarkControls";

// Mock ResizeObserver for radix select in jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver;

describe("WatermarkControls", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultTextConfig = {
    text: "TEST",
    fontFamily: "Helvetica",
    fontSize: 24,
    color: "#000000",
    opacity: 0.5,
    rotation: 0,
    placement: "middle-center",
    xOffset: 10,
    yOffset: 20,
  };

  const defaultImageConfig = {
    scale: 1.0,
    opacity: 0.5,
    rotation: 45,
    placement: "middle-center",
    xOffset: 30,
    yOffset: 40,
  };

  const setup = (props = {}) => {
    const setMode = vi.fn();
    const setTextConfig = vi.fn();
    const setImageConfig = vi.fn();
    const setImageFile = vi.fn();

    const utils = render(
      <WatermarkControls
        mode="text"
        setMode={setMode}
        textConfig={defaultTextConfig}
        setTextConfig={setTextConfig}
        imageConfig={defaultImageConfig}
        setImageConfig={setImageConfig}
        imageFile={null}
        setImageFile={setImageFile}
        {...props}
      />,
    );

    return {
      ...utils,
      setMode,
      setTextConfig,
      setImageConfig,
      setImageFile,
    };
  };

  it("renders text watermark controls when mode is text", () => {
    setup({ mode: "text" });

    // Assert that the text content input is rendered with the current value
    const textInput = screen.getByLabelText("Text Content") as HTMLInputElement;
    expect(textInput.value).toBe("TEST");

    // Assert that image upload controls are not present
    expect(screen.queryByLabelText("Upload Image")).toBeNull();
  });

  it("calls setMode when mode button is clicked", () => {
    const { setMode } = setup({ mode: "text" });

    // The redesigned button label is "image Watermark"
    const imageButton = screen.getByRole("button", { name: /image watermark/i });
    fireEvent.click(imageButton);

    expect(setMode).toHaveBeenCalledWith("image");
  });

  it("updates text content configuration when input changes", () => {
    const { setTextConfig } = setup({ mode: "text" });

    const textInput = screen.getByLabelText("Text Content");
    fireEvent.change(textInput, { target: { value: "NEW TEXT" } });

    expect(setTextConfig).toHaveBeenCalledWith({
      ...defaultTextConfig,
      text: "NEW TEXT",
    });
  });

  it("shows offset inputs in text mode (always visible in redesign)", () => {
    // Offsets are always shown in the redesigned sidebar, not only in 'custom' mode
    setup({ mode: "text", textConfig: defaultTextConfig });

    const xOffsetInput = screen.getByLabelText("X Offset (px)") as HTMLInputElement;
    const yOffsetInput = screen.getByLabelText("Y Offset (px)") as HTMLInputElement;

    expect(xOffsetInput.value).toBe("10");
    expect(yOffsetInput.value).toBe("20");

    fireEvent.change(xOffsetInput, { target: { value: "15" } });
    expect(screen.queryAllByLabelText("X Offset (px)")).toHaveLength(1);
  });

  it("renders image watermark controls when mode is image", () => {
    const { setImageFile } = setup({ mode: "image" });

    // Assert that the image controls are present
    const fileLabel = screen.getByText("Upload Image");
    expect(fileLabel).not.toBeNull();

    // Trigger file upload check
    const fileInput = screen.getByLabelText("Upload Image") as HTMLInputElement;
    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(setImageFile).toHaveBeenCalledWith(file);
  });

  it("updates custom offsets in image mode when custom placement is selected", () => {
    const customConfig = { ...defaultImageConfig, placement: "custom" };
    const { setImageConfig } = setup({ mode: "image", imageConfig: customConfig });

    const xOffsetInput = screen.getByLabelText("X Offset (px)") as HTMLInputElement;
    const yOffsetInput = screen.getByLabelText("Y Offset (px)") as HTMLInputElement;

    expect(xOffsetInput.value).toBe("30");
    expect(yOffsetInput.value).toBe("40");

    fireEvent.change(yOffsetInput, { target: { value: "45" } });
    expect(setImageConfig).toHaveBeenCalledWith({
      ...customConfig,
      yOffset: 45,
    });
  });
});
