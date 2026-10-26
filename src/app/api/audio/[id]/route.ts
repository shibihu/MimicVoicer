import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAbsolutePath } from '@/lib/storage';
import fs from 'fs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const asset = await prisma.audioAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Audio asset not found' }, { status: 404 });
    }

    const filePath = getAbsolutePath(asset.storageKey);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Audio file not found on disk' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const fileStream = fs.createReadStream(filePath, { start, end });

      const readableStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(readableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': asset.mimeType || 'audio/mpeg',
        },
      });
    } else {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': asset.mimeType || 'audio/mpeg',
        },
      });
    }
  } catch (error: any) {
    console.error('GET /api/audio/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Audio streaming failed' }, { status: 500 });
  }
}
