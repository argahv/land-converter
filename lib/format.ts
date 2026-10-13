import { breakdown, fromSqft, SYSTEMS, UNITS, type SystemId } from "./land";

// Nepal groups digits the South Asian way: 1,00,000 rather than 100,000.
const formatters = new Map<string, Intl.NumberFormat>();
const formatter = (options: Intl.NumberFormatOptions) => {
  const key = JSON.stringify(options);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-IN", options);
    formatters.set(key, f);
  }
  return f;
};

/** Precision that adapts to magnitude: 12,34,567.89 · 13.313 · 0.1257 · 0.0001991 */
export function formatArea(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 100) return formatter({ maximumFractionDigits: 2 }).format(n);
  if (abs >= 1) return formatter({ maximumFractionDigits: 3 }).format(n);
  return formatter({ maximumSignificantDigits: 4 }).format(n);
}

export const formatFixed = (n: number, decimals: number) =>
  formatter({ minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(n);

export const formatWhole = (n: number) => formatter({ maximumFractionDigits: 0 }).format(n);

/** "2 Ropani 5 Aana 2.5 Daam", skipping empty parts. */
export function describe(sqft: number, system: SystemId): string {
  const units = SYSTEMS[system].units;
  if (units.length === 1) return `${formatArea(fromSqft(sqft, units[0]))} ${UNITS[units[0]].symbol}`;
  const parts = breakdown(sqft, system).filter((p) => p.value > 0);
  if (parts.length === 0) return `0 ${UNITS[units[0]].symbol}`;
  return parts.map((p) => `${formatFixed(p.value, 2)} ${UNITS[p.unit].symbol}`).join(" ");
}
