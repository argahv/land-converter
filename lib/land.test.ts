import { describe, expect, it } from "vitest";
import {
  breakdown,
  closestReference,
  fromSqft,
  isNormalized,
  parseAmount,
  sanitizeAmount,
  SQM_PER_SQFT,
  toSqft,
  UNITS,
} from "./land";
import { describe as describeArea, formatArea } from "./format";
import { amountsOf, fromQuery, inputsFor, toQuery } from "./useLand";

const values = (parts: { value: number }[]) => parts.map((p) => p.value);

describe("unit definitions", () => {
  it("nests the Ropani system as 1 : 16 : 64 : 256", () => {
    expect(UNITS.ropani.sqft).toBe(16 * UNITS.aana.sqft);
    expect(UNITS.aana.sqft).toBe(4 * UNITS.paisa.sqft);
    expect(UNITS.paisa.sqft).toBe(4 * UNITS.daam.sqft);
    expect(UNITS.ropani.sqft).toBe(256 * UNITS.daam.sqft);
  });

  it("nests the Bigha system as 1 : 20 : 400", () => {
    expect(UNITS.bigha.sqft).toBe(20 * UNITS.kattha.sqft);
    expect(UNITS.kattha.sqft).toBe(20 * UNITS.dhur.sqft);
  });

  it("matches each unit's traditional shape", () => {
    for (const unit of Object.values(UNITS)) {
      if (unit.shape) expect(unit.shape.width * unit.shape.length).toBeCloseTo(unit.sqft, 9);
    }
  });

  it("uses the exact international foot", () => {
    expect(fromSqft(UNITS.ropani.sqft, "sqm")).toBeCloseTo(508.7370, 4);
    expect(fromSqft(UNITS.bigha.sqft, "sqm")).toBeCloseTo(6772.6316, 4);
    expect(fromSqft(UNITS.kattha.sqft, "sqm")).toBeCloseTo(338.6316, 4);
    expect(fromSqft(UNITS.dhur.sqft, "sqm")).toBeCloseTo(16.9316, 4);
    expect(fromSqft(UNITS.hectare.sqft, "sqm")).toBeCloseTo(10000, 9);
    expect(fromSqft(UNITS.acre.sqft, "sqm")).toBeCloseTo(4046.8564, 4);
    expect(1 / SQM_PER_SQFT).toBeCloseTo(10.7639, 4);
  });
});

describe("toSqft", () => {
  it("adds compound Ropani amounts", () => {
    expect(toSqft({ ropani: 1, aana: 2, paisa: 3, daam: 1 })).toBe(5476 + 684.5 + 256.6875 + 21.390625);
  });

  it("adds compound Bigha amounts (the old Kattha/Dhur formulas divided instead of multiplied)", () => {
    expect(toSqft({ bigha: 1, kattha: 1, dhur: 1 })).toBe(72900 + 3645 + 182.25);
    expect(toSqft({ bigha: 2, kattha: 0, dhur: 0 })).toBe(145800);
  });

  it("treats a Paisa entry together with Ropani correctly (the old formula used ropani / 64)", () => {
    expect(toSqft({ ropani: 1, paisa: 1 })).toBe(5476 + 85.5625);
  });
});

describe("breakdown", () => {
  it("splits whole units exactly", () => {
    expect(values(breakdown(5476, "ropani"))).toEqual([1, 0, 0, 0]);
    expect(values(breakdown(72900, "bigha"))).toEqual([1, 0, 0]);
    expect(values(breakdown(3645, "bigha"))).toEqual([0, 1, 0]);
  });

  it("leaves no stale larger units behind for small areas", () => {
    expect(values(breakdown(342.25 * 2, "ropani"))).toEqual([0, 2, 0, 0]);
    expect(values(breakdown(85.5625 * 3, "ropani"))).toEqual([0, 0, 3, 0]);
    expect(values(breakdown(182.25 * 5, "bigha"))).toEqual([0, 0, 5]);
  });

  it("never shows a rounded-up remainder like 4.00 Daam", () => {
    const almostOneAana = UNITS.aana.sqft - 0.0001;
    expect(values(breakdown(almostOneAana, "ropani"))).toEqual([0, 1, 0, 0]);
  });

  it("survives a round trip through square metres", () => {
    const sqm = fromSqft(UNITS.ropani.sqft, "sqm");
    expect(values(breakdown(sqm * UNITS.sqm.sqft, "ropani"))).toEqual([1, 0, 0, 0]);
  });

  it("converts across systems", () => {
    expect(values(breakdown(UNITS.bigha.sqft, "ropani"))).toEqual([13, 5, 0, 0.04]);
    expect(values(breakdown(UNITS.ropani.sqft, "bigha"))).toEqual([0, 1, 10.05]);
  });

  it("returns zeros for empty or negative areas", () => {
    expect(values(breakdown(0, "ropani"))).toEqual([0, 0, 0, 0]);
    expect(values(breakdown(-5, "bigha"))).toEqual([0, 0, 0]);
  });
});

describe("isNormalized", () => {
  it("flags amounts that overflow into the next unit", () => {
    expect(isNormalized({ ropani: 1, aana: 4 }, "ropani")).toBe(true);
    expect(isNormalized({ aana: 20 }, "ropani")).toBe(false);
    expect(isNormalized({ daam: 4 }, "ropani")).toBe(false);
    expect(isNormalized({ kattha: 20 }, "bigha")).toBe(false);
    expect(isNormalized({ ropani: 1.5 }, "ropani")).toBe(false);
    expect(isNormalized({ daam: 2.5 }, "ropani")).toBe(true);
    expect(isNormalized({ sqft: 99999 }, "sqft")).toBe(true);
  });
});

describe("input handling", () => {
  it("keeps partially typed numbers", () => {
    expect(sanitizeAmount("2.")).toBe("2.");
    expect(sanitizeAmount("1.2.3")).toBe("1.23");
    expect(sanitizeAmount("1,250")).toBe("1250");
    expect(sanitizeAmount("-4abc")).toBe("4");
    expect(sanitizeAmount("007")).toBe("7");
    expect(sanitizeAmount("0.5")).toBe("0.5");
  });

  it("parses empty and invalid text as zero", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount(".")).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
    expect(parseAmount("12.5")).toBe(12.5);
  });

  it("fills a system's fields from an area", () => {
    expect(inputsFor(UNITS.bigha.sqft, "ropani")).toEqual({ ropani: "13", aana: "5", paisa: "", daam: "0.04" });
    expect(inputsFor(UNITS.ropani.sqft, "sqm")).toEqual({ sqm: "508.74" });
    expect(inputsFor(0, "bigha")).toEqual({});
    expect(amountsOf("ropani", { ropani: "2", aana: "" })).toEqual({ ropani: 2, aana: 0, paisa: 0, daam: 0 });
  });

  it("round-trips a shared link", () => {
    const query = toQuery("bigha", { bigha: "1", kattha: "2", dhur: "3.5" });
    expect(query).toBe("?from=bigha&v=1,2,3.5");
    expect(fromQuery(query)).toEqual({ system: "bigha", sqft: 72900 + 7290 + 637.875 });
    expect(fromQuery("?from=nope&v=1")).toBeNull();
    expect(fromQuery("?from=ropani&v=0")).toBeNull();
  });
});

describe("formatting", () => {
  it("uses Nepali digit grouping and magnitude-aware precision", () => {
    expect(formatArea(1234567.891)).toBe("12,34,567.89");
    expect(formatArea(13.31257)).toBe("13.313");
    expect(formatArea(0.000199)).toBe("0.000199");
    expect(formatArea(0)).toBe("0");
  });

  it("describes an area in words", () => {
    expect(describeArea(UNITS.bigha.sqft, "ropani")).toBe("13 Ropani 5 Aana 0.04 Daam");
    expect(describeArea(0, "bigha")).toBe("0 Bigha");
    expect(describeArea(UNITS.hectare.sqft, "sqm")).toBe("10,000 m²");
  });
});

describe("closestReference", () => {
  it("picks a comparison of similar size", () => {
    expect(closestReference(UNITS.daam.sqft).id).toBe("parking");
    expect(closestReference(UNITS.ropani.sqft).id).toBe("basketball");
    expect(closestReference(UNITS.bigha.sqft).id).toBe("football");
  });
});
