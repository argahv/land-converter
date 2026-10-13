import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { accent } from "../lib/accent";
import { describe, formatArea, formatFixed, formatWhole } from "../lib/format";
import { fromSqft, roundTo, UNITS, type Family, type UnitId } from "../lib/land";
import s from "../styles/UnitAnatomy.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const SIZE = 400;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Level {
  unit: UnitId;
  /** How many of the next level fit inside, e.g. 1 Ropani = 16 Aana. */
  holds?: string;
  /** Where to highlight one of this unit — each sits inside the one above, to show nesting. */
  focus: Rect;
}

interface Anatomy {
  system: "ropani" | "bigha";
  levels: Level[];
  /** Smallest-unit cells in fill order, so whole larger units fill as complete blocks. */
  cells: Rect[];
  lines: { d: string; weight: "fine" | "mid" | "bold" }[];
}

const gridLines = (stepX: number, stepY: number) => {
  let d = "";
  for (let x = stepX; x < SIZE; x += stepX) d += `M${x} 0V${SIZE}`;
  for (let y = stepY; y < SIZE; y += stepY) d += `M0 ${y}H${SIZE}`;
  return d;
};

// Ropani: 4 × 4 Aana, each 2 × 2 Paisa, each 2 × 2 Daam (74 ft → 400 px).
const ROPANI: Anatomy = {
  system: "ropani",
  levels: [
    { unit: "ropani", holds: "16 Aana", focus: { x: 0, y: 0, w: 400, h: 400 } },
    { unit: "aana", holds: "4 Paisa", focus: { x: 100, y: 100, w: 100, h: 100 } },
    { unit: "paisa", holds: "4 Daam", focus: { x: 150, y: 150, w: 50, h: 50 } },
    { unit: "daam", focus: { x: 175, y: 175, w: 25, h: 25 } },
  ],
  cells: Array.from({ length: 256 }, (_, k) => {
    const a = Math.floor(k / 16);
    const p = Math.floor((k % 16) / 4);
    const d = k % 4;
    return {
      x: (a % 4) * 100 + (p % 2) * 50 + (d % 2) * 25,
      y: Math.floor(a / 4) * 100 + Math.floor(p / 2) * 50 + Math.floor(d / 2) * 25,
      w: 25,
      h: 25,
    };
  }),
  lines: [
    { d: gridLines(25, 25), weight: "fine" },
    { d: gridLines(50, 50), weight: "mid" },
    { d: gridLines(100, 100), weight: "bold" },
  ],
};

// Bigha: 4 × 5 Kattha (67.5 × 54 ft), each 5 × 4 Dhur of 13.5 ft (270 ft → 400 px).
const BIGHA: Anatomy = {
  system: "bigha",
  levels: [
    { unit: "bigha", holds: "20 Kattha", focus: { x: 0, y: 0, w: 400, h: 400 } },
    { unit: "kattha", holds: "20 Dhur", focus: { x: 100, y: 160, w: 100, h: 80 } },
    { unit: "dhur", focus: { x: 160, y: 200, w: 20, h: 20 } },
  ],
  cells: Array.from({ length: 400 }, (_, k) => {
    const c = Math.floor(k / 20);
    const r = k % 20;
    return { x: (c % 4) * 100 + (r % 5) * 20, y: Math.floor(c / 4) * 80 + Math.floor(r / 5) * 20, w: 20, h: 20 };
  }),
  lines: [
    { d: gridLines(20, 20), weight: "fine" },
    { d: gridLines(100, 80), weight: "bold" },
  ],
};

const shapeText = (unit: UnitId) => {
  const shape = UNITS[unit].shape!;
  return `${formatFixed(shape.width, 3)} × ${formatFixed(shape.length, 3)} ft`;
};

interface Props {
  sqft: number;
  family: Family;
}

export default function UnitAnatomy({ sqft, family }: Props) {
  const [choice, setChoice] = useState<"ropani" | "bigha" | null>(null);
  const [levelIndex, setLevelIndex] = useState(1);
  const anatomy = (choice ?? (family === "bigha" ? "bigha" : "ropani")) === "bigha" ? BIGHA : ROPANI;
  const level = anatomy.levels[Math.min(levelIndex, anatomy.levels.length - 1)];
  const top = UNITS[anatomy.levels[0].unit];
  const smallest = UNITS[anatomy.levels[anatomy.levels.length - 1].unit];

  // Whole top-level units stack behind the grid; the remainder fills cells in nesting order.
  const wholes = Math.floor(roundTo(sqft / top.sqft, 6));
  const remainder = Math.max(sqft - wholes * top.sqft, 0);
  const exact = remainder < 1e-6 && wholes > 0;
  const cellsFilled = exact ? anatomy.cells.length : roundTo(remainder / smallest.sqft, 4);
  const behind = exact ? wholes - 1 : wholes;

  const switchTo = (next: "ropani" | "bigha") => {
    setChoice(next);
    setLevelIndex(1);
  };

  const caption =
    sqft <= 0
      ? "Enter an area above to see it filled in."
      : exact
        ? `Exactly ${formatWhole(wholes)} ${top.name}${wholes > 1 ? " plots" : ""}.`
        : wholes > 0
          ? `${formatWhole(wholes)} full ${top.name} plus ${describe(remainder, anatomy.system)} of the next.`
          : `${describe(remainder, anatomy.system)} of one ${top.name}.`;

  return (
    <section id="anatomy" className="section" style={accent(anatomy.system)}>
      <div className="wrap">
        <motion.div className="section-head" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }}>
          <span className="eyebrow">Unit anatomy</span>
          <h2 className="h2">
            How the units <em>nest</em>
          </h2>
          <p className="lede">Every traditional unit is a smaller square inside a bigger one. Pick a unit to see where it sits, and watch your own area fill the plot.</p>
        </motion.div>

        <div className={s.layout}>
          <motion.div
            className={`card ${s.stage}`}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className={s.toggle} role="group" aria-label="System">
              {(["ropani", "bigha"] as const).map((id) => (
                <button key={id} type="button" className={s.toggleBtn} data-active={anatomy.system === id} aria-pressed={anatomy.system === id} style={accent(id)} onClick={() => switchTo(id)}>
                  {anatomy.system === id && <motion.span layoutId="anatomy-toggle" className={s.togglePill} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className={s.toggleLabel}>{UNITS[id].name}</span>
                </button>
              ))}
            </div>

            <div className={s.plotWrap}>
              <AnimatePresence>
                {Array.from({ length: Math.min(behind, 3) }, (_, i) => (
                  <motion.div
                    key={`${anatomy.system}-${i}`}
                    className={s.sheet}
                    initial={{ opacity: 0, x: 0, y: 0 }}
                    animate={{ opacity: 0.55 - i * 0.14, x: (i + 1) * 10, y: -(i + 1) * 10 }}
                    exit={{ opacity: 0, x: 0, y: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  />
                ))}
              </AnimatePresence>
              <AnimatePresence>
                {behind > 0 && (
                  <motion.span key="count" className={s.count} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                    +{formatWhole(behind)} {top.name}
                  </motion.span>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                <motion.svg
                  key={anatomy.system}
                  viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
                  className={s.svg}
                  role="img"
                  aria-label={`One ${top.name} divided into its smaller units. ${caption}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <rect width={SIZE} height={SIZE} className={s.base} />
                  {anatomy.cells.map((c, k) => {
                    const fill = k < Math.floor(cellsFilled) ? 1 : k === Math.floor(cellsFilled) ? cellsFilled % 1 : 0;
                    return (
                      <rect
                        key={k}
                        x={c.x}
                        y={c.y}
                        width={c.w}
                        height={c.h}
                        className={s.cell}
                        style={{ opacity: fill, transitionDelay: `${(k / anatomy.cells.length) * 420}ms` }}
                      />
                    );
                  })}
                  {anatomy.lines.map((l, i) => (
                    <motion.path
                      key={i}
                      d={l.d}
                      className={s[l.weight]}
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, delay: 0.2 + i * 0.25, ease: "easeInOut" }}
                    />
                  ))}
                  <rect width={SIZE} height={SIZE} className={s.outline} />
                  <motion.rect
                    className={s.focus}
                    initial={false}
                    animate={{ x: level.focus.x, y: level.focus.y, width: level.focus.w, height: level.focus.h }}
                    transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  />
                </motion.svg>
              </AnimatePresence>
            </div>
            <p className={s.caption} aria-live="polite">
              {caption}
            </p>
          </motion.div>

          <motion.ol
            className={s.levels}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          >
            {anatomy.levels.map((l, i) => {
              const info = UNITS[l.unit];
              const active = level.unit === l.unit;
              return (
                <motion.li key={`${anatomy.system}-${l.unit}`} variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } } }}>
                  <button
                    type="button"
                    className={s.level}
                    data-active={active}
                    aria-pressed={active}
                    onClick={() => setLevelIndex(i)}
                    onMouseEnter={() => setLevelIndex(i)}
                    onFocus={() => setLevelIndex(i)}
                  >
                    <span className={s.levelSwatchBox}>
                      <span className={s.levelSwatch} style={{ width: 34 - i * 7, height: 34 - i * 7 }} />
                    </span>
                    <span className={s.levelBody}>
                      <span className={s.levelTitle}>
                        1 {info.name} <span className="deva">{info.nepali}</span>
                        {l.holds && <span className={s.holds}>= {l.holds}</span>}
                      </span>
                      <span className={`${s.levelMeta} tabular`}>
                        {shapeText(l.unit)} · {formatArea(info.sqft)} ft² · {formatArea(fromSqft(info.sqft, "sqm"))} m²
                      </span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
