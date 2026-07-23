// Failure test: two PAID orders race for the same last-unit product.
// Exactly one may win the stock; the loser's order must be flagged, and
// quantity must never go negative. Run: npx tsx scripts/test-oversell.ts
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { finalizeOrder } from '../src/lib/checkout';

async function makePendingOrder(productId: string, email: string) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  return prisma.order.create({
    data: {
      email,
      status: 'PENDING',
      subtotal: product.price,
      total: product.price,
      items: {
        create: [{
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: product.price,
          quantity: 1,
        }],
      },
    },
  });
}

async function main() {
  const product = await prisma.product.findFirst({
    where: { status: 'ACTIVE', inventoryMode: 'STANDARD', quantity: { gte: 1 } },
  });
  if (!product) throw new Error('need an in-stock product');
  const startQty = product.quantity;

  // Squeeze stock down to exactly 1 for the race.
  await prisma.product.update({ where: { id: product.id }, data: { quantity: 1 } });

  const [a, b] = await Promise.all([
    makePendingOrder(product.id, 'race-a@test.local'),
    makePendingOrder(product.id, 'race-b@test.local'),
  ]);

  // Fire both finalizations concurrently — the actual race.
  await Promise.all([finalizeOrder(a.id), finalizeOrder(b.id)]);

  const [after, orderA, orderB] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { id: product.id } }),
    prisma.order.findUniqueOrThrow({ where: { id: a.id } }),
    prisma.order.findUniqueOrThrow({ where: { id: b.id } }),
  ]);

  const flagged = [orderA, orderB].filter((o) =>
    o.internalNotes?.includes('OVERSOLD'),
  ).length;

  console.log(`stock after race: ${after.quantity}`, after.quantity === 0 ? 'OK (not negative)' : 'FAIL');
  console.log(`orders flagged OVERSOLD: ${flagged}`, flagged === 1 ? 'OK (exactly one loser)' : 'FAIL');
  console.log('both orders PAID:', orderA.status === 'PAID' && orderB.status === 'PAID' ? 'OK' : 'FAIL');

  // Cleanup.
  await prisma.order.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  await prisma.product.update({ where: { id: product.id }, data: { quantity: startQty } });
  console.log('cleaned up');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
