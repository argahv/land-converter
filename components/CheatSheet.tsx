import { motion } from "motion/react";
import { accent } from "../lib/accent";
import { formatArea, formatFixed } from "../lib/format";
import { fromSqft, SYSTEMS, UNITS, type SystemId, type UnitId } from "../lib/land";
import { ArrowUpRightIcon } from "./Icons";
import s from "../styles/CheatSheet.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

const ROWS: { unit: UnitId; system: SystemId }[] = [
  { unit: "ropani", system: "ropani" },
  { unit: "aana", system: "ropani" },
  { unit: "paisa", system: "ropani" },
  { unit: "daam", system: "ropani" },
  { unit: "bigha", system: "bigha" },
  { unit: "kattha", system: "bigha" },
  { unit: "dhur", system: "bigha" },
  { unit: "hectare", system: "hectare" },
  { unit: "acre", system: "acre" },
];

/** The largest unit of another system that is at least 1, e.g. 1 Ropani ≈ 1.502 Kattha. */
function closestIn(sqft: number, system: SystemId): UnitId {
  const units = SYSTEMS[system].units;
  return units.find((u) => fromSqft(sqft, u) >= 1) ?? units[units.length - 1];
}

function equivalences(unit: UnitId, system: SystemId): string[] {
  const sqft = UNITS[unit].sqft;
  const units = SYSTEMS[system].units;
  const i = units.indexOf(unit);
  const out: string[] = [];
  if (i < units.length - 1) {
    const next = units[i + 1];
    out.push(`${Math.round(sqft / UNITS[next].sqft)} ${UNITS[next].name}`);
  }
  if (unit !== "sqft") out.push(`${formatArea(sqft)} ft²`);
  if (unit !== "sqm") out.push(`${formatArea(fromSqft(sqft, "sqm"))} m²`);
  const family = SYSTEMS[system].family;
  const others: SystemId[] = family === "ropani" ? ["bigha"] : family === "bigha" ? ["ropani"] : ["ropani", "bigha"];
  for (const other of others) {
    const target = closestIn(sqft, other);
    out.push(`≈ ${formatArea(fromSqft(sqft, target))} ${UNITS[target].name}`);
  }
  return out;
}

export default function CheatSheet({ onPick }: { onPick: (sqft: number, system: SystemId) => void }) {
  return (
    <section id="reference" className="section">
      <div className="wrap">
        <motion.div className="section-head" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }}>
          <span className="eyebrow">Quick reference</span>
          <h2 className="h2">
            One of each, <em>side by side</em>
          </h2>
          <p className="lede">Every figure here comes from the same exact definitions the converter uses. Tap a card to load it.</p>
        </motion.div>

        <motion.ul
          className={s.grid}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        >
          {ROWS.map(({ unit, system }) => {
            const info = UNITS[unit];
            return (
              <motion.li
                key={unit}
                style={accent(SYSTEMS[system].family)}
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }}
              >
                <motion.button
                  type="button"
                  className={`card ${s.item}`}
                  onClick={() => onPick(info.sqft, system)}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                >
                  <span className={s.head}>
                    <span className={s.title}>
                      1 {info.name} <span className="deva">{info.nepali}</span>
                    </span>
                    <span className={s.go} aria-hidden>
                      <ArrowUpRightIcon />
                    </span>
                  </span>
                  <span className={s.chips}>
                    {equivalences(unit, system).map((text) => (
                      <span key={text} className={`${s.chip} tabular`}>
                        {text}
                      </span>
                    ))}
                  </span>
                  {info.shape && (
                    <span className={`${s.shape} tabular`}>
                      <span className={s.shapeIcon} style={{ aspectRatio: `${info.shape.width} / ${info.shape.length}` }} />
                      {formatFixed(info.shape.width, 3)} × {formatFixed(info.shape.length, 3)} ft
                    </span>
                  )}
                  <span className="sr-only">Load 1 {info.name} into the converter</span>
                </motion.button>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
