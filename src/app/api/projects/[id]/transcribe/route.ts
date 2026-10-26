import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transcriptionService } from '@/lib/transcription';
import { getAbsolutePath } from '@/lib/storage';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const body = await req.json().catch(() => ({}));
    const provider = body.provider || 'fallback';
    const language = body.language || 'auto';

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { assets: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const audioAsset = project.assets.find((a: { id: string }) => a.id === project.originalAudioAssetId) || project.assets[0];

    if (!audioAsset) {
      return NextResponse.json({ error: 'No audio asset found for this project. Please upload an audio file first.' }, { status: 400 });
    }

    const filePath = getAbsolutePath(audioAsset.storageKey);

    const job = await prisma.transcriptionJob.create({
      data: {
        projectId,
        status: 'in_progress',
        provider,
        startedAt: new Date(),
      },
    });

    try {
      const transcribeResult = await transcriptionService.transcribe(filePath, provider, language);

      await prisma.$transaction([
        prisma.transcriptSegment.deleteMany({ where: { projectId } }),
        prisma.transcriptSegment.createMany({
          data: transcribeResult.segments.map((seg, idx) => ({
            projectId,
            startTime: seg.start,
            endTime: seg.end,
            text: seg.text,
            confidence: seg.confidence ?? null,
            orderIndex: idx,
          })),
        }),
        prisma.project.update({
          where: { id: projectId },
          data: {
            duration: transcribeResult.duration,
            language: transcribeResult.language || language,
            status: 'completed',
          },
        }),
        prisma.audioAsset.update({
          where: { id: audioAsset.id },
          data: {
            duration: transcribeResult.duration,
          },
        }),
        prisma.transcriptionJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        }),
      ]);

      const updatedProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          assets: true,
          segments: { orderBy: { orderIndex: 'asc' } },
        },
      });

      return NextResponse.json({
        success: true,
        project: updatedProject,
      });
    } catch (transcribeError: any) {
      await prisma.transcriptionJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: transcribeError.message || 'Transcription processing failed',
          completedAt: new Date(),
        },
      });

      return NextResponse.json(
        { error: transcribeError.message || 'Transcription failed' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('POST /api/projects/[id]/transcribe error:', error);
    return NextResponse.json({ error: error.message || 'Transcription request failed' }, { status: 500 });
  }
}
