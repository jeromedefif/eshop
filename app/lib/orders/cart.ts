import { Prisma, type PrismaClient } from '@prisma/client';
export function validCart(value: unknown): value is Record<string, number> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length <= 200 &&
    Object.entries(value).every(([key, quantity]) => /^[1-9]\d{0,17}-(?:\d+(?:\.\d+)?|maly|velky|baleni)$/.test(key) && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 10000);
}
export async function saveCart(db: PrismaClient, userId: string, revision: number, items: Record<string, number>) {
  if (revision === 0) {
    // Concurrent first saves race on the unique user_id; the loser must resolve
    // against the winning revision instead of silently overwriting it.
    try { return await db.customerCart.create({ data: { user_id: userId, revision: 1, items } }); }
    catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error; }
  }
  return db.$transaction(async tx => {
    const result = await tx.customerCart.updateMany({ where: { user_id: userId, revision }, data: { items, revision: { increment: 1 }, updated_at: new Date() } });
    if (result.count !== 1) return null;
    return tx.customerCart.findUniqueOrThrow({ where: { user_id: userId } });
  });
}
