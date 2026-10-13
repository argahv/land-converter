/**
 * Canonical land-unit engine.
 *
 * Every area is stored as square feet. Each unit is defined by its exact
 * square-foot value, so conversions never chain through rounded constants.
 * The Nepali units are squares (or near-squares) of whole feet:
 *   Ropani 74 × 74 ft · Aana 18.5 × 18.5 ft · Paisa 9.25 × 9.25 ft · Daam 4.625 × 4.625 ft
 *   Bigha 270 × 270 ft · Kattha 67.5 × 54 ft · Dhur 13.5 × 13.5 ft
 */

/** 1 ft = 0.3048 m exactly, so 1 ft² = 0.09290304 m². */
export const SQM_PER_SQFT = 0.09290304;

export type UnitId =
  | "ropani"
  | "aana"
  | "paisa"
  | "daam"
  | "bigha"
  | "kattha"
  | "dhur"
  | "sqft"
  | "sqm"
  | "acre"
  | "hectare";

export interface UnitInfo {
  id: UnitId;
  name: string;
  nepali: string;
  symbol: string;
  sqft: number;
  /** Shape of one unit in feet, when the unit has a traditional shape. */
  shape?: { width: number; length: number };
}

export const UNITS: Record<UnitId, UnitInfo> = {
  ropani: { id: "ropani", name: "Ropani", nepali: "रोपनी", symbol: "Ropani", sqft: 5476, shape: { width: 74, length: 74 } },
  aana: { id: "aana", name: "Aana", nepali: "आना", symbol: "Aana", sqft: 342.25, shape: { width: 18.5, length: 18.5 } },
  paisa: { id: "paisa", name: "Paisa", nepali: "पैसा", symbol: "Paisa", sqft: 85.5625, shape: { width: 9.25, length: 9.25 } },
  daam: { id: "daam", name: "Daam", nepali: "दाम", symbol: "Daam", sqft: 21.390625, shape: { width: 4.625, length: 4.625 } },
  bigha: { id: "bigha", name: "Bigha", nepali: "बिघा", symbol: "Bigha", sqft: 72900, shape: { width: 270, length: 270 } },
  kattha: { id: "kattha", name: "Kattha", nepali: "कट्ठा", symbol: "Kattha", sqft: 3645, shape: { width: 67.5, length: 54 } },
  dhur: { id: "dhur", name: "Dhur", nepali: "धुर", symbol: "Dhur", sqft: 182.25, shape: { width: 13.5, length: 13.5 } },
  sqft: { id: "sqft", name: "Square feet", nepali: "वर्ग फिट", symbol: "ft²", sqft: 1 },
  sqm: { id: "sqm", name: "Square metres", nepali: "वर्ग मिटर", symbol: "m²", sqft: 1 / SQM_PER_SQFT },
  acre: { id: "acre", name: "Acre", nepali: "एकड", symbol: "acre", sqft: 43560 },
  hectare: { id: "hectare", name: "Hectare", nepali: "हेक्टर", symbol: "ha", sqft: 10000 / SQM_PER_SQFT },
};

export type SystemId = "ropani" | "bigha" | "sqft" | "sqm" | "acre" | "hectare";
export type Family = "ropani" | "bigha" | "metric" | "imperial";

export interface SystemInfo {
  id: SystemId;
  label: string;
  units: UnitId[];
  family: Family;
}

export const SYSTEMS: Record<SystemId, SystemInfo> = {
  ropani: { id: "ropani", label: "Ropani", units: ["ropani", "aana", "paisa", "daam"], family: "ropani" },
  bigha: { id: "bigha", label: "Bigha", units: ["bigha", "kattha", "dhur"], family: "bigha" },
  sqft: { id: "sqft", label: "Sq ft", units: ["sqft"], family: "imperial" },
  sqm: { id: "sqm", label: "Sq m", units: ["sqm"], family: "metric" },
  acre: { id: "acre", label: "Acre", units: ["acre"], family: "imperial" },
  hectare: { id: "hectare", label: "Hectare", units: ["hectare"], family: "metric" },
};

export const SYSTEM_ORDER: SystemId[] = ["ropani", "bigha", "sqft", "sqm", "acre", "hectare"];

export interface FamilyInfo {
  id: Family;
  name: string;
  nepali: string;
  where: string;
}

export const FAMILIES: Record<Family, FamilyInfo> = {
  ropani: { id: "ropani", name: "Ropani system", nepali: "रोपनी · आना · पैसा · दाम", where: "Hills & Kathmandu Valley" },
  bigha: { id: "bigha", name: "Bigha system", nepali: "बिघा · कट्ठा · धुर", where: "Terai plains" },
  metric: { id: "metric", name: "Metric", nepali: "वर्ग मिटर · हेक्टर", where: "International standard" },
  imperial: { id: "imperial", name: "Imperial", nepali: "वर्ग फिट · एकड", where: "Builders & listings" },
};

export type Amounts = Partial<Record<UnitId, number>>;

export const roundTo = (n: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

/** Keeps digits and a single decimal point, so partially typed values like "2." survive. */
export function sanitizeAmount(raw: string): string {
  let s = raw.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  return s.replace(/^0+(?=\d)/, "").slice(0, 14);
}

export function parseAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function toSqft(amounts: Amounts): number {
  let total = 0;
  for (const [id, value] of Object.entries(amounts)) {
    total += (value ?? 0) * UNITS[id as UnitId].sqft;
  }
  return total;
}

export const fromSqft = (sqft: number, unit: UnitId) => sqft / UNITS[unit].sqft;

export interface Part {
  unit: UnitId;
  value: number;
}

/**
 * Splits an area into a system's units, e.g. 1 Bigha → 13 Ropani 5 Aana 0 Paisa 0.04 Daam.
 * Rounding happens once, on the smallest unit, before the split — so a value can never
 * show up as "3 Paisa 4.00 Daam" instead of "1 Aana".
 */
export function breakdown(sqft: number, system: SystemId, decimals = 2): Part[] {
  const units = SYSTEMS[system].units;
  const smallest = UNITS[units[units.length - 1]].sqft;
  let rest = roundTo(Math.max(sqft, 0) / smallest, decimals);

  return units.map((unit, i) => {
    if (i === units.length - 1) return { unit, value: rest };
    // Ratios between Nepali units are whole numbers (256, 16, 4 / 400, 20).
    const per = Math.round(UNITS[unit].sqft / smallest);
    const whole = Math.floor(rest / per + 1e-9);
    rest = roundTo(rest - whole * per, decimals);
    return { unit, value: whole };
  });
}

/** True when compound inputs aren't in canonical form, e.g. 20 Aana instead of 1 Ropani 4 Aana. */
export function isNormalized(amounts: Amounts, system: SystemId): boolean {
  const units = SYSTEMS[system].units;
  if (units.length === 1) return true;
  return units.every((unit, i) => {
    if (i === 0) return Number.isInteger(amounts[unit] ?? 0);
    const parent = UNITS[units[i - 1]].sqft;
    const value = amounts[unit] ?? 0;
    const isLast = i === units.length - 1;
    return value < Math.round(parent / UNITS[unit].sqft) && (isLast || Number.isInteger(value));
  });
}

/** A square plot with the same area, in feet. */
export const squareSide = (sqft: number) => Math.sqrt(Math.max(sqft, 0));

export interface Reference {
  id: "parking" | "badminton" | "tennis" | "basketball" | "football";
  name: string;
  plural: string;
  /** Metres. */
  width: number;
  length: number;
}

export const REFERENCES: Reference[] = [
  { id: "parking", name: "car parking space", plural: "car parking spaces", width: 2.5, length: 5 },
  { id: "badminton", name: "badminton court", plural: "badminton courts", width: 6.1, length: 13.4 },
  { id: "tennis", name: "tennis court", plural: "tennis courts", width: 10.97, length: 23.77 },
  { id: "basketball", name: "basketball court", plural: "basketball courts", width: 15, length: 28 },
  { id: "football", name: "football pitch", plural: "football pitches", width: 68, length: 105 },
];

export const referenceSqm = (ref: Reference) => ref.width * ref.length;

/** The reference whose size is closest to the area on a log scale, so both read well side by side. */
export function closestReference(sqft: number): Reference {
  const sqm = Math.max(sqft * SQM_PER_SQFT, 0.01);
  let best = REFERENCES[0];
  let bestDistance = Infinity;
  for (const ref of REFERENCES) {
    const distance = Math.abs(Math.log(sqm / referenceSqm(ref)));
    if (distance < bestDistance) {
      best = ref;
      bestDistance = distance;
    }
  }
  return best;
}
