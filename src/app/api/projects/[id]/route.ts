import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/storage';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        assets: true,
        segments: {
          orderBy: { orderIndex: 'asc' },
        },
        jobs: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.language && { language: body.language }),
        ...(body.status && { status: body.status }),
      },
      include: {
        assets: true,
        segments: { orderBy: { orderIndex: 'asc' } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH /api/projects/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const assets = await prisma.audioAsset.findMany({
      where: { projectId: id },
    });

    for (const asset of assets) {
      deleteFile(asset.storageKey);
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete project' }, { status: 500 });
  }
}
