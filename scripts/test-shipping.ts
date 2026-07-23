// Shipping math must match the published policy (docs/business-rules.md):
// $60 overnight up to 5 lbs, $40 in CA, free at $350+, pickup free.
import { calcShipping } from "../src/lib/checkout";
import { SHIPPING_DEFAULTS } from "../src/lib/settings";

let failed = false;
function check(name: string, actual: number, expected: number) {
  const ok = actual === expected;
  if (!ok) failed = true;
  console.log(`${name}: ${actual} ${ok ? "OK" : `FAIL (expected ${expected})`}`);
}

const cfg = SHIPPING_DEFAULTS;

check("out-of-state base rate", calcShipping(cfg, "overnight", 100, "TX"), 60);
check("in-state rate", calcShipping(cfg, "overnight", 100, "CA"), 40);
check("in-state lowercase", calcShipping(cfg, "overnight", 100, "ca"), 40);
check("no state falls back to base", calcShipping(cfg, "overnight", 100, null), 60);
check("free at threshold", calcShipping(cfg, "overnight", 350, "TX"), 0);
check("free above threshold", calcShipping(cfg, "overnight", 500.01, "CA"), 0);
check("paid just under threshold", calcShipping(cfg, "overnight", 349.99, "TX"), 60);
check("pickup always free", calcShipping(cfg, "pickup", 20, "TX"), 0);

if (failed) {
  console.error("shipping tests FAILED");
  process.exit(1);
}
console.log("all shipping tests passed");
