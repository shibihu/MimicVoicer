import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exportToTXT, exportToSRT, exportToVTT, exportToJSON } from '@/lib/export';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const url = new URL(req.url);
    const format = (url.searchParams.get('format') || 'txt').toLowerCase();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        segments: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const segments = project.segments.map((s: { id: string; startTime: number; endTime: number; text: string; confidence: number | null }) => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      text: s.text,
      confidence: s.confidence,
    }));

    let content = '';
    let contentType = 'text/plain; charset=utf-8';
    let fileExtension = 'txt';

    switch (format) {
      case 'srt':
        content = exportToSRT(segments);
        contentType = 'application/x-subrip; charset=utf-8';
        fileExtension = 'srt';
        break;
      case 'vtt':
        content = exportToVTT(segments);
        contentType = 'text/vtt; charset=utf-8';
        fileExtension = 'vtt';
        break;
      case 'json':
        content = exportToJSON(project.name, segments, project.language);
        contentType = 'application/json; charset=utf-8';
        fileExtension = 'json';
        break;
      case 'txt':
      default:
        content = exportToTXT(segments);
        contentType = 'text/plain; charset=utf-8';
        fileExtension = 'txt';
        break;
    }

    const sanitizedProjectName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedProjectName}_transcript.${fileExtension}`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('GET /api/projects/[id]/export error:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
