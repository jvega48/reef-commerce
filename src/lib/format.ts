// Shared formatting helpers usable from both server and client code.

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Format a number / Prisma Decimal / numeric string as USD. */
export function formatMoney(value: number | string | { toString(): string }): string {
  return usd.format(Number(value));
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
