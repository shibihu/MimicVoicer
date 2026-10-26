import { NextResponse } from 'next/server';
import { prisma, getOrCreateDefaultUser } from '@/lib/prisma';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        assets: true,
        segments: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateDefaultUser();
    const body = await req.json().catch(() => ({}));
    const name = body.name || 'New MimicVoicer Studio Session';

    const project = await prisma.project.create({
      data: {
        name,
        userId: user.id,
        language: 'auto',
        status: 'created',
      },
      include: {
        assets: true,
        segments: true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create project' }, { status: 500 });
  }
}
