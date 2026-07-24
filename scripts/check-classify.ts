// Quick classifier probe for spot-checking specific product names.
import { classifyLivestock } from "../src/lib/classify";

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "Golden Interstellar mushrooms WYSWYG",
      "Golden Interstellar Mushroom",
      "Rainbow zoas",
      "Blastos",
      "Assorted zoa",
      "Yuma mushrooms",
      "Clownfishes",
      "Tangs",
    ];

for (const n of names) {
  const r = classifyLivestock(n, null);
  console.log(`${String(r.type ?? "—").padEnd(14)} ${n.padEnd(40)} <- ${r.reason}`);
}
process.exit(0);
