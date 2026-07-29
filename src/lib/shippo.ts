// ---------------------------------------------------------------------------
// Shippo REST client — thin fetch wrapper over api.goshippo.com, mirroring the
// dependency-free approach used for Resend in email.ts. One SHIPPO_API_KEY
// selects test vs live mode automatically (shippo_test_* vs shippo_live_*);
// the endpoints are identical either way.
//
// Docs: https://docs.goshippo.com/shippoapi/public-api/
// ---------------------------------------------------------------------------

const BASE = "https://api.goshippo.com";

export function shippoConfigured(): boolean {
  return Boolean(process.env.SHIPPO_API_KEY);
}

/** True when the configured key is a test/sandbox token. */
export function shippoTestMode(): boolean {
  return (process.env.SHIPPO_API_KEY ?? "").includes("_test_");
}

export class ShippoError extends Error {
  status: number;
  detail: unknown;
  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ShippoError";
    this.status = status;
    this.detail = detail;
  }
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const key = process.env.SHIPPO_API_KEY;
  if (!key) throw new ShippoError("SHIPPO_API_KEY is not set", 0);

  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `ShippoToken ${key}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    // Shippo is a side-effecting external call; never cache.
    cache: "no-store",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail =
      (data as { detail?: string })?.detail ??
      (data as { messages?: unknown })?.messages ??
      text;
    throw new ShippoError(
      `Shippo ${init.method ?? "GET"} ${path} → ${res.status}`,
      res.status,
      detail,
    );
  }
  return data as T;
}

// ── Types (only the fields we consume) ─────────────────────────────────────

export type ShippoAddress = {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
};

export type ShippoParcel = {
  length: string;
  width: string;
  height: string;
  distance_unit: "in" | "cm";
  weight: string;
  mass_unit: "oz" | "lb" | "g" | "kg";
};

export type ShippoRate = {
  object_id: string;
  amount: string; // e.g. "68.45"
  currency: string;
  provider: string; // "FedEx"
  servicelevel: { token: string; name: string };
  estimated_days?: number;
  duration_terms?: string;
};

export type ShippoShipment = {
  object_id: string;
  status: string;
  rates: ShippoRate[];
};

export type ShippoTransaction = {
  object_id: string;
  status: string; // "SUCCESS" | "ERROR" | "QUEUED"
  tracking_number?: string;
  tracking_url_provider?: string;
  label_url?: string;
  eta?: string;
  rate?: string;
  messages?: { text: string }[];
};

export type ShippoAddressValidation = {
  object_id: string;
  is_complete: boolean;
  validation_results?: {
    is_valid: boolean;
    messages?: { text: string; code?: string }[];
  };
};

export type ShippoCarrierAccount = {
  object_id: string;
  carrier: string;
  account_id: string;
  active: boolean;
};

// ── Operations ─────────────────────────────────────────────────────────────

/** Create a shipment and return live rates (synchronous). */
export function createShipment(input: {
  addressFrom: ShippoAddress;
  addressTo: ShippoAddress;
  parcels: ShippoParcel[];
}): Promise<ShippoShipment> {
  return call<ShippoShipment>("/shipments/", {
    method: "POST",
    body: {
      address_from: input.addressFrom,
      address_to: input.addressTo,
      parcels: input.parcels,
      async: false,
    },
  });
}

/** Buy a label from a chosen rate. Synchronous — returns the final label. */
export function buyLabel(
  rateObjectId: string,
  opts: { labelFileType?: "PDF" | "PDF_4x6" | "ZPLII" } = {},
): Promise<ShippoTransaction> {
  return call<ShippoTransaction>("/transactions/", {
    method: "POST",
    body: {
      rate: rateObjectId,
      label_file_type: opts.labelFileType ?? "PDF_4x6",
      async: false,
    },
  });
}

/** Refund/void a purchased label (allowed while unused, within carrier window). */
export function refundLabel(transactionObjectId: string): Promise<{
  object_id: string;
  status: string;
}> {
  return call("/refunds/", {
    method: "POST",
    body: { transaction: transactionObjectId },
  });
}

/** Validate a US address. Returns validity + any correction messages. */
export function validateAddress(
  address: ShippoAddress,
): Promise<ShippoAddressValidation> {
  return call<ShippoAddressValidation>("/addresses/", {
    method: "POST",
    body: { ...address, validate: true },
  });
}

/** Current tracking status for a shipment (carrier + tracking number). */
export function getTracking(
  carrier: string,
  trackingNumber: string,
): Promise<{
  tracking_status?: { status: string; status_details?: string };
  eta?: string;
}> {
  return call(
    `/tracks/${encodeURIComponent(carrier.toLowerCase())}/${encodeURIComponent(trackingNumber)}`,
  );
}

/** Register a tracking number so Shippo POSTs track_updated webhooks for it. */
export function registerTracking(
  carrier: string,
  trackingNumber: string,
): Promise<unknown> {
  return call("/tracks/", {
    method: "POST",
    body: { carrier: carrier.toLowerCase(), tracking_number: trackingNumber },
  });
}

/** List connected carrier accounts (UPS/FedEx/USPS…). */
export async function listCarrierAccounts(): Promise<ShippoCarrierAccount[]> {
  const res = await call<{ results: ShippoCarrierAccount[] }>(
    "/carrier_accounts/",
  );
  return res.results ?? [];
}

/**
 * Pick the best rate for the configured service, falling back to the cheapest
 * overnight-ish rate, then the cheapest rate overall. Returns null if none.
 */
export function selectRate(
  rates: ShippoRate[],
  preferredServiceToken: string,
): ShippoRate | null {
  if (rates.length === 0) return null;
  const byToken = rates.find(
    (r) => r.servicelevel.token === preferredServiceToken,
  );
  if (byToken) return byToken;
  // Prefer next-day/overnight services when the exact token isn't offered.
  const overnight = rates
    .filter((r) => (r.estimated_days ?? 99) <= 1)
    .sort((a, b) => Number(a.amount) - Number(b.amount));
  if (overnight.length > 0) return overnight[0];
  return [...rates].sort((a, b) => Number(a.amount) - Number(b.amount))[0];
}
