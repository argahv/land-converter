import { useCallback, useMemo, useState } from "react";
import {
  breakdown,
  isNormalized,
  parseAmount,
  roundTo,
  sanitizeAmount,
  SYSTEM_ORDER,
  SYSTEMS,
  toSqft,
  UNITS,
  type Amounts,
  type SystemId,
  type UnitId,
} from "./land";

export type Inputs = Partial<Record<UnitId, string>>;

interface LandState {
  system: SystemId;
  inputs: Inputs;
  /**
   * The exact area when values were filled in for the user (switching systems, presets).
   * The fields then show rounded text, but the area itself stays exact until they edit.
   */
  exactSqft: number | null;
}

export function amountsOf(system: SystemId, inputs: Inputs): Amounts {
  const amounts: Amounts = {};
  for (const unit of SYSTEMS[system].units) amounts[unit] = parseAmount(inputs[unit]);
  return amounts;
}

export function inputsFor(sqft: number, system: SystemId): Inputs {
  if (sqft <= 0) return {};
  const units = SYSTEMS[system].units;
  if (units.length === 1) {
    const value = sqft / UNITS[units[0]].sqft;
    const decimals = value >= 100 ? 2 : value >= 1 ? 4 : 6;
    return { [units[0]]: String(roundTo(value, decimals)) };
  }
  const inputs: Inputs = {};
  for (const part of breakdown(sqft, system)) inputs[part.unit] = part.value ? String(part.value) : "";
  return inputs;
}

const initialState = (): LandState => ({ system: "ropani", inputs: { ropani: "1" }, exactSqft: null });

export function useLand() {
  const [state, setState] = useState<LandState>(initialState);
  const { system, inputs, exactSqft } = state;

  const amounts = useMemo(() => amountsOf(system, inputs), [system, inputs]);
  const sqft = exactSqft ?? toSqft(amounts);
  const normalized = useMemo(() => isNormalized(amounts, system), [amounts, system]);

  const setField = useCallback((unit: UnitId, raw: string) => {
    setState((s) => ({ ...s, inputs: { ...s.inputs, [unit]: sanitizeAmount(raw) }, exactSqft: null }));
  }, []);

  const step = useCallback((unit: UnitId, delta: number) => {
    setState((s) => {
      const next = Math.max(0, roundTo(parseAmount(s.inputs[unit]) + delta, 6));
      return { ...s, inputs: { ...s.inputs, [unit]: next ? String(next) : "" }, exactSqft: null };
    });
  }, []);

  const switchSystem = useCallback((next: SystemId) => {
    setState((s) => {
      if (s.system === next) return s;
      const total = s.exactSqft ?? toSqft(amountsOf(s.system, s.inputs));
      return { system: next, inputs: inputsFor(total, next), exactSqft: total || null };
    });
  }, []);

  const load = useCallback((area: number, target?: SystemId) => {
    setState((s) => {
      const nextSystem = target ?? s.system;
      return { system: nextSystem, inputs: inputsFor(area, nextSystem), exactSqft: area || null };
    });
  }, []);

  const tidy = useCallback(() => {
    setState((s) => {
      const total = s.exactSqft ?? toSqft(amountsOf(s.system, s.inputs));
      return { ...s, inputs: inputsFor(total, s.system), exactSqft: total || null };
    });
  }, []);

  const reset = useCallback(() => setState((s) => ({ system: s.system, inputs: {}, exactSqft: null })), []);

  return { system, inputs, amounts, sqft, normalized, setField, step, switchSystem, load, tidy, reset };
}

export type Land = ReturnType<typeof useLand>;

/** Encodes an area as a shareable query string: ?from=ropani&v=2,5,0,1.5 */
export function toQuery(system: SystemId, inputs: Inputs): string {
  const values = SYSTEMS[system].units.map((u) => parseAmount(inputs[u]));
  return `?from=${system}&v=${values.join(",")}`;
}

export function fromQuery(search: string): { system: SystemId; sqft: number } | null {
  const params = new URLSearchParams(search);
  const from = params.get("from") as SystemId | null;
  const v = params.get("v");
  if (!from || !v || !SYSTEM_ORDER.includes(from)) return null;
  const values = v.split(",").map((x) => parseAmount(x));
  const amounts: Amounts = {};
  SYSTEMS[from].units.forEach((unit, i) => (amounts[unit] = values[i] ?? 0));
  const sqft = toSqft(amounts);
  return sqft > 0 ? { system: from, sqft } : null;
}
