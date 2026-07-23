// One-shot integration test for the checkout finalization path.
// Run: npx tsx scripts/test-checkout.ts
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { finalizeOrder } from '../src/lib/checkout';

async function main() {
  const product = await prisma.product.findFirst({
    where: { status: 'ACTIVE', inventoryMode: 'STANDARD', quantity: { gte: 2 } },
  });
  const user = await prisma.user.findUnique({
    where: { email: 'vegajose4849@gmail.com' },
  });
  if (!product || !user) throw new Error('need seeded product + owner');

  const startQty = product.quantity;
  const startPoints = user.reefPoints;
  const unit = Number(product.price);
  const total = unit * 2 + 39.99;

  const order = await prisma.order.create({
    data: {
      email: user.email,
      user: { connect: { id: user.id } },
      status: 'PENDING',
      subtotal: unit * 2,
      shippingCost: 39.99,
      total,
      items: {
        create: [{
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: product.price,
          quantity: 2,
        }],
      },
    },
  });

  await finalizeOrder(order.id, 'pi_test_123');
  await finalizeOrder(order.id, 'pi_test_123'); // must be idempotent

  const [after, afterUser, afterProduct] = await Promise.all([
    prisma.order.findUnique({ where: { id: order.id } }),
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.product.findUnique({ where: { id: product.id } }),
  ]);

  const expectPoints = startPoints + Math.floor(total);
  console.log('status:', after?.status, after?.status === 'PAID' ? 'OK' : 'FAIL');
  console.log('paymentIntent:', after?.stripePaymentIntentId === 'pi_test_123' ? 'OK' : 'FAIL');
  console.log(
    `stock: ${startQty} -> ${afterProduct?.quantity}`,
    afterProduct?.quantity === startQty - 2 ? 'OK (idempotent)' : 'FAIL',
  );
  console.log(
    `points: ${startPoints} -> ${afterUser?.reefPoints} (expected ${expectPoints})`,
    afterUser?.reefPoints === expectPoints ? 'OK (idempotent)' : 'FAIL',
  );

  // Clean up test artifacts and restore state.
  await prisma.pointsTransaction.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.product.update({ where: { id: product.id }, data: { quantity: startQty } });
  await prisma.user.update({ where: { id: user.id }, data: { reefPoints: startPoints } });
  console.log('cleaned up');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
