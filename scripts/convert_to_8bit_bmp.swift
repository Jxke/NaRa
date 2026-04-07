import AppKit
import Foundation

struct ConversionError: Error, CustomStringConvertible {
  let description: String
}

func write8BitBMP(from pixels: UnsafePointer<UInt8>, width: Int, height: Int, to outputURL: URL) throws {
  let rowStride = ((width + 3) / 4) * 4
  let imageSize = rowStride * height
  let paletteSize = 256 * 4
  let fileHeaderSize = 14
  let dibHeaderSize = 40
  let pixelOffset = fileHeaderSize + dibHeaderSize + paletteSize
  let fileSize = pixelOffset + imageSize

  var data = Data()
  data.reserveCapacity(fileSize)

  func appendLE<T: FixedWidthInteger>(_ value: T) {
    var littleEndian = value.littleEndian
    withUnsafeBytes(of: &littleEndian) { data.append(contentsOf: $0) }
  }

  data.append(contentsOf: [0x42, 0x4D])
  appendLE(UInt32(fileSize))
  appendLE(UInt16(0))
  appendLE(UInt16(0))
  appendLE(UInt32(pixelOffset))

  appendLE(UInt32(dibHeaderSize))
  appendLE(Int32(width))
  appendLE(Int32(height))
  appendLE(UInt16(1))
  appendLE(UInt16(8))
  appendLE(UInt32(0))
  appendLE(UInt32(imageSize))
  appendLE(Int32(2835))
  appendLE(Int32(2835))
  appendLE(UInt32(256))
  appendLE(UInt32(0))

  for value in 0...255 {
    data.append(UInt8(value))
    data.append(UInt8(value))
    data.append(UInt8(value))
    data.append(0)
  }

  for y in stride(from: height - 1, through: 0, by: -1) {
    let row = pixels.advanced(by: y * width)
    data.append(row, count: width)
    if rowStride > width {
      data.append(contentsOf: repeatElement(0, count: rowStride - width))
    }
  }

  try data.write(to: outputURL)
}

func convert(_ inputPath: String, size: Int = 128) throws {
  let inputURL = URL(fileURLWithPath: inputPath)
  guard let source = NSImage(contentsOf: inputURL) else {
    throw ConversionError(description: "Unable to load \(inputPath)")
  }

  guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 1,
    hasAlpha: false,
    isPlanar: false,
    colorSpaceName: .deviceWhite,
    bytesPerRow: size,
    bitsPerPixel: 8
  ) else {
    throw ConversionError(description: "Unable to allocate bitmap for \(inputPath)")
  }

  NSGraphicsContext.saveGraphicsState()
  guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    throw ConversionError(description: "Unable to create graphics context for \(inputPath)")
  }
  NSGraphicsContext.current = context
  context.cgContext.setFillColor(NSColor.white.cgColor)
  context.cgContext.fill(CGRect(x: 0, y: 0, width: size, height: size))

  let sourceSize = source.size
  let aspect = min(CGFloat(size) / sourceSize.width, CGFloat(size) / sourceSize.height)
  let drawWidth = sourceSize.width * aspect
  let drawHeight = sourceSize.height * aspect
  let drawRect = CGRect(
    x: (CGFloat(size) - drawWidth) / 2,
    y: (CGFloat(size) - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight
  )
  source.draw(in: drawRect, from: .zero, operation: .copy, fraction: 1.0)
  context.flushGraphics()
  NSGraphicsContext.restoreGraphicsState()

  guard let pixels = bitmap.bitmapData else {
    throw ConversionError(description: "Missing bitmap data for \(inputPath)")
  }

  let outputURL = inputURL.deletingPathExtension().appendingPathExtension("bmp")
  try write8BitBMP(from: pixels, width: size, height: size, to: outputURL)
  print("Wrote \(outputURL.path)")
}

let inputs = Array(CommandLine.arguments.dropFirst())
guard !inputs.isEmpty else {
  fputs("Usage: convert_to_8bit_bmp.swift <image> [<image> ...]\n", stderr)
  exit(1)
}

do {
  for input in inputs {
    try convert(input)
  }
} catch {
  fputs("\(error)\n", stderr)
  exit(1)
}
