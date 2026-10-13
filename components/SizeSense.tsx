import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { accent } from "../lib/accent";
import { formatArea, formatFixed } from "../lib/format";
import { closestReference, REFERENCES, referenceSqm, SQM_PER_SQFT, squareSide, type Family, type Reference } from "../lib/land";
import AnimatedNumber from "./AnimatedNumber";
import s from "../styles/SizeSense.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const FT_PER_M = 1 / 0.3048;
const W = 640;
const GROUND = 286;
const MAX_H = 230;
const GAP = 44;
const PAD = 28;
const SCALE_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

const formatPercent = (n: number) => formatFixed(n, n < 10 ? 1 : 0);
const formatOne = (n: number) => formatFixed(n, 1);
const formatWholeFt = (n: number) => formatFixed(n, 0);
const formatCount = (n: number) => formatFixed(n, n >= 100 ? 0 : n >= 10 ? 1 : 2);

/** Court and bay markings, drawn in metres with the long side horizontal. */
function Markings({ id }: { id: Reference["id"] }) {
  switch (id) {
    case "parking":
      return (
        <>
          <path d="M0 0 H5 M0 2.5 H5 M5 0 V2.5" />
          <rect x="0.5" y="0.35" width="4" height="1.8" rx="0.55" className={s.solid} />
          <rect x="2.55" y="0.55" width="0.85" height="1.4" rx="0.2" />
          <rect x="0.85" y="0.6" width="0.55" height="1.3" rx="0.2" />
        </>
      );
    case "badminton":
      return (
        <>
          <rect width="13.4" height="6.1" className={s.solid} />
          <path d="M0 0.46 H13.4 M0 5.64 H13.4 M0.76 0 V6.1 M12.64 0 V6.1 M4.72 0 V6.1 M8.68 0 V6.1 M0 3.05 H4.72 M8.68 3.05 H13.4" />
          <path d="M6.7 -0.3 V6.4" className={s.net} />
        </>
      );
    case "tennis":
      return (
        <>
          <rect width="23.77" height="10.97" className={s.solid} />
          <path d="M0 1.37 H23.77 M0 9.6 H23.77 M5.485 1.37 V9.6 M18.285 1.37 V9.6 M5.485 5.485 H18.285" />
          <path d="M11.885 -0.4 V11.37" className={s.net} />
        </>
      );
    case "basketball":
      return (
        <>
          <rect width="28" height="15" className={s.solid} />
          <path d="M14 0 V15" />
          <circle cx="14" cy="7.5" r="1.8" />
          <path d="M0 5.05 H5.8 V9.95 H0 M28 5.05 H22.2 V9.95 H28" />
          <circle cx="5.8" cy="7.5" r="1.8" />
          <circle cx="22.2" cy="7.5" r="1.8" />
          <path d="M0 0.9 H2.99 A6.75 6.75 0 0 1 2.99 14.1 H0 M28 0.9 H25.01 A6.75 6.75 0 0 0 25.01 14.1 H28" />
        </>
      );
    case "football":
      return (
        <>
          <rect width="105" height="68" className={s.solid} />
          <path d="M52.5 0 V68" />
          <circle cx="52.5" cy="34" r="9.15" />
          <path d="M0 13.84 H16.5 V54.16 H0 M105 13.84 H88.5 V54.16 H105 M0 24.84 H5.5 V43.16 H0 M105 24.84 H99.5 V43.16 H105" />
        </>
      );
  }
}

/** A tiny proportional outline of the reference, for the list. */
function Glyph({ reference }: { reference: Reference }) {
  const ratio = reference.width / reference.length;
  return (
    <svg viewBox="0 0 40 40" className={s.glyph} aria-hidden>
      <rect x={4} y={20 - 16 * ratio} width={32} height={32 * ratio} rx={1.5} />
    </svg>
  );
}

interface Props {
  sqft: number;
  family: Family;
  label: string;
}

export default function SizeSense({ sqft, family, label }: Props) {
  const [picked, setPicked] = useState<Reference["id"] | null>(null);
  const empty = sqft <= 0;
  const reference = REFERENCES.find((r) => r.id === picked) ?? closestReference(sqft);

  const side = squareSide(sqft);
  const sqm = sqft * SQM_PER_SQFT;
  const refL = reference.length * FT_PER_M;
  const refW = reference.width * FT_PER_M;
  const pxPerFt = empty ? 1 : Math.min(MAX_H / Math.max(side, refW), (W - PAD * 2 - GAP) / (side + refL));
  const sidePx = empty ? 150 : Math.max(side * pxPerFt, 3);
  const refLPx = refL * pxPerFt;
  const refWPx = refW * pxPerFt;
  const x0 = (W - (sidePx + GAP + refLPx)) / 2;
  const courtX = x0 + sidePx + GAP;
  const pxPerM = pxPerFt * FT_PER_M;

  // A scale bar of a round length that draws between 40 and 140px.
  const barM = SCALE_STEPS.find((m) => m * pxPerM >= 40) ?? 1000;
  const barPx = barM * pxPerM;

  return (
    <section id="size" className="section" style={accent(family)}>
      <div className="wrap">
        <motion.div className="section-head" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }}>
          <span className="eyebrow">Sense of scale</span>
          <h2 className="h2">
            What does <em>{empty ? "your land" : label}</em> look like?
          </h2>
          <p className="lede">Your area as a square plot, drawn to scale next to something familiar. Tap a comparison to switch.</p>
        </motion.div>

        <div className={s.layout}>
          <motion.figure
            className={`card ${s.stage}`}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <svg viewBox={`0 0 ${W} 340`} className={s.svg} role="img" aria-label={empty ? "No area entered" : `A square plot ${formatOne(side)} feet on each side beside a ${reference.name}`}>
              <defs>
                <linearGradient id="plot" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity="0.38" />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity="0.1" />
                </linearGradient>
                <pattern id="ground" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <path d="M0 0 V14" className={s.hatch} />
                </pattern>
              </defs>

              <rect x="0" y={GROUND} width={W} height={340 - GROUND} fill="url(#ground)" opacity="0.5" />
              <line x1="0" x2={W} y1={GROUND} y2={GROUND} className={s.groundLine} />

              <motion.rect
                className={s.plot}
                data-empty={empty}
                initial={false}
                animate={{ x: x0, y: GROUND - sidePx, width: sidePx, height: sidePx }}
                transition={{ type: "spring", stiffness: 90, damping: 18 }}
              />
              {!empty && (
                <motion.text
                  className={s.dim}
                  textAnchor="middle"
                  initial={false}
                  animate={{ x: x0 + sidePx / 2, y: GROUND - sidePx - 12 }}
                  transition={{ type: "spring", stiffness: 90, damping: 18 }}
                >
                  {formatOne(side)} ft
                </motion.text>
              )}
              {empty && (
                <text className={s.emptyText} x={x0 + 75} y={GROUND - 70} textAnchor="middle">
                  Enter an area
                </text>
              )}

              <g className={s.court} style={{ transform: `translate(${courtX}px, ${GROUND - refWPx}px) scale(${pxPerM})` }}>
                <AnimatePresence initial={false}>
                  <motion.g key={reference.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                    <Markings id={reference.id} />
                  </motion.g>
                </AnimatePresence>
              </g>

              {!empty && (
                <g className={s.scaleBar} style={{ transform: `translate(${PAD}px, ${GROUND + 22}px)` }}>
                  <motion.rect height="4" rx="2" initial={false} animate={{ width: barPx }} transition={{ duration: 0.6, ease: EASE }} />
                  <text y="24">{barM} m</text>
                </g>
              )}
            </svg>

            <figcaption className={s.legend}>
              <span className={s.legendItem}>
                <span className={s.swatch} />
                Your land as a square
                <strong className="tabular">{empty ? "—" : `${formatOne(side)} × ${formatOne(side)} ft`}</strong>
              </span>
              <span className={s.legendItem}>
                <span className={`${s.swatch} ${s.swatchRef}`} />
                <span className={s.capitalize}>{reference.name}</span>
                <strong className="tabular">
                  {reference.length} × {reference.width} m
                </strong>
              </span>
            </figcaption>
          </motion.figure>

          <motion.div
            className={s.side}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
          >
            <div className={`card ${s.stats}`}>
              <div className={s.stat}>
                <span className={s.statLabel}>Square plot side</span>
                <span className={`${s.statValue} tabular`}>
                  <AnimatedNumber value={side} format={formatOne} /> <small>ft</small>
                </span>
                <span className={`${s.statSub} tabular`}>
                  <AnimatedNumber value={side * 0.3048} format={formatOne} /> m
                </span>
              </div>
              <div className={s.stat}>
                <span className={s.statLabel}>Wall around it</span>
                <span className={`${s.statValue} tabular`}>
                  <AnimatedNumber value={side * 4} format={formatWholeFt} /> <small>ft</small>
                </span>
                <span className={`${s.statSub} tabular`}>
                  <AnimatedNumber value={side * 4 * 0.3048} format={formatOne} /> m of compound wall
                </span>
              </div>
            </div>

            <div className={s.listHead}>
              <span>Feels like</span>
              <AnimatePresence>
                {picked && (
                  <motion.button
                    type="button"
                    className="chip"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setPicked(null)}
                  >
                    Auto-fit
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <ul className={s.list}>
              {REFERENCES.map((r) => {
                const count = sqm / referenceSqm(r);
                const whole = count >= 1;
                const active = r.id === reference.id;
                return (
                  <li key={r.id}>
                    <motion.button type="button" className={s.item} data-active={active} aria-pressed={active} onClick={() => setPicked(r.id)} whileTap={{ scale: 0.98 }}>
                      {active && <motion.span layoutId="ref-active" className={s.itemActive} transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                      <Glyph reference={r} />
                      <span className={s.itemText}>
                        <span className={`${s.itemCount} tabular`}>
                          ≈ <AnimatedNumber value={whole ? count : count * 100} format={whole ? formatCount : formatPercent} />
                          {whole ? "" : "%"}
                        </span>{" "}
                        {whole ? r.plural : `of a ${r.name}`}
                      </span>
                      <span className={`${s.itemMeta} tabular`}>{formatArea(referenceSqm(r))} m²</span>
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
