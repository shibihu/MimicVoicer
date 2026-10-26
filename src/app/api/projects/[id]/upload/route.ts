import { NextResponse } from 'next/server';
import { prisma, getOrCreateDefaultUser } from '@/lib/prisma';
import { saveUploadedFile, validateAudioFile } from '@/lib/storage';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const user = await getOrCreateDefaultUser();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided in request' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const validation = validateAudioFile({ name: file.name, size: fileBuffer.length, type: file.type });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const storageKey = await saveUploadedFile(fileBuffer, file.name);

    const asset = await prisma.audioAsset.create({
      data: {
        projectId,
        userId: user.id,
        originalFilename: file.name,
        storageKey,
        mimeType: file.type || 'audio/mpeg',
        fileSize: fileBuffer.length,
        duration: 0,
        assetType: 'original',
      },
    });

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        originalAudioAssetId: asset.id,
        status: 'uploaded',
      },
      include: {
        assets: true,
        segments: { orderBy: { orderIndex: 'asc' } },
      },
    });

    return NextResponse.json({
      success: true,
      asset,
      project: updatedProject,
    });
  } catch (error: any) {
    console.error('POST /api/projects/[id]/upload error:', error);
    return NextResponse.json({ error: error.message || 'File upload failed' }, { status: 500 });
  }
}
