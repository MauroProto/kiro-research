import { NextRequest, NextResponse } from 'next/server';

// Generate a simple ICO file (1x1 pixel)
function generateFavicon(color: string): Buffer {
  // Simple 16x16 ICO file
  const width = 16;
  const height = 16;
  
  // Parse color
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  
  // ICO header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // Reserved
  header.writeUInt16LE(1, 2);      // Type (1 = ICO)
  header.writeUInt16LE(1, 4);      // Number of images
  
  // ICO directory entry (16 bytes)
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(width, 0);   // Width
  dirEntry.writeUInt8(height, 1);  // Height
  dirEntry.writeUInt8(0, 2);       // Color palette
  dirEntry.writeUInt8(0, 3);       // Reserved
  dirEntry.writeUInt16LE(1, 4);    // Color planes
  dirEntry.writeUInt16LE(32, 6);   // Bits per pixel
  
  // Bitmap data (BITMAPINFOHEADER + pixel data)
  const bmpHeaderSize = 40;
  const pixelDataSize = width * height * 4;
  const bmpSize = bmpHeaderSize + pixelDataSize;
  
  dirEntry.writeUInt32LE(bmpSize, 8);  // Size of image data
  dirEntry.writeUInt32LE(22, 12);      // Offset to image data
  
  // BITMAPINFOHEADER (40 bytes)
  const bmpHeader = Buffer.alloc(40);
  bmpHeader.writeUInt32LE(40, 0);      // Header size
  bmpHeader.writeInt32LE(width, 4);    // Width
  bmpHeader.writeInt32LE(height * 2, 8); // Height (doubled for ICO)
  bmpHeader.writeUInt16LE(1, 12);      // Planes
  bmpHeader.writeUInt16LE(32, 14);     // Bits per pixel
  bmpHeader.writeUInt32LE(0, 16);      // Compression
  bmpHeader.writeUInt32LE(pixelDataSize, 20); // Image size
  
  // Pixel data (BGRA format, bottom-up)
  const pixels = Buffer.alloc(pixelDataSize);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    pixels.writeUInt8(b, offset);      // Blue
    pixels.writeUInt8(g, offset + 1);  // Green
    pixels.writeUInt8(r, offset + 2);  // Red
    pixels.writeUInt8(255, offset + 3); // Alpha
  }
  
  return Buffer.concat([header, dirEntry, bmpHeader, pixels]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathParts = path;
  const filename = pathParts[pathParts.length - 1];
  
  // Parse filename: bit_0_0.ico or bit_0_1.ico
  const match = filename.match(/^bit_(\d+)_([01])\.ico$/);
  
  if (!match) {
    return new NextResponse('Not found', { status: 404 });
  }
  
  const position = parseInt(match[1]);
  const value = match[2];
  
  // Different colors for 0 and 1 bits
  // Using subtle differences that browser won't notice visually
  const color = value === '0' ? '9046ff' : '9146ff';
  
  const favicon = generateFavicon(color);
  
  return new NextResponse(new Uint8Array(favicon), {
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Bit-Position': position.toString(),
      'X-Bit-Value': value,
    },
  });
}

