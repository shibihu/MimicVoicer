import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();

    if (!Array.isArray(body.segments)) {
      return NextResponse.json({ error: 'segments must be an array' }, { status: 400 });
    }

    const segments = body.segments;

    await prisma.$transaction([
      prisma.transcriptSegment.deleteMany({
        where: { projectId },
      }),
      prisma.transcriptSegment.createMany({
        data: segments.map((seg: any, idx: number) => ({
          projectId,
          startTime: Number(seg.startTime) || 0,
          endTime: Number(seg.endTime) || 0,
          text: String(seg.text || ''),
          confidence: seg.confidence !== undefined ? seg.confidence : null,
          orderIndex: idx,
        })),
      }),
      prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      }),
    ]);

    const updatedSegments = await prisma.transcriptSegment.findMany({
      where: { projectId },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({
      success: true,
      segments: updatedSegments,
    });
  } catch (error: any) {
    console.error('PUT /api/projects/[id]/segments error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update segments' }, { status: 500 });
  }
}
