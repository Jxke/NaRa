const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const GLYPH_DIR = path.join(ROOT, "glyphs");
const OUTPUT = path.join(ROOT, "ROCK", "consult_glyph_bitmaps.h");
const TARGET_WIDTH = 48;
const TARGET_HEIGHT = 48;
const THRESHOLD = 200;

function readBmp(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString("ascii", 0, 2) !== "BM") {
    throw new Error(`Unsupported BMP signature: ${filePath}`);
  }

  const pixelOffset = buffer.readUInt32LE(10);
  const width = buffer.readInt32LE(18);
  const height = buffer.readInt32LE(22);
  const bitsPerPixel = buffer.readUInt16LE(28);

  if (bitsPerPixel !== 8) {
    throw new Error(`Expected 8-bit BMP: ${filePath}`);
  }

  const absHeight = Math.abs(height);
  const rowStride = Math.ceil(width / 4) * 4;
  const topDown = height < 0;

  return {
    width,
    height: absHeight,
    getPixel(x, y) {
      const sourceY = topDown ? y : (absHeight - 1 - y);
      return buffer[pixelOffset + sourceY * rowStride + x];
    },
  };
}

function packBitmap(source) {
  const rowBytes = Math.ceil(TARGET_WIDTH / 8);
  const packed = new Uint8Array(rowBytes * TARGET_HEIGHT);

  for (let y = 0; y < TARGET_HEIGHT; y++) {
    const srcY = Math.floor(y * source.height / TARGET_HEIGHT);
    for (let x = 0; x < TARGET_WIDTH; x++) {
      const srcX = Math.floor(x * source.width / TARGET_WIDTH);
      const pixel = source.getPixel(srcX, srcY);
      if (pixel < THRESHOLD) {
        const byteIndex = y * rowBytes + (x >> 3);
        packed[byteIndex] |= 0x80 >> (x & 7);
      }
    }
  }

  return packed;
}

function toIdentifier(fileName) {
  return path.basename(fileName, ".bmp").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function formatBytes(bytes) {
  const values = Array.from(bytes, (byte) => `0x${byte.toString(16).padStart(2, "0").toUpperCase()}`);
  const lines = [];
  for (let i = 0; i < values.length; i += 12) {
    lines.push(`  ${values.slice(i, i + 12).join(", ")}`);
  }
  return lines.join(",\n");
}

const bmpFiles = fs.readdirSync(GLYPH_DIR)
  .filter((name) => name.endsWith(".bmp"))
  .sort();

const header = [];
header.push("#pragma once");
header.push("#include <pgmspace.h>");
header.push("");
header.push("constexpr uint16_t CONSULT_GLYPH_BITMAP_WIDTH = 48;");
header.push("constexpr uint16_t CONSULT_GLYPH_BITMAP_HEIGHT = 48;");
header.push("");
header.push("struct ConsultGlyphBitmapEntry {");
header.push("  const char* id;");
header.push("  const uint8_t* bitmap;");
header.push("};");
header.push("");

const tableEntries = [];

for (const file of bmpFiles) {
  const source = readBmp(path.join(GLYPH_DIR, file));
  const packed = packBitmap(source);
  const id = path.basename(file, ".bmp");
  const identifier = `${toIdentifier(file)}_BITMAP`;
  header.push(`const uint8_t ${identifier}[] PROGMEM = {`);
  header.push(formatBytes(packed));
  header.push("};");
  header.push("");
  tableEntries.push(`  {"${id}", ${identifier}}`);
}

header.push("const ConsultGlyphBitmapEntry CONSULT_GLYPH_BITMAPS[] = {");
header.push(tableEntries.join(",\n"));
header.push("};");
header.push("");
header.push("constexpr size_t CONSULT_GLYPH_BITMAP_COUNT = sizeof(CONSULT_GLYPH_BITMAPS) / sizeof(CONSULT_GLYPH_BITMAPS[0]);");
header.push("");

fs.writeFileSync(OUTPUT, `${header.join("\n")}\n`);
console.log(`Wrote ${OUTPUT}`);
