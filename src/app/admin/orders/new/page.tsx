import Link from "next/link";
import { createManualOrder } from "@/lib/order-actions";
import OrderBuilder from "@/components/admin/OrderBuilder";

export const metadata = { title: "Create Order — Admin" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sku?: string }>;
}) {
  const { error, sku } = await searchParams;

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Order</h1>
          <p className="mt-1 text-sm text-slate-400">
            For phone orders, local pickup, or manual invoices. Stock is deducted automatically.
          </p>
        </div>
        <Link href="/admin/orders" className="text-sm text-slate-400 hover:text-reef-300">
          ← Back to orders
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          {error === "items" && "Add at least one product to the order."}
          {error === "email" && "A customer email is required."}
          {error === "stock" && `Not enough stock for ${sku ?? "an item"} — adjust the quantity.`}
        </p>
      )}

      <form action={createManualOrder} className="space-y-8">
        {/* Items */}
        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <h2 className="mb-4 font-semibold text-slate-200">Items</h2>
          <OrderBuilder />
        </section>

        {/* Customer */}
        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <h2 className="mb-4 font-semibold text-slate-200">Customer</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={label}>Email *</label>
              <input type="email" name="email" required placeholder="customer@email.com" className={input} />
              <p className="mt-1 text-xs text-slate-500">
                Linked to their account automatically if one exists.
              </p>
            </div>
            <div>
              <label className={label}>Order Status</label>
              <select name="status" defaultValue="PROCESSING" className={input}>
                <option value="PENDING">Pending (awaiting payment)</option>
                <option value="PAID">Paid</option>
                <option value="PROCESSING">Processing</option>
              </select>
            </div>
          </div>
        </section>

        {/* Shipping address */}
        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <h2 className="mb-1 font-semibold text-slate-200">Shipping Address</h2>
          <p className="mb-4 text-xs text-slate-500">Leave blank for local pickup.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={label}>Recipient Name</label>
              <input name="shipName" className={input} />
            </div>
            <div>
              <label className={label}>Address Line 1</label>
              <input name="line1" className={input} />
            </div>
            <div>
              <label className={label}>Address Line 2</label>
              <input name="line2" className={input} />
            </div>
            <div>
              <label className={label}>City</label>
              <input name="city" className={input} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>State</label>
                <input name="state" className={input} />
              </div>
              <div>
                <label className={label}>ZIP</label>
                <input name="postalCode" className={input} />
              </div>
            </div>
            <div>
              <label className={label}>Phone</label>
              <input name="phone" className={input} />
            </div>
          </div>
        </section>

        {/* Charges */}
        <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <h2 className="mb-4 font-semibold text-slate-200">Charges</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={label}>Shipping ($)</label>
              <input type="number" name="shippingCost" step="0.01" min={0} defaultValue={0} className={input} />
            </div>
            <div>
              <label className={label}>Discount ($)</label>
              <input type="number" name="discount" step="0.01" min={0} defaultValue={0} className={input} />
            </div>
            <div>
              <label className={label}>Tax ($)</label>
              <input type="number" name="tax" step="0.01" min={0} defaultValue={0} className={input} />
            </div>
          </div>
          <div className="mt-4">
            <label className={label}>Internal Notes</label>
            <textarea name="internalNotes" rows={2} placeholder="Only visible to staff" className={input} />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-coral-500 px-8 py-3 font-semibold text-white shadow-lg shadow-coral-500/25 transition hover:bg-coral-600"
          >
            Create Order
          </button>
        </div>
      </form>
    </div>
  );
}
