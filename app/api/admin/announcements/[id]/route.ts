import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { parseAnnouncementPayload, serializeAnnouncement } from '@/lib/admin-announcements';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json() as Record<string, unknown>;
    const data = await parseAnnouncementPayload(payload);
    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: { ...data, updated_at: new Date() },
      include: { target_product: { select: { name: true } } },
    });
    return NextResponse.json({ announcement: serializeAnnouncement(announcement) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Oznámení se nepodařilo upravit.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.announcement.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin announcement DELETE error:', error);
    return NextResponse.json({ error: 'Oznámení se nepodařilo smazat.' }, { status: 400 });
  }
}
