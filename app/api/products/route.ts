import { requireAdmin } from '@/lib/auth/require-admin';
import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { PRODUCT_CATEGORIES, PRODUCT_COLOR_OPTIONS, PRODUCT_SWEETNESS_OPTIONS, normalizeProductCategory, supportsProductAttributes } from '@/lib/product-config';

function invalidate() {
  revalidateTag('public-products', { expire: 0 });
  revalidatePath('/produkty', 'layout');
  revalidatePath('/sitemap.xml');
}
function serialized(product: { id: bigint }) { return { ...product, id: product.id.toString() }; }
function validate(data: Record<string, unknown>) {
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 300) throw new Error('Vyplňte název produktu (nejvýše 300 znaků).');
  const category = normalizeProductCategory(String(data.category));
  if (!(PRODUCT_CATEGORIES as readonly string[]).includes(category)) throw new Error('Neplatná kategorie.');
  for (const key of ['in_stock', 'is_archived', 'is_new', 'is_featured']) if (typeof data[key] !== 'boolean') throw new Error('Neplatné přepínače produktu.');
  if (!Number.isSafeInteger(data.min_order_qty) || Number(data.min_order_qty) < 1 || Number(data.min_order_qty) > 10000 || !Number.isSafeInteger(data.sort_priority)) throw new Error('Neplatné množství nebo pořadí.');
  if (!Array.isArray(data.allowed_volumes) || data.allowed_volumes.length > 30 || data.allowed_volumes.some((v) => typeof v !== 'string' || !/^(?:\d+(?:\.\d+)?|maly|velky|baleni)$/.test(v) || (Number.isFinite(Number(v)) && Number(v) <= 0))) throw new Error('Neplatné objemy.');
  const attributes = supportsProductAttributes(category);
  for (const [key, options] of [['product_color', PRODUCT_COLOR_OPTIONS], ['sweetness', PRODUCT_SWEETNESS_OPTIONS]] as const) {
    if (attributes && data[key] != null && !options.some((o) => o.value === data[key])) throw new Error('Neplatné vlastnosti produktu.');
  }
  return { name: data.name.trim(), category, in_stock: data.in_stock as boolean,
    is_archived: data.is_archived as boolean, archived_at: data.is_archived ? new Date() : null,
    is_new: data.is_new as boolean, is_featured: data.is_featured as boolean,
    min_order_qty: Number(data.min_order_qty), sort_priority: Number(data.sort_priority), allowed_volumes: data.allowed_volumes as string[],
    product_color: attributes ? data.product_color as string | null : null, sweetness: attributes ? data.sweetness as string | null : null };
}
export async function GET(request: Request) {
  const archived = new URL(request.url).searchParams.get('includeArchived') === '1';
  if (archived && !(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const products = await prisma.product.findMany({ where: archived ? {} : { is_archived: false }, orderBy: [{ is_new: 'desc' }, { is_featured: 'desc' }, { sort_priority: 'desc' }, { name: 'asc' }] });
  return NextResponse.json(products.map(serialized));
}
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const input = await request.json();
    const data = validate({ in_stock: true, is_archived: false, is_new: false, is_featured: false, min_order_qty: 1, sort_priority: 0, allowed_volumes: [], product_color: null, sweetness: null, ...input });
    const product = await prisma.product.create({ data }); invalidate();
    return NextResponse.json(serialized(product));
  } catch (error) { return NextResponse.json({ error: error instanceof Error && !(error instanceof Prisma.PrismaClientKnownRequestError) ? error.message : 'Produkt se nepodařilo uložit.' }, { status: 400 }); }
}
export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const input = await request.json();
    if (!/^\d+$/.test(String(input.id))) return NextResponse.json({ error: 'Neplatné ID.' }, { status: 400 });
    const current = await prisma.product.findUnique({ where: { id: BigInt(input.id) } });
    if (!current) return NextResponse.json({ error: 'Produkt nenalezen.' }, { status: 404 });
    const product = await prisma.product.update({ where: { id: current.id }, data: validate({ ...current, ...input }) }); invalidate();
    return NextResponse.json(serialized(product));
  } catch (error) { return NextResponse.json({ error: error instanceof Error && !(error instanceof Prisma.PrismaClientKnownRequestError) ? error.message : 'Produkt se nepodařilo uložit.' }, { status: 400 }); }
}
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ error: 'Neplatné ID.' }, { status: 400 });
  try {
    try {
      await prisma.product.delete({ where: { id: BigInt(id) } }); invalidate();
      return NextResponse.json({ mode: 'deleted', message: 'Produkt byl smazán.' });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2003') throw error;
      await prisma.product.update({ where: { id: BigInt(id) }, data: { is_archived: true, in_stock: false, archived_at: new Date() } }); invalidate();
      return NextResponse.json({ mode: 'archived', message: 'Produkt je použit v objednávkách, byl proto archivován.' });
    }
  } catch { return NextResponse.json({ error: 'Produkt se nepodařilo odstranit.' }, { status: 400 }); }
}
