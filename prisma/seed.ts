import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type {
  CareLevel,
  Intensity,
  LivestockType,
  ProductStatus,
} from '../src/generated/prisma/client';
import { classifyLivestock } from '../src/lib/classify';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Raw Shopify export types (seed-data/*.json pulled from aquavida365.com)
// ---------------------------------------------------------------------------

interface ShopifyImage {
  src: string;
  position: number;
  width?: number;
  height?: number;
}

interface ShopifyVariant {
  price: string;
  compare_at_price: string | null;
  available: boolean;
  grams: number;
  sku: string | null;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  vendor: string;
  tags: string[];
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  published_at: string | null;
  created_at: string;
}

interface ShopifyCollection {
  title: string;
  handle: string;
  body_html?: string | null;
  products_count: number;
}

const dataDir = join(__dirname, '..', 'seed-data');

// PowerShell wrote these with a UTF-8 BOM — strip it before parsing.
function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(dataDir, file), 'utf8').replace(/^﻿/, ''));
}

const products = readJson<ShopifyProduct[]>('products.json');
const collections = readJson<ShopifyCollection[]>('collections.json');
// { [collectionHandle]: productHandle[] }
const collectionProducts = readJson<Record<string, string[]>>('collection-products.json');

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

const CORAL_COLLECTIONS = new Set([
  'lps',
  'sps',
  'soft-corals-2026',
  'non-photosynthetic-coral',
  'wysiwyg',
]);
const INVERT_COLLECTIONS = new Set([
  'anemone',
  'crabs',
  'shrimp',
  'snail',
  'starfish',
  'sea-urchin',
  'seaslugs-nudibranch',
  'clam',
]);
const DRY_GOOD_COLLECTIONS = new Set(['accessories', 'equipment', 'food-additives']);
const MERCH_COLLECTIONS = new Set(['aquavida-merch']);

const KNOWN_COLORS = [
  'Rainbow', 'Gold', 'Green', 'Blue', 'Red', 'Orange',
  'Purple', 'Pink', 'Yellow', 'Teal', 'Black', 'White',
];

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function parseCareField(text: string, label: string): string | null {
  const m = text.match(new RegExp(`${label}\\s*:\\s*([^\\n]+)`, 'i'));
  return m ? m[1].trim() : null;
}

function toCareLevel(v: string | null): CareLevel | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes('beginner') || s.includes('easy')) return 'BEGINNER';
  if (s.includes('moderate') || s.includes('intermediate')) return 'INTERMEDIATE';
  if (s.includes('advanced') || s.includes('difficult')) return 'ADVANCED';
  if (s.includes('expert')) return 'EXPERT';
  return null;
}

function toIntensity(v: string | null): Intensity | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes('low')) return 'LOW';
  if (s.includes('med')) return 'MEDIUM';
  if (s.includes('high')) return 'HIGH';
  return null;
}

async function main() {
  console.log(`Seeding from ${products.length} Shopify products, ${collections.length} collections`);

  // Reverse map: product handle -> collection handles
  const productCollections = new Map<string, string[]>();
  for (const [colHandle, handles] of Object.entries(collectionProducts)) {
    for (const h of handles) {
      const list = productCollections.get(h) ?? [];
      list.push(colHandle);
      productCollections.set(h, list);
    }
  }

  // --- Owner account -------------------------------------------------------
  const passwordHash = await bcrypt.hash('AquaVida365!', 12);
  await prisma.user.upsert({
    where: { email: 'vegajose4849@gmail.com' },
    update: { role: 'OWNER' },
    create: {
      email: 'vegajose4849@gmail.com',
      name: 'Jose Vega',
      passwordHash,
      role: 'OWNER',
      emailVerified: new Date(),
    },
  });
  console.log('Owner account ready: vegajose4849@gmail.com / AquaVida365! (change in production)');

  // --- Categories ----------------------------------------------------------
  const categoryIdByHandle = new Map<string, string>();
  let sort = 0;
  for (const c of collections) {
    const cat = await prisma.category.upsert({
      where: { slug: c.handle },
      update: { name: c.title.trim() },
      create: {
        name: c.title.trim(),
        slug: c.handle,
        description: stripHtml(c.body_html ?? null) || null,
        sortOrder: sort++,
      },
    });
    categoryIdByHandle.set(c.handle, cat.id);
  }
  console.log(`Categories: ${categoryIdByHandle.size}`);

  // --- Products ------------------------------------------------------------
  let seq = 1;
  let created = 0;
  for (const p of products) {
    const cols = productCollections.get(p.handle) ?? [];
    const variant = p.variants[0];
    if (!variant) continue;

    let livestockType: LivestockType = 'FISH';
    if (cols.some((c) => CORAL_COLLECTIONS.has(c))) livestockType = 'CORAL';
    else if (cols.some((c) => INVERT_COLLECTIONS.has(c))) livestockType = 'INVERTEBRATE';
    else if (cols.some((c) => MERCH_COLLECTIONS.has(c))) livestockType = 'MERCH';
    else if (cols.some((c) => DRY_GOOD_COLLECTIONS.has(c))) livestockType = 'DRY_GOOD';
    else {
      // No collection — guess from tags/title
      const t = [...p.tags, p.title].join(' ').toLowerCase();
      if (/zoa|paly|acro|chalice|torch|hammer|frogspawn|scoly|acan|monti|favia|coral|anemone/.test(t)) {
        livestockType = 'CORAL';
      }
    }

    const isWysiwyg =
      cols.includes('wysiwyg') || p.tags.some((t) => t.toLowerCase() === 'wysiwyg');

    const text = stripHtml(p.body_html);
    const price = parseFloat(variant.price) || 0;
    const compareAt = variant.compare_at_price ? parseFloat(variant.compare_at_price) : null;
    const available = p.variants.some((v) => v.available);

    // Draft anything without a real price; otherwise active.
    const status: ProductStatus = price > 0 ? 'ACTIVE' : 'DRAFT';
    // Shopify's public API exposes availability, not counts — use sensible dev
    // quantities the admin can correct later.
    const quantity = available ? (isWysiwyg ? 1 : 5) : 0;

    // Extract scientific name when the title embeds it in parentheses,
    // e.g. "Flavoguttatus Anthias (Pseudanthias flavoguttatus)"
    const sciMatch = p.title.match(/\(([^)]+)\)\s*$/);
    const name = sciMatch ? p.title.replace(/\s*\([^)]+\)\s*$/, '').trim() : p.title.trim();
    const scientificName = sciMatch ? sciMatch[1].trim() : null;

    // Final authority: the shared classifier (the same one the image-integrity
    // test enforces). Its genus/keyword signal correctly distinguishes e.g.
    // tangs (Acanthurus → FISH) from corals, overriding the coarse
    // collection/keyword guess above so seeded data never contradicts it.
    const classified = classifyLivestock(name, scientificName);
    if (classified.type !== null) livestockType = classified.type;

    const colors = KNOWN_COLORS.filter((c) =>
      p.tags.some((t) => t.toLowerCase() === c.toLowerCase()),
    );
    const featured = p.tags.some((t) => /high end|holygrail|rare/i.test(t));

    const sku = variant.sku?.trim() || `AV-${String(seq).padStart(5, '0')}`;
    seq++;

    const product = await prisma.product.upsert({
      where: { shopifyId: BigInt(p.id) },
      update: {},
      create: {
        sku,
        name,
        slug: p.handle,
        scientificName,
        description: p.body_html,
        status,
        inventoryMode: isWysiwyg ? 'WYSIWYG' : 'STANDARD',
        livestockType,
        careLevel: toCareLevel(parseCareField(text, 'Care Level')),
        lighting: toIntensity(parseCareField(text, 'Lighting')),
        flow: toIntensity(parseCareField(text, 'Flow')),
        placement: parseCareField(text, 'Placement'),
        temperament: parseCareField(text, 'Temperament'),
        colors,
        price,
        compareAtPrice: compareAt,
        quantity,
        weightGrams: variant.grams ?? 0,
        vendor: p.vendor?.trim() || 'Aquavida365',
        tags: p.tags,
        featured,
        metaTitle: `${name} | AquaVida365`,
        metaDescription: text.slice(0, 155) || null,
        shopifyId: BigInt(p.id),
        shopifyHandle: p.handle,
        images: {
          // Assign dense 0-based positions ordered by Shopify's (1-based)
          // position. "Primary image" depends on position 0 existing, and the
          // image-integrity test enforces dense 0-based ordering.
          create: [...p.images]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((img, i) => ({
              url: img.src,
              alt: name,
              position: i,
              width: img.width,
              height: img.height,
            })),
        },
        categories: {
          create: cols
            .map((c) => categoryIdByHandle.get(c))
            .filter((id): id is string => Boolean(id))
            .map((categoryId) => ({ categoryId })),
        },
      },
    });
    if (product) created++;
  }
  console.log(`Products: ${created}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
