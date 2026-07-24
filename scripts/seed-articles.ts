// Seeds the Learning Center / Water Education / Knowledge Base articles.
// Idempotent: upserts by slug, so it's safe to re-run after edits.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type ArticleCategory } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type Seed = {
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  tags: string[];
  body: string;
};

const ARTICLES: Seed[] = [
  // ── Learning Center ───────────────────────────────────────────────────────
  {
    slug: "acclimation-guide",
    title: "The AquaVida365 Acclimation Guide",
    excerpt:
      "Your box just arrived — the next 60 minutes decide everything. Step-by-step drip acclimation for corals, fish, and inverts.",
    category: "LEARNING",
    tags: ["acclimation", "new arrivals", "beginner"],
    body: `
<p><strong>Film your unboxing first.</strong> Before you open a single bag, start recording — it protects your live-arrival guarantee and takes ten seconds.</p>
<h2>1. Temperature acclimation (15–20 min)</h2>
<p>Float the sealed bags in your sump or display with the lights off. Overnight boxes hold temperature well, but a 15-minute float evens out the last few degrees.</p>
<h2>2. Drip acclimation (30–45 min)</h2>
<ul>
<li>Empty each bag (animal + water) into a clean container.</li>
<li>Run airline tubing from the tank with a loose knot: 2–3 drips per second.</li>
<li>When the volume has tripled, discard half and repeat once.</li>
</ul>
<p><strong>Fish and inverts get the full drip.</strong> Shrimp, snails, and starfish are the most sensitive to salinity swings — never rush an invert.</p>
<h2>3. Corals are simpler</h2>
<p>After temperature acclimation, most corals can be dipped (see our coral dipping guide), inspected, and placed low in the tank in gentle flow. Skip the drip for most LPS/SPS — the dip matters more.</p>
<h2>4. Lights-out afternoon</h2>
<p>Keep lights off or at dawn levels for the rest of the day. New arrivals colored up within 3–7 days are the norm — shipping brown-out is temporary.</p>
<p><em>Never</em> dump bag water into your tank.</p>`,
  },
  {
    slug: "coral-dipping-101",
    title: "Coral Dipping 101: Keep Pests Out of Your Reef",
    excerpt:
      "Every frag that enters your system should get dipped — here's the exact process we use in-house before shipping.",
    category: "LEARNING",
    tags: ["corals", "pests", "quarantine"],
    body: `
<p>We dip and inspect every coral before it ships, but a second dip on arrival is cheap insurance for your reef. Flatworms, nudibranchs, and red bugs cost far more to remove later than to keep out today.</p>
<h2>What you need</h2>
<ul>
<li>A commercial coral dip (iodine- or plant-extract-based)</li>
<li>Two containers of clean tank water</li>
<li>A soft brush or turkey baster</li>
</ul>
<h2>The process</h2>
<ol>
<li>Mix the dip per label directions in container one.</li>
<li>Swirl the coral for the recommended time (usually 5–10 minutes), basting crevices.</li>
<li>Rinse in container two, gently shaking off residue.</li>
<li>Inspect the plug under bright light — pests hide on the underside.</li>
</ol>
<p><strong>When in doubt, cut the plug.</strong> Eggs (flatworm and nudibranch) resist most dips. Re-mounting a frag on a fresh plug removes the most common vector entirely.</p>
<p>Zoas, acans, and euphyllia tolerate dips well. <em>Skip dips for</em>: clams, anemones, and most soft leathers — inspect these manually instead.</p>`,
  },
  {
    slug: "beginner-corals",
    title: "10 Best Beginner Corals (That Still Look High-End)",
    excerpt:
      "Forgiving, fast-growing, and gorgeous — the corals we recommend to every first-time reefer.",
    category: "LEARNING",
    tags: ["corals", "beginner", "stocking"],
    body: `
<p>These species tolerate the parameter swings every new tank goes through, and they're all regulars in our shop:</p>
<ol>
<li><strong>Zoanthids</strong> — endless colors, fast colonies, tolerate almost anything.</li>
<li><strong>Green star polyps (GSP)</strong> — carpets a back wall; keep it isolated.</li>
<li><strong>Xenia</strong> — pulses hypnotically; can spread aggressively.</li>
<li><strong>Mushrooms (Discosoma, Rhodactis)</strong> — bulletproof, gorgeous bounce varieties.</li>
<li><strong>Toadstool leather</strong> — a statement piece that shrugs off mistakes.</li>
<li><strong>Kenya tree</strong> — waves in the flow, propagates itself.</li>
<li><strong>Duncan</strong> — LPS with personality; feeds greedily.</li>
<li><strong>Candy cane (Caulastrea)</strong> — classic LPS, splits into heads reliably.</li>
<li><strong>Blastomussa</strong> — our house favorite; low light, low flow, big color.</li>
<li><strong>Hammer coral</strong> — the gateway euphyllia. Give it space to sway.</li>
</ol>
<h2>Stocking order</h2>
<p>Softies first (month 2–3), LPS once alkalinity is stable (month 3–5), SPS when you can hold parameters for six straight weeks. Patience beats dosing.</p>`,
  },
  {
    slug: "feeding-corals",
    title: "Feeding Corals: When, What, and How Much",
    excerpt:
      "Light isn't the whole meal. Target feeding turns good corals into showpieces — here's our schedule.",
    category: "LEARNING",
    tags: ["corals", "feeding", "husbandry"],
    body: `
<p>Photosynthesis covers most of a coral's energy budget, but direct feeding accelerates growth and color — especially LPS.</p>
<h2>What to feed</h2>
<ul>
<li><strong>LPS (hammers, duncans, acans, blastos):</strong> meaty foods — mysis, brine, chopped shrimp/scallop, pellet blends. 2–3× a week.</li>
<li><strong>SPS:</strong> fine particulate/powdered foods and amino acids, broadcast at night. Light daily dosing beats weekly dumps.</li>
<li><strong>Softies &amp; zoas:</strong> mostly light + dissolved nutrients; occasional broadcast feeding.</li>
</ul>
<h2>How to target feed</h2>
<ol>
<li>Kill the return pump and powerheads (5–10 min).</li>
<li>Thaw food in tank water; baste it gently onto extended feeding tentacles.</li>
<li>Wait for retraction/ingestion, then restore flow.</li>
</ol>
<p><strong>Watch your nitrates.</strong> Feeding fuels growth <em>and</em> algae. Keep NO₃ in the 5–15 ppm range and feed what the corals actually take — not what floats away.</p>`,
  },
  {
    slug: "quarantine-basics",
    title: "Quarantine Basics: The 30 Days That Save Your Tank",
    excerpt:
      "A simple QT setup costs less than one ich outbreak. What we recommend for fish before they touch your display.",
    category: "LEARNING",
    tags: ["fish", "quarantine", "disease"],
    body: `
<p>Every fish we sell is eating and observed before shipping — but your display's safety deserves a quarantine period on your end too.</p>
<h2>The minimal QT</h2>
<ul>
<li>10–20 gallon tank, bare bottom</li>
<li>Sponge filter (seed it in your sump ahead of time)</li>
<li>Heater, PVC elbows for hiding, tight lid</li>
<li>Ammonia badge + test kits</li>
</ul>
<h2>The 30-day routine</h2>
<ol>
<li><strong>Week 1:</strong> observation only. Get the fish eating. Watch breathing rate, spots, scratching.</li>
<li><strong>Weeks 2–3:</strong> treat if symptoms appear (copper for ich/velvet — dose slowly to therapeutic level with a calibrated test).</li>
<li><strong>Week 4:</strong> clean bill of health, stable eating → transfer.</li>
</ol>
<p><strong>Don't medicate prophylactically without reason</strong> — copper is hard on some species (wrasses, anthias). Observation first, treatment when indicated.</p>
<p>Inverts and corals can carry fish parasites in the water, not on their bodies: a 72-hour fishless holding container breaks most lifecycles.</p>`,
  },
  // ── Water Education ───────────────────────────────────────────────────────
  {
    slug: "reef-parameters",
    title: "Reef Tank Parameters: The Numbers That Matter",
    excerpt:
      "Salinity, alk, calcium, magnesium, nitrate, phosphate — target ranges, why they matter, and how often to test.",
    category: "WATER_EDUCATION",
    tags: ["parameters", "testing", "chemistry"],
    body: `
<table>
<thead><tr><th>Parameter</th><th>Target</th><th>Test</th></tr></thead>
<tbody>
<tr><td>Salinity</td><td>1.025–1.026 SG (35 ppt)</td><td>Weekly</td></tr>
<tr><td>Temperature</td><td>77–79 °F, stable</td><td>Continuous</td></tr>
<tr><td>Alkalinity</td><td>8–9 dKH</td><td>2×/week (SPS: daily)</td></tr>
<tr><td>Calcium</td><td>420–450 ppm</td><td>Weekly</td></tr>
<tr><td>Magnesium</td><td>1300–1400 ppm</td><td>Bi-weekly</td></tr>
<tr><td>Nitrate</td><td>5–15 ppm</td><td>Weekly</td></tr>
<tr><td>Phosphate</td><td>0.03–0.1 ppm</td><td>Weekly</td></tr>
<tr><td>pH</td><td>7.9–8.4 (stability &gt; number)</td><td>Continuous if possible</td></tr>
</tbody>
</table>
<h2>The two rules behind the numbers</h2>
<p><strong>1. Stability beats perfection.</strong> An alk that sits at 7.8 dKH forever is healthier than one bouncing between 8 and 10. Corals adapt to values; they suffer from swings.</p>
<p><strong>2. Ratios matter.</strong> Alk, calcium, and magnesium are a system. If alk won't hold, check magnesium first — low Mg lets calcium and alk precipitate out together.</p>
<p>Log every test. Trends predict problems a week before symptoms show.</p>`,
  },
  {
    slug: "nitrogen-cycle",
    title: "The Nitrogen Cycle, Explained Properly",
    excerpt:
      "Ammonia → nitrite → nitrate. What 'cycling' actually means, how long it takes, and how to know you're truly done.",
    category: "WATER_EDUCATION",
    tags: ["cycling", "new tank", "beginner"],
    body: `
<p>Every gram of food that enters your tank exits as waste. The nitrogen cycle is the bacterial supply chain that detoxifies it.</p>
<h2>The chain</h2>
<ol>
<li><strong>Ammonia (NH₃)</strong> — from waste and decay. Toxic at any detectable level.</li>
<li><strong>Nitrite (NO₂)</strong> — produced by ammonia-oxidizing bacteria. Still toxic.</li>
<li><strong>Nitrate (NO₃)</strong> — the manageable end product, exported by water changes, algae, and corals.</li>
</ol>
<h2>Cycling a new tank</h2>
<ol>
<li>Add an ammonia source (bottled ammonium chloride to 2 ppm — not a live fish).</li>
<li>Seed bacteria (bottled starter or a cup of media from an established sump).</li>
<li>Test every other day. Ammonia falls first, then the nitrite spike fades.</li>
<li><strong>Done when:</strong> the tank clears 2 ppm ammonia → 0 ammonia, 0 nitrite in 24 hours.</li>
</ol>
<p>Typical timeline: 3–6 weeks. Live rock shortens it; sterile dry rock lengthens it.</p>
<p><strong>After the cycle:</strong> stock slowly — one or two fish at a time, two weeks apart. The bacterial colony sizes itself to the current waste load and needs time to catch up with each addition.</p>`,
  },
  {
    slug: "alkalinity-calcium-magnesium",
    title: "Alk, Calcium & Magnesium: The Big Three",
    excerpt:
      "How the reef's skeleton-building trio interacts, and how to choose between water changes, two-part, and kalk.",
    category: "WATER_EDUCATION",
    tags: ["chemistry", "dosing", "sps"],
    body: `
<p>Stony corals pull carbonate (alkalinity) and calcium from the water to build skeleton — roughly in lockstep. Magnesium is the referee that keeps the other two dissolved and available.</p>
<h2>Consumption math</h2>
<p>A lightly stocked LPS tank might burn 0.3 dKH/day; a packed SPS system can exceed 2 dKH/day. Measure your daily drop with dosers off — that number determines your method:</p>
<ul>
<li><strong>&lt; 0.5 dKH/day:</strong> weekly 10% water changes replenish everything. No dosing needed.</li>
<li><strong>0.5–1.5 dKH/day:</strong> two-part dosing (alk + calcium solutions on a doser, magnesium weekly by hand).</li>
<li><strong>&gt; 1.5 dKH/day:</strong> calcium reactor or heavy two-part with daily testing.</li>
</ul>
<h2>Rules of thumb</h2>
<ul>
<li>Never move alkalinity more than <strong>1 dKH per day</strong>.</li>
<li>Dose alk and calcium at different times/locations — they precipitate on contact.</li>
<li>If alk and calcium both keep sagging despite dosing, test magnesium — raise it to 1350 ppm and the problem usually resolves.</li>
</ul>`,
  },
  {
    slug: "salinity-and-topoff",
    title: "Salinity, Evaporation, and Why You Need an ATO",
    excerpt:
      "Salt doesn't evaporate — water does. Getting salinity rock-stable is the cheapest upgrade in reefing.",
    category: "WATER_EDUCATION",
    tags: ["salinity", "equipment", "stability"],
    body: `
<p>Every gallon that evaporates leaves its salt behind, quietly raising salinity until your next top-off crashes it back down. Livestock feels every one of those swings — inverts most of all.</p>
<h2>Get the measurement right</h2>
<ul>
<li>Use a <strong>refractometer or digital tester</strong>, calibrated monthly with 35 ppt fluid (not RO water).</li>
<li>Target <strong>1.025–1.026 SG</strong> and pick one number to hold.</li>
</ul>
<h2>Automate top-off</h2>
<p>An auto-top-off (ATO) unit replaces evaporation with fresh RO/DI water continuously, holding salinity flat around the clock. Sized reservoirs last 3–7 days. It's a $100 device that removes your single largest daily parameter swing.</p>
<h2>Mixing salt water</h2>
<ol>
<li>RO/DI water first, heater + powerhead in the mixing container.</li>
<li>Add salt gradually to ~35 ppt; mix until fully clear (2–24 h depending on brand).</li>
<li>Match temperature and salinity to the display <em>before</em> the water change.</li>
</ol>`,
  },
  {
    slug: "water-changes-done-right",
    title: "Water Changes Done Right",
    excerpt:
      "Ten percent weekly beats thirty percent monthly. The why and how of the reef's most underrated habit.",
    category: "WATER_EDUCATION",
    tags: ["maintenance", "nutrients", "beginner"],
    body: `
<p>A water change does three jobs at once: exports nutrients (nitrate/phosphate), replenishes trace elements, and dilutes anything accumulating that you can't test for.</p>
<h2>Small and often wins</h2>
<p>10–15% weekly keeps chemistry gliding. Big infrequent changes yank alkalinity, salinity, and temperature all at once — exactly the swings corals hate. If nitrates are high, do several 10% changes across a week rather than one 40% correction.</p>
<h2>Our routine</h2>
<ol>
<li>Mix salt water the day before; heat and aerate overnight.</li>
<li>Turn off return pump; siphon from the sand bed and rock crevices — the change doubles as detritus export.</li>
<li>Refill slowly, matched to 0.001 SG and ±1 °F.</li>
</ol>
<h2>When to break the rules</h2>
<p>Ammonia events, medication removal, or a dosing accident justify large emergency changes — match parameters carefully and change as much as needed. Stability rules apply to routine, not emergencies.</p>`,
  },
  // ── Knowledge Base ────────────────────────────────────────────────────────
  {
    slug: "how-to-file-doa-claim",
    title: "How to File a DOA / Live-Arrival Claim",
    excerpt:
      "Exactly what we need (video, timing, photos) and what happens next. Claims are simple if you film your unboxing.",
    category: "KNOWLEDGE_BASE",
    tags: ["claims", "guarantee", "orders"],
    body: `
<p>We stand behind every animal we ship. Here's how the claim process works — the requirements exist so we can make it right fast.</p>
<h2>Within 2 hours of delivery</h2>
<ul>
<li>Record a clear video of the <strong>unopened bag</strong> showing the deceased animal.</li>
<li>Record all six sides of the shipping box.</li>
<li>Do <strong>not</strong> remove corals from plugs, discard anything, or refuse a damaged box.</li>
</ul>
<h2>Filing</h2>
<ol>
<li>Open a ticket from <strong>Account → Support → “DOA / live-arrival claim”</strong> (or the contact page if you checked out as a guest).</li>
<li>Attach or link your videos, include your order number.</li>
<li>High-value specimens (over $150) also need a 15-second out-of-water video.</li>
</ol>
<h2>What happens next</h2>
<p>We review within one business day and resolve with a <strong>replacement or store credit</strong>. Shipping costs are non-refundable, and replacement shipping is the customer's. The 9-day guarantee also covers post-arrival losses when reported within the first 3 days — see the full guarantee page for conditions.</p>`,
  },
  {
    slug: "shipping-faq",
    title: "Shipping FAQ: Ship Days, Cutoffs, and Delivery",
    excerpt:
      "When your order ships, why livestock only travels Tuesday/Wednesday, and what to do on delivery day.",
    category: "KNOWLEDGE_BASE",
    tags: ["shipping", "orders"],
    body: `
<h2>When will my order ship?</h2>
<p>Live orders ship <strong>Tuesday or Wednesday</strong> for overnight delivery — this keeps animals out of carrier depots over the weekend. Orders placed after the weekly cutoff ship the following week. We'll email tracking the moment your label prints.</p>
<h2>Can you hold my order?</h2>
<p>Corals hold up to <strong>1 week</strong>; fish up to <strong>5 business days</strong>. Note your preferred delivery date at checkout or in a support ticket.</p>
<h2>Delivery day</h2>
<ul>
<li><strong>Someone must be present.</strong> A box on a hot porch voids the guarantee window fast.</li>
<li>Film the unboxing (2-hour claim window).</li>
<li>Acclimate immediately — see the Acclimation Guide.</li>
</ul>
<h2>Where do you ship?</h2>
<p>The lower 48 states. No Hawaii, Puerto Rico, or international. Alaska only via customer-arranged UPS/FedEx pickup. Monday/Friday shipments (by special request) carry no DOA coverage.</p>
<h2>Rates</h2>
<p>Flat overnight rate (free over the free-shipping threshold), reduced rate within California, free local pickup. Current rates always show at checkout.</p>`,
  },
  {
    slug: "order-tracking-help",
    title: "Tracking Your Order & Understanding Statuses",
    excerpt:
      "What Paid → Packing → Ready to Ship → Shipped actually mean, and where to find your tracking number.",
    category: "KNOWLEDGE_BASE",
    tags: ["orders", "tracking"],
    body: `
<p>Track every order from <strong>Account → Orders</strong>. Each order page shows a live progress bar, tracking numbers, and a full history timeline.</p>
<h2>Status glossary</h2>
<ul>
<li><strong>Pending payment</strong> — checkout started but payment hasn't completed.</li>
<li><strong>Paid</strong> — payment confirmed; your animals are reserved.</li>
<li><strong>Being packed</strong> — pull day: bagging, oxygen, insulation, heat/cold packs.</li>
<li><strong>Ready to ship</strong> — boxed and awaiting carrier pickup (usually same day).</li>
<li><strong>Shipped</strong> — in the carrier's overnight network; tracking emailed.</li>
<li><strong>Delivered</strong> — start your acclimation! Claim window: 2 hours.</li>
</ul>
<h2>No tracking email?</h2>
<p>Check spam, then your account's order page — the tracking number appears there in real time. Still nothing? Open a support ticket and we'll chase it.</p>`,
  },
];

async function main() {
  for (const a of ARTICLES) {
    const readMinutes = Math.max(
      1,
      Math.round(a.body.replace(/<[^>]+>/g, " ").split(/\s+/).length / 200),
    );
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: { ...a, readMinutes },
      create: { ...a, readMinutes },
    });
    console.log(`  ✓ ${a.slug}`);
  }
  console.log(`Seeded ${ARTICLES.length} articles.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
