import ImageDropzone from "./ImageDropzone";
import type { Category, Product } from "@/generated/prisma/client";

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

function Field({ children, title, span }: { children: React.ReactNode; title: string; span?: number }) {
  return (
    <div style={span ? { gridColumn: `span ${span} / span ${span}` } : undefined}>
      <label className={label}>{title}</label>
      {children}
    </div>
  );
}

export default function ProductForm({
  action,
  product,
  categories,
  selectedCategoryIds = [],
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  product?: Product | null;
  categories: Category[];
  selectedCategoryIds?: string[];
  submitLabel: string;
}) {
  const p = product;
  return (
    <form action={action} className="space-y-8">
      {p && <input type="hidden" name="productId" value={p.id} />}

      {/* Basics */}
      <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="mb-4 font-semibold text-slate-200">Basics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field title="Name *" span={2}>
            <input name="name" required defaultValue={p?.name ?? ""} placeholder="Gold Torch Coral" className={input} />
          </Field>
          <Field title="Scientific Name">
            <input name="scientificName" defaultValue={p?.scientificName ?? ""} placeholder="Euphyllia glabrescens" className={input} />
          </Field>
          <Field title="SKU (auto-generated if blank)">
            <input name="sku" defaultValue={p?.sku ?? ""} placeholder="AV-00718" className={input} disabled={!!p} />
          </Field>
          <Field title="Type">
            <select name="livestockType" defaultValue={p?.livestockType ?? "CORAL"} className={input}>
              <option value="CORAL">Coral</option>
              <option value="FISH">Fish</option>
              <option value="INVERTEBRATE">Invertebrate</option>
              <option value="DRY_GOOD">Dry Good</option>
              <option value="MERCH">Merch</option>
            </select>
          </Field>
          <Field title="Status">
            <select name="status" defaultValue={p?.status ?? "DRAFT"} className={input}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="SOLD">Sold</option>
            </select>
          </Field>
          <Field title="Description" span={2}>
            <textarea
              name="description"
              rows={4}
              defaultValue={p?.description ?? ""}
              placeholder="Care notes, colors, provenance…"
              className={input}
            />
          </Field>
        </div>
      </section>

      {/* Inventory & pricing */}
      <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="mb-4 font-semibold text-slate-200">Inventory &amp; Pricing</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field title="Inventory Mode">
            <select name="inventoryMode" defaultValue={p?.inventoryMode ?? "STANDARD"} className={input}>
              <option value="STANDARD">Standard — quantity tracked</option>
              <option value="WYSIWYG">WYSIWYG — this exact specimen</option>
            </select>
          </Field>
          <Field title="Quantity">
            <input type="number" name="quantity" min={0} defaultValue={p?.quantity ?? 1} className={input} />
          </Field>
          <Field title="Low Stock Alert At">
            <input type="number" name="lowStockThreshold" min={0} defaultValue={p?.lowStockThreshold ?? 2} className={input} />
          </Field>
          <Field title="Price ($) *">
            <input type="number" name="price" step="0.01" min={0} required defaultValue={p ? Number(p.price) : ""} className={input} />
          </Field>
          <Field title="Compare-at Price ($)">
            <input type="number" name="compareAtPrice" step="0.01" min={0} defaultValue={p?.compareAtPrice ? Number(p.compareAtPrice) : ""} className={input} />
          </Field>
          <Field title="Cost ($, for margins)">
            <input type="number" name="cost" step="0.01" min={0} defaultValue={p?.cost ? Number(p.cost) : ""} className={input} />
          </Field>
          <Field title="Weight (grams)">
            <input type="number" name="weightGrams" min={0} defaultValue={p?.weightGrams ?? 0} className={input} />
          </Field>
          <Field title="Vendor">
            <input name="vendor" defaultValue={p?.vendor ?? "Aquavida365"} className={input} />
          </Field>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} className="h-4 w-4 accent-[#14b5c8]" />
              Featured (High-End &amp; Rare)
            </label>
          </div>
        </div>
      </section>

      {/* Care profile */}
      <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="mb-4 font-semibold text-slate-200">Care Profile</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field title="Care Level">
            <select name="careLevel" defaultValue={p?.careLevel ?? ""} className={input}>
              <option value="">—</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>
          </Field>
          <Field title="Lighting">
            <select name="lighting" defaultValue={p?.lighting ?? ""} className={input}>
              <option value="">—</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </Field>
          <Field title="Flow">
            <select name="flow" defaultValue={p?.flow ?? ""} className={input}>
              <option value="">—</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </Field>
          <Field title="Placement">
            <input name="placement" defaultValue={p?.placement ?? ""} placeholder="High / Rockwork / Sand bed" className={input} />
          </Field>
          <Field title="Temperament">
            <input name="temperament" defaultValue={p?.temperament ?? ""} placeholder="Peaceful / Semi-aggressive" className={input} />
          </Field>
          <Field title="Specimen Size (WYSIWYG)">
            <input name="specimenSize" defaultValue={p?.specimenSize ?? ""} placeholder='1.5" frag, 6 heads' className={input} />
          </Field>
          <Field title="Growth Form">
            <input name="growthForm" defaultValue={p?.growthForm ?? ""} placeholder="Branching / Encrusting / Plating" className={input} />
          </Field>
          <Field title="Colors (comma-separated)">
            <input name="colors" defaultValue={p?.colors.join(", ") ?? ""} placeholder="Gold, Green, Rainbow" className={input} />
          </Field>
          <Field title="Tags (comma-separated)">
            <input name="tags" defaultValue={p?.tags.join(", ") ?? ""} placeholder="Rare, High end, Torch" className={input} />
          </Field>
        </div>
      </section>

      {/* Categories */}
      <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="mb-4 font-semibold text-slate-200">Categories</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-abyss-800">
              <input
                type="checkbox"
                name="categoryIds"
                value={c.id}
                defaultChecked={selectedCategoryIds.includes(c.id)}
                className="h-4 w-4 accent-[#14b5c8]"
              />
              {c.name}
            </label>
          ))}
        </div>
      </section>

      {/* Images */}
      <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="mb-4 font-semibold text-slate-200">
          {p ? "Add More Photos / Videos" : "Photos / Videos"}
        </h2>
        <ImageDropzone />
      </section>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          className="rounded-full bg-coral-500 px-8 py-3 font-semibold text-white shadow-lg shadow-coral-500/25 transition hover:bg-coral-600"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
