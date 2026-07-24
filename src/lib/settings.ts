import { cache } from "react";
import { z } from "zod";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Store settings — every business rule the owner may change lives here, not
// in code. Defaults mirror the policies published on aquavida365.com
// (extracted 2026-07-23 — see docs/business-rules.md). A DB row in
// StoreSetting overrides its group's defaults field-by-field.
// ---------------------------------------------------------------------------

export const shippingSettingsSchema = z.object({
  freeShippingThreshold: z.number().min(0),
  overnightRate: z.number().min(0),
  inStateRate: z.number().min(0),
  homeState: z.string().length(2),
  maxBoxWeightLbs: z.number().min(1),
  shipDaysNote: z.string(),
  overnightLabel: z.string(),
  overnightDescription: z.string(),
  localPickupEnabled: z.boolean(),
  allowedStatesNote: z.string(),
});
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;

export const SHIPPING_DEFAULTS: ShippingSettings = {
  freeShippingThreshold: 350,
  overnightRate: 60,
  inStateRate: 40,
  homeState: "CA",
  maxBoxWeightLbs: 5,
  shipDaysNote: "Live orders ship Tuesday or Wednesday for overnight delivery",
  overnightLabel: "Overnight Shipping (UPS / FedEx)",
  overnightDescription:
    "Required for live corals, fish & inverts — insulated box with heat/cold packs",
  localPickupEnabled: true,
  allowedStatesNote:
    "We ship to the lower 48 states only. No shipping to Hawaii, Puerto Rico, or internationally.",
};

export const storeInfoSettingsSchema = z.object({
  phone: z.string(),
  hoursWeekday: z.string(),
  hoursWeekend: z.string(),
  instagram: z.string(),
  tiktok: z.string(),
  supportEmail: z.string(),
});
export type StoreInfoSettings = z.infer<typeof storeInfoSettingsSchema>;

export const STORE_INFO_DEFAULTS: StoreInfoSettings = {
  phone: "(310) 817-4113",
  hoursWeekday: "Monday–Friday, 1:00pm–6:00pm",
  hoursWeekend: "Weekends by appointment — text us",
  instagram: "aquavida365",
  tiktok: "aquavida365",
  supportEmail: "",
};

export const taxSettingsSchema = z.object({
  enabled: z.boolean(),
  ratePct: z.number().min(0).max(30),
  homeStateOnly: z.boolean(), // only tax orders shipping to the home state (nexus)
  taxShipping: z.boolean(),
  label: z.string(),
});
export type TaxSettings = z.infer<typeof taxSettingsSchema>;

// Livestock is untaxed in many states and AquaVida365 currently collects no
// sales tax — off by default, fully configurable when nexus requires it.
export const TAX_DEFAULTS: TaxSettings = {
  enabled: false,
  ratePct: 0,
  homeStateOnly: true,
  taxShipping: false,
  label: "Sales tax",
};

export const guaranteeSettingsSchema = z.object({
  guaranteeDays: z.number().min(0),
  reportWindowDays: z.number().min(0),
  doaVideoWindowHours: z.number().min(0),
  highValueVideoThreshold: z.number().min(0),
  cancellationFeePct: z.number().min(0).max(100),
  coralHoldDays: z.number().min(0),
  fishHoldBusinessDays: z.number().min(0),
});
export type GuaranteeSettings = z.infer<typeof guaranteeSettingsSchema>;

export const GUARANTEE_DEFAULTS: GuaranteeSettings = {
  guaranteeDays: 9,
  reportWindowDays: 3,
  doaVideoWindowHours: 2,
  highValueVideoThreshold: 150,
  cancellationFeePct: 20,
  coralHoldDays: 7,
  fishHoldBusinessDays: 5,
};

async function loadGroup<T extends object>(key: string, defaults: T): Promise<T> {
  const row = await prisma.storeSetting.findUnique({ where: { key } });
  if (!row || typeof row.value !== "object" || row.value === null) return defaults;
  return { ...defaults, ...(row.value as Partial<T>) };
}

// React cache() = one DB read per group per request, never stale across requests.
export const getShippingSettings = cache(() =>
  loadGroup("shipping", SHIPPING_DEFAULTS),
);
export const getStoreInfoSettings = cache(() =>
  loadGroup("storeInfo", STORE_INFO_DEFAULTS),
);
export const getGuaranteeSettings = cache(() =>
  loadGroup("guarantee", GUARANTEE_DEFAULTS),
);
export const getTaxSettings = cache(() => loadGroup("tax", TAX_DEFAULTS));

/** Sales tax on an order, honoring the nexus + shipping-taxable toggles. */
export function calcTax(
  cfg: TaxSettings,
  taxableBase: number,
  shippingCost: number,
  opts: { state?: string | null; homeState: string },
): number {
  if (!cfg.enabled || cfg.ratePct <= 0) return 0;
  if (
    cfg.homeStateOnly &&
    (opts.state ?? "").trim().toUpperCase() !== opts.homeState.toUpperCase()
  ) {
    return 0;
  }
  const base = taxableBase + (cfg.taxShipping ? shippingCost : 0);
  return Math.round(base * (cfg.ratePct / 100) * 100) / 100;
}

export async function saveSettingsGroup(key: string, value: object) {
  await prisma.storeSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
