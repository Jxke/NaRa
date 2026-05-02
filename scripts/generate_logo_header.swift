import AppKit
import Foundation

struct GeneratorError: Error, CustomStringConvertible {
  let message: String
  var description: String { message }
}

func usage() {
  fputs("Usage: generate_logo_header.swift <input.png> <symbol_name> <output.h>\n", stderr)
}

func hexByte(_ value: UInt8) -> String {
  let digits = Array("0123456789ABCDEF")
  return "0x" + String(digits[Int(value >> 4)]) + String(digits[Int(value & 0x0F)])
}

guard CommandLine.arguments.count == 4 else {
  usage()
  exit(1)
}

let inputPath = CommandLine.arguments[1]
let symbolName = CommandLine.arguments[2]
let outputPath = CommandLine.arguments[3]

guard let image = NSImage(contentsOfFile: inputPath) else {
  throw GeneratorError(message: "Unable to load image: \(inputPath)")
}

guard let source = NSBitmapImageRep(data: image.tiffRepresentation ?? Data()) else {
  throw GeneratorError(message: "Unable to decode bitmap data: \(inputPath)")
}

let width = source.pixelsWide
let height = source.pixelsHigh
guard width > 0 && height > 0 else {
  throw GeneratorError(message: "Image has invalid dimensions: \(width)x\(height)")
}

guard let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: width,
  pixelsHigh: height,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
) else {
  throw GeneratorError(message: "Unable to allocate bitmap buffer")
}

bitmap.size = NSSize(width: width, height: height)
NSGraphicsContext.saveGraphicsState()
guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
  throw GeneratorError(message: "Unable to create graphics context")
}
NSGraphicsContext.current = context
context.cgContext.setFillColor(NSColor.white.cgColor)
context.cgContext.fill(CGRect(x: 0, y: 0, width: width, height: height))
image.draw(in: CGRect(x: 0, y: 0, width: width, height: height))
NSGraphicsContext.restoreGraphicsState()

guard let pixels = bitmap.bitmapData else {
  throw GeneratorError(message: "Unable to access pixel buffer")
}

let bytesPerRow = (width + 7) / 8
var output = [UInt8](repeating: 0, count: bytesPerRow * height)
let threshold = 127

for y in 0..<height {
  for x in 0..<width {
    let offset = y * bitmap.bytesPerRow + x * 4
    let r = Int(pixels[offset])
    let g = Int(pixels[offset + 1])
    let b = Int(pixels[offset + 2])
    let luminance = (299 * r + 587 * g + 114 * b) / 1000
    if luminance < threshold {
      let byteIndex = y * bytesPerRow + (x / 8)
      output[byteIndex] |= UInt8(0x80 >> (x % 8))
    }
  }
}

var lines: [String] = []
lines.append("// Nara logo — \(width)x\(height) 1-bit bitmap for e-ink splash screen")
lines.append("// Auto-generated from ROCK/nara_logo.png")
lines.append("")
lines.append("#pragma once")
lines.append("#include <pgmspace.h>")
lines.append("")
lines.append("constexpr uint16_t NARA_LOGO_WIDTH = \(width);")
lines.append("constexpr uint16_t NARA_LOGO_HEIGHT = \(height);")
lines.append("")
lines.append("const uint8_t \(symbolName)[] PROGMEM = {")

let rowChunk = 12
for start in stride(from: 0, to: output.count, by: rowChunk) {
  let end = min(start + rowChunk, output.count)
  let slice = output[start..<end].map(hexByte).joined(separator: ", ")
  let suffix = end < output.count ? "," : ""
  lines.append("  \(slice)\(suffix)")
}

lines.append("};")
lines.append("")

try lines.joined(separator: "\n").write(toFile: outputPath, atomically: true, encoding: .utf8)
