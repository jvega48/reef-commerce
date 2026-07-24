import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteAddress, makeDefaultAddress, saveAddress } from "@/lib/account-actions";

export const metadata = { title: "Saved Addresses" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { edit, error } = await searchParams;

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });
  const editing = edit ? addresses.find((a) => a.id === edit) : undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold">Saved Addresses</h1>
      <p className="mt-1 text-sm text-slate-400">
        Your default address pre-fills at checkout.
      </p>

      {error === "missing" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Please fill in all required fields.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* List */}
        <div className="space-y-3">
          {addresses.length === 0 && (
            <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-8 text-center text-sm text-slate-400">
              No saved addresses yet — add your first one. →
            </div>
          )}
          {addresses.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl border p-5 text-sm ${
                a.isDefault
                  ? "border-reef-500/50 bg-reef-500/5"
                  : "border-abyss-700/60 bg-abyss-900"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <address className="not-italic leading-relaxed text-slate-300">
                  <span className="font-semibold text-slate-200">{a.name}</span>
                  {a.isDefault && (
                    <span className="ml-2 rounded-full bg-reef-500/20 px-2 py-0.5 text-[11px] font-bold text-reef-300">
                      DEFAULT
                    </span>
                  )}
                  <br />
                  {a.line1}<br />
                  {a.line2 && <>{a.line2}<br /></>}
                  {a.city}, {a.state} {a.postalCode}
                  {a.phone && <><br />{a.phone}</>}
                </address>
              </div>
              <div className="mt-3 flex gap-3 text-xs">
                <Link
                  href={`/account/addresses?edit=${a.id}`}
                  className="text-reef-400 hover:text-reef-300"
                >
                  Edit
                </Link>
                {!a.isDefault && (
                  <form action={makeDefaultAddress}>
                    <input type="hidden" name="addressId" value={a.id} />
                    <button className="text-slate-400 hover:text-reef-300">Make default</button>
                  </form>
                )}
                <form action={deleteAddress}>
                  <input type="hidden" name="addressId" value={a.id} />
                  <button className="text-slate-400 hover:text-coral-300">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>

        {/* Add / edit form */}
        <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">
              {editing ? "Edit Address" : "Add Address"}
            </h2>
            {editing && (
              <Link href="/account/addresses" className="text-xs text-slate-400 hover:text-reef-300">
                Cancel edit
              </Link>
            )}
          </div>
          <form action={saveAddress} className="grid gap-3 sm:grid-cols-2">
            {editing && <input type="hidden" name="addressId" value={editing.id} />}
            <div className="sm:col-span-2">
              <label className={label} htmlFor="addr-name">Full name *</label>
              <input id="addr-name" name="name" required defaultValue={editing?.name} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="addr-line1">Street address *</label>
              <input id="addr-line1" name="line1" required defaultValue={editing?.line1} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="addr-line2">Apt / suite</label>
              <input id="addr-line2" name="line2" defaultValue={editing?.line2 ?? ""} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="addr-city">City *</label>
              <input id="addr-city" name="city" required defaultValue={editing?.city} className={input} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="addr-state">State *</label>
                <input id="addr-state" name="state" required maxLength={2} placeholder="CA"
                  defaultValue={editing?.state} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="addr-zip">ZIP *</label>
                <input id="addr-zip" name="postalCode" required defaultValue={editing?.postalCode} className={input} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="addr-phone">Phone (delivery updates)</label>
              <input id="addr-phone" name="phone" type="tel" defaultValue={editing?.phone ?? ""} className={input} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={editing?.isDefault ?? addresses.length === 0}
                className="h-4 w-4 accent-[#14b5c8]"
              />
              Set as default address
            </label>
            <div className="sm:col-span-2">
              <button className="w-full rounded-full bg-reef-500 py-2.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
                {editing ? "Save Changes" : "Add Address"}
              </button>
            </div>
          </form>
          <p className="mt-3 text-xs text-slate-500">
            We ship to the lower 48 states only — no Hawaii, Puerto Rico, or international.
          </p>
        </div>
      </div>
    </div>
  );
}
