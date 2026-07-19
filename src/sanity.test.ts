import { expect, test } from "vite-plus/test";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

test("verify core libraries are importable and functional", async () => {
  expect(PDFDocument).toBeDefined();
  expect(JSZip).toBeDefined();

  // Simple sanity check for pdf-lib
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([100, 100]);
  const pdfBytes = await pdfDoc.save();
  expect(pdfBytes).toBeDefined();
  expect(pdfBytes.length).toBeGreaterThan(0);

  // Simple sanity check for jszip
  const zip = new JSZip();
  zip.file("hello.txt", "Hello World");
  const content = await zip.generateAsync({ type: "string" });
  expect(content).toBeDefined();
});
