// ---------------------------------------------------------------------------
// Livestock classifier.
//
// The Shopify import inferred `livestockType` from collection handles and
// defaulted to CORAL when it couldn't tell — which mislabeled hundreds of fish
// (tangs, clownfish, angels…) as corals, so they surfaced under coral browsing.
// This classifier decides the type from the strongest available signal:
// scientific-name genus first, then common-name keywords.
//
// Used by scripts/fix-livestock-types.ts and the admin "re-classify" tool.
// ---------------------------------------------------------------------------

export type Livestock = "CORAL" | "FISH" | "INVERTEBRATE" | "DRY_GOOD" | "MERCH";

// Genus → type. Matched against the first word of scientificName, and also
// searched inside the product name (many listings embed the binomial).
const GENUS: Record<string, Livestock> = {};
const addGenera = (type: Livestock, names: string[]) => {
  for (const n of names) GENUS[n.toLowerCase()] = type;
};

addGenera("FISH", [
  // Tangs / surgeonfish
  "acanthurus", "zebrasoma", "paracanthurus", "naso", "ctenochaetus", "prionurus",
  // Clownfish & damsels ("amphipron" is a recurring misspelling in the catalog)
  "amphiprion", "amphipron", "premnas", "chromis", "chrysiptera", "dascyllus",
  "pomacentrus", "stegastes", "neoglyphidodon",
  // Angelfish
  "pomacanthus", "centropyge", "genicanthus", "holacanthus", "apolemichthys",
  "chaetodontoplus", "pygoplites", "paracentropyge",
  // Butterflyfish
  "chaetodon", "forcipiger", "heniochus", "hemitaurichthys", "chelmon",
  // Wrasses
  "cirrhilabrus", "halichoeres", "macropharyngodon", "paracheilinus", "bodianus",
  "labroides", "coris", "thalassoma", "anampses", "pseudocheilinus", "wetmorella",
  "novaculichthys", "choerodon", "oxycheilinus",
  // Gobies & dartfish
  "gobiodon", "amblygobius", "valenciennea", "cryptocentrus", "stonogobiops",
  "elacatinus", "nemateleotris", "ptereleotris", "trimma", "eviota", "signigobius",
  "koumansetta", "gobiosoma",
  // Blennies
  "meiacanthus", "ecsenius", "salarias", "atrosalarias", "blenniella", "cirripectes",
  "exallias", "petroscirtes",
  // Anthias & basslets
  "pseudanthias", "serranocirrhitus", "nemanthias", "gramma", "liopropoma",
  "pseudochromis", "assessor", "serranus", "hypoplectrus",
  // Cardinalfish
  "pterapogon", "sphaeramia", "apogon", "ostorhinchus", "zoramia",
  // Hawkfish
  "oxycirrhites", "neocirrhites", "cirrhitichthys", "paracirrhites", "amblycirrhitus",
  // Jawfish
  "opistognathus",
  // Rabbitfish / foxface
  "siganus",
  // Triggers, puffers, boxfish, filefish
  "balistoides", "rhinecanthus", "odonus", "melichthys", "xanthichthys", "sufflamen",
  "arothron", "canthigaster", "diodon", "ostracion", "lactoria", "oxymonacanthus",
  "pervagor", "acreichthys", "chaetodermis",
  // Lionfish & scorpionfish
  "pterois", "dendrochirus", "rhinopias", "scorpaenopsis", "taenianotus",
  // Groupers, hamlets, hogfish, parrotfish
  "cephalopholis", "epinephelus", "variola", "scarus", "chlorurus",
  // Eels
  "gymnothorax", "echidna", "rhinomuraena", "muraena",
  // Seahorses & pipefish
  "hippocampus", "doryrhamphus", "corythoichthys", "syngnathus",
  // Batfish, tilefish, sharks & rays, misc
  "platax", "hoplolatilus", "malacanthus", "chiloscyllium",
  "taeniura", "neotrygon", "sphyraena", "zanclus", "monodactylus", "plectorhinchus",
  "calloplesiops", "grammistes", "diploprion", "pseudobalistes",
]);

addGenera("CORAL", [
  // LPS
  "euphyllia", "fimbriaphyllia", "acanthastrea", "micromussa", "lobophyllia",
  "symphyllia", "favia", "favites", "goniastrea", "platygyra", "caulastrea",
  "duncanopsammia", "trachyphyllia", "wellsophyllia", "catalaphyllia",
  "blastomussa", "scolymia", "homophyllia", "cynarina", "acanthophyllia",
  "echinophyllia", "oxypora", "mycedium", "pectinia", "turbinaria", "goniopora",
  "alveopora", "galaxea", "plerogyra", "physogyra", "fungia", "cycloseris",
  "heliofungia", "polyphyllia", "herpolitha", "diaseris", "leptastrea",
  "psammocora", "podabacia", "hydnophora", "merulina", "pavona", "leptoseris",
  "gyrosmilia", "moseleya",
  // SPS
  "acropora", "montipora", "seriatopora", "stylophora", "pocillopora",
  "birdsnest", "porites", "hydrophora", "anacropora", "isopora",
  // Softies & zoas
  "zoanthus", "palythoa", "protopalythoa", "sarcophyton", "sinularia",
  "lobophytum", "cladiella", "nephthea", "capnella", "litophyton", "xenia",
  "heteroxenia", "anthelia", "clavularia", "briareum", "pachyclavularia",
  "discosoma", "rhodactis", "ricordea", "amplexidiscus", "corallimorph",
  "actinodiscus", "sympodium", "efflatounaria", "paralemnalia",
  // NPS & gorgonians
  "dendronephthya", "scleronephthya", "tubastraea", "dendrophyllia",
  "rhizotrochus", "balanophyllia", "gorgonia", "muricea", "menella",
  "diodogorgia", "swiftia",
]);

addGenera("INVERTEBRATE", [
  // Anemones
  "entacmaea", "heteractis", "stichodactyla", "macrodactyla", "cryptodendrum",
  "condylactis", "epicystis", "phymanthus", "actinia", "bartholomea", "aiptasia",
  // Shrimp
  "lysmata", "stenopus", "rhynchocinetes", "thor", "periclimenes", "saron",
  "hymenocera", "alpheus", "enoplometopus",
  // Crabs & hermits
  "mithraculus", "mithrax", "calcinus", "clibanarius", "paguristes", "petrolisthes",
  "trapezia", "percnon", "neopetrolisthes", "dardanus", "stenorhynchus",
  // Snails & other molluscs
  "trochus", "astraea", "astralium", "turbo", "nassarius", "cerithium", "strombus",
  "cypraea", "nerita", "conomurex", "vermetid",
  // Nudibranchs & sea slugs (Chelidonura is a headshield slug, not a fish)
  "chromodoris", "hypselodoris", "elysia", "berghia", "phyllidia", "nembrotha",
  "chelidonura",
  // Urchins, stars, cukes
  "mespilia", "tripneustes", "echinometra", "diadema", "tuxedo",
  "linckia", "fromia", "protoreaster", "archaster", "asterina", "ophiarachna",
  "ophiolepis", "ophioderma", "holothuria", "pseudocolochirus", "synaptula",
  // Clams
  "tridacna", "hippopus",
  // Cephalopods & misc
  "octopus", "sepia", "nautilus", "lima", "spirobranchus", "sabellastarte",
  "protula", "bispira",
]);

// Common-name keywords, checked when the genus gives no answer. Ordered most
// to least specific — first hit wins.
//
// Terms are written singular; the matcher tolerates plurals ("mushrooms",
// "zoas", "clownfishes"). Without this, plural listings fell through
// unclassified and stayed on whatever wrong type the import gave them.
const term = (words: string[]) =>
  new RegExp(`\\b(${words.join("|")})(?:e?s)?\\b`, "i");

const KEYWORDS: [RegExp, Livestock][] = [
  // Explicit non-livestock first
  [term(["t-?shirt", "tee", "hoodie", "hat", "cap", "sticker", "mug", "apparel", "merch", "gift card"]), "MERCH"],
  [term([
    "salt mix", "test kit", "dosing", "doser", "refractometer", "heater",
    "powerhead", "wavemaker", "skimmer", "return pump", "light", "led",
    "reactor", "media", "carbon", "gfo", "filter sock", "glue", "epoxy",
    "frag plug", "frag rack", "net", "thermometer", "ato", "controller",
    "food", "pellet", "flake", "phyto", "reef roid", "amino", "alkalinity",
    "calcium supplement", "magnesium supplement", "trace element",
  ]), "DRY_GOOD"],
  // Inverts (before fish/coral — "shrimp goby" must stay FISH, handled by genus)
  [term(["anemone", "bubble tip", "bta", "rock flower", "carpet anem"]), "INVERTEBRATE"],
  [term([
    "shrimp", "crab", "hermit", "snail", "urchin", "starfish", "sea star",
    "brittle star", "serpent star", "cucumber", "nudibranch", "sea slug",
    "clam", "scallop", "feather duster", "conch", "cleanup crew",
    "clean up crew", "cuc", "octopus", "cuttlefish", "lobster", "abalone",
  ]), "INVERTEBRATE"],
  // Fish
  [term([
    "tang", "surgeonfish", "surgeon", "clownfish", "clown fish", "clown",
    "ocellaris", "percula", "damsel", "chromis", "angelfish", "angel",
    "butterflyfish", "butterfly fish", "wrasse", "goby", "blenny", "blennie",
    "anthias", "basslet", "dottyback", "gramma", "cardinalfish", "cardinal",
    "hawkfish", "jawfish", "rabbitfish", "foxface", "trigger", "triggerfish",
    "puffer", "pufferfish", "boxfish", "cowfish", "filefish", "lionfish",
    "scorpionfish", "grouper", "hogfish", "parrotfish", "eel", "moray",
    "seahorse", "pipefish", "batfish", "tilefish", "shark", "stingray", "ray",
    "dartfish", "firefish", "razorfish", "sandsifter", "sand sifter",
    "dragonet", "mandarin", "hamlet", "squirrelfish", "bigeye", "sweetlips",
    "snapper", "grunt", "goatfish", "remora", "barracuda", "bannerfish",
    "moorish idol", "copperband", "midas",
  ]), "FISH"],
  // Corals last (broadest terms)
  [term([
    "coral", "acan", "zoa", "zoanthid", "paly", "palythoa", "mushroom",
    "shroom", "ricordea", "torch", "hammer", "frogspawn", "octospawn",
    "duncan", "favia", "chalice", "acro", "acropora", "monti", "montipora",
    "birdsnest", "stylo", "digitata", "cyphastrea", "leptoseris", "goniopora",
    "gonio", "alveopora", "elegance", "scoly", "micromussa", "blasto",
    "trumpet", "candy cane", "bubble coral", "plate coral", "brain",
    "open brain", "sun coral", "gorgonian", "leather", "toadstool",
    "kenya tree", "xenia", "gsp", "green star polyp", "pulsing",
    "cespitularia", "clove polyp", "colony", "frag", "encrusting", "plating",
    "sps", "lps", "softie",
  ]), "CORAL"],
];

export interface ClassifyResult {
  type: Livestock | null;
  reason: string;
  confidence: "genus" | "keyword" | "ambiguous" | "none";
}

/** Best-effort livestock type from a product's name + scientific name. */
export function classifyLivestock(
  name: string,
  scientificName?: string | null,
): ClassifyResult {
  const hay = `${name} ${scientificName ?? ""}`.toLowerCase();

  // 1. Genus match — strongest signal. A populated scientificName wins
  //    outright; it's the authoritative binomial.
  const sciFirst = (scientificName ?? "").trim().split(/\s+/)[0]?.toLowerCase();
  if (sciFirst && GENUS[sciFirst]) {
    return { type: GENUS[sciFirst], reason: `genus "${sciFirst}"`, confidence: "genus" };
  }

  // Otherwise gather every genus token in the text. Listings like
  // "Diadema Pseudochromis" contain two genera from different families —
  // guessing there is how fish end up filed as urchins, so we refuse to
  // decide and hand it to a human instead.
  const hits = new Map<string, Livestock>();
  for (const token of hay.split(/[^a-z]+/)) {
    if (token.length >= 5 && GENUS[token]) hits.set(token, GENUS[token]);
  }
  const distinct = new Set(hits.values());
  if (distinct.size === 1) {
    const [token, type] = [...hits.entries()][0];
    return { type, reason: `genus "${token}"`, confidence: "genus" };
  }
  if (distinct.size > 1) {
    return {
      type: null,
      reason: `conflicting genera: ${[...hits.entries()].map(([t, k]) => `${t}=${k}`).join(", ")}`,
      confidence: "ambiguous",
    };
  }

  // 2. Common-name keywords.
  for (const [re, type] of KEYWORDS) {
    const m = hay.match(re);
    if (m) return { type, reason: `keyword "${m[0]}"`, confidence: "keyword" };
  }

  return { type: null, reason: "no signal", confidence: "none" };
}
