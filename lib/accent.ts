import type { CSSProperties } from "react";
import type { Family } from "./land";

/** Sets --accent to a family's colour, so every system keeps the same colour across the page. */
export const accent = (family: Family): CSSProperties => ({ "--accent": `var(--${family})` }) as CSSProperties;
