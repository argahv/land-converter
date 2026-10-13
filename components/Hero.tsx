import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { formatArea } from "../lib/format";
import { fromSqft, UNITS } from "../lib/land";
import { useIsClient } from "../lib/useIsClient";
import { ArrowDownIcon } from "./Icons";
import s from "../styles/Hero.module.css";

type Pt = [number, number];

const f = (n: number) => n.toFixed(1);

/** Closed Catmull-Rom curve through the points, as cubic Béziers. */
function smoothClosed(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

/** Concentric, slightly drifting rings — a hill as a survey map draws it. */
function hill(cx: number, cy: number, rings: number, start: number, gap: number, seed: number): string[] {
  return Array.from({ length: rings }, (_, i) => {
    const r = start + i * gap;
    const sd = seed + i * 0.21;
    const pts: Pt[] = Array.from({ length: 40 }, (_, j) => {
      const t = (j / 40) * Math.PI * 2;
      const k = 1 + 0.09 * Math.sin(3 * t + sd) + 0.05 * Math.sin(5 * t + sd * 1.9) + 0.03 * Math.cos(2 * t - sd);
      return [cx + i * 3 + Math.cos(t) * r * k, cy - i * 2 + Math.sin(t) * r * k * 0.84];
    });
    return smoothClosed(pts);
  });
}

const ART_RINGS = hill(300, 300, 11, 26, 25, 1.2);
const FIELD_RINGS = [...hill(1180, 240, 12, 40, 38, 3.1), ...hill(160, 820, 9, 40, 40, 5.4)];

const PARCEL: Pt[] = [
  [188, 196],
  [432, 222],
  [414, 428],
  [166, 398],
];
const PARCEL_PATH = `M${PARCEL.map((p) => p.join(" ")).join("L")}Z`;

const ROPANI = UNITS.ropani.sqft;
const FACTS = [
  "16 Aana",
  "64 Paisa",
  "256 Daam",
  `${formatArea(ROPANI)} ft²`,
  `${formatArea(fromSqft(ROPANI, "sqm"))} m²`,
  `${formatArea(fromSqft(ROPANI, "kattha"))} Kattha`,
  "74 × 74 ft",
];

const TITLE = ["Your", "land,"];
const TITLE_ACCENT = ["in", "every", "unit."];

const rise = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: 0.15 + i * 0.08, duration: 0.9, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const isClient = useIsClient();
  const [fact, setFact] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setFact((i) => (i + 1) % FACTS.length), 2200);
    return () => window.clearInterval(id);
  }, []);

  // Pointer parallax: the art tilts toward the pointer, with layers moving at different depths.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18 });
  const sy = useSpring(py, { stiffness: 60, damping: 18 });
  const rotateY = useTransform(sx, [-1, 1], [-9, 9]);
  const rotateX = useTransform(sy, [-1, 1], [7, -7]);
  const ringsX = useTransform(sx, [-1, 1], [-14, 14]);
  const ringsY = useTransform(sy, [-1, 1], [-10, 10]);
  const parcelX = useTransform(sx, [-1, 1], [8, -8]);
  const parcelY = useTransform(sy, [-1, 1], [6, -6]);
  const fieldX = useTransform(sx, [-1, 1], [18, -18]);
  const fieldY = useTransform(sy, [-1, 1], [12, -12]);

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    py.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <header
      ref={ref}
      className={s.hero}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <div className={s.glow} aria-hidden />
      <motion.svg className={s.field} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden style={{ x: fieldX, y: fieldY }}>
        {isClient &&
          FIELD_RINGS.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              className={i % 4 === 0 ? s.fieldIndex : s.fieldRing}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2.4, delay: 0.2 + i * 0.05, ease: "easeInOut" }}
            />
          ))}
      </motion.svg>

      <motion.div className={`wrap ${s.inner}`} style={{ y: contentY, opacity: contentOpacity }}>
        <div className={s.copy}>
          <motion.p className={s.kicker} initial="hidden" animate="show" custom={0} variants={rise}>
            <span className="deva">जग्गा नापी</span>
            <span className={s.kickerDot} />
            Nepal land units
          </motion.p>
          <h1 className={s.title}>
            {TITLE.map((word, i) => (
              <motion.span key={word} className={s.word} initial="hidden" animate="show" custom={i + 1} variants={rise}>
                {word}
              </motion.span>
            ))}
            <br />
            {TITLE_ACCENT.map((word, i) => (
              <motion.em key={word} className={s.word} initial="hidden" animate="show" custom={i + 1 + TITLE.length} variants={rise}>
                {word}
              </motion.em>
            ))}
          </h1>
          <motion.p className={s.lede} initial="hidden" animate="show" custom={7} variants={rise}>
            Convert Ropani–Aana–Paisa–Daam and Bigha–Kattha–Dhur to square feet, square metres, acres and hectares. Instantly, exactly, and with a picture of how big the land really is.
          </motion.p>
          <motion.div className={s.actions} initial="hidden" animate="show" custom={8} variants={rise}>
            <motion.a href="#convert" className="btn btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
              Start converting <ArrowDownIcon />
            </motion.a>
            <motion.a href="#anatomy" className="btn" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
              How the units nest
            </motion.a>
          </motion.div>
          <motion.ul className={s.facts} initial="hidden" animate="show" custom={9} variants={rise}>
            <li>
              <span style={{ background: "var(--ropani)" }} /> Hills · Ropani
            </li>
            <li>
              <span style={{ background: "var(--bigha)" }} /> Terai · Bigha
            </li>
            <li>
              <span style={{ background: "var(--metric)" }} /> Exact: 1 ft = 0.3048 m
            </li>
          </motion.ul>
        </div>

        <motion.div
          className={s.art}
          style={{ rotateX, rotateY, transformPerspective: 1200 }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          <svg viewBox="0 0 600 600" className={s.artSvg}>
            <defs>
              <linearGradient id="scan" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--ropani)" stopOpacity="0" />
                <stop offset="0.85" stopColor="var(--ropani)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--ropani)" stopOpacity="0.9" />
              </linearGradient>
              <radialGradient id="parcelFill" cx="0.4" cy="0.35" r="0.8">
                <stop offset="0" stopColor="var(--ropani)" stopOpacity="0.22" />
                <stop offset="1" stopColor="var(--ropani)" stopOpacity="0.04" />
              </radialGradient>
              <clipPath id="parcelClip">
                <path d={PARCEL_PATH} />
              </clipPath>
            </defs>

            <motion.g style={{ x: ringsX, y: ringsY }}>
              {isClient &&
                ART_RINGS.map((d, i) => (
                  <motion.path
                    key={i}
                    d={d}
                    className={i % 4 === 3 ? s.ringIndex : s.ring}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.6, delay: 0.1 + i * 0.07, ease: "easeInOut" }}
                  />
                ))}
            </motion.g>

            <motion.g style={{ x: parcelX, y: parcelY }}>
              <motion.path
                d={PARCEL_PATH}
                fill="url(#parcelFill)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
              />
              <g clipPath="url(#parcelClip)">
                <rect className={s.scan} x="150" y="120" width="300" height="80" fill="url(#scan)" />
              </g>
              <motion.path
                d={PARCEL_PATH}
                className={s.parcel}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.9, duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
              />
              <motion.path
                d="M310 209 L290 413"
                className={s.split}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 2, duration: 0.9 }}
              />
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 0.8 }}>
                <text className={s.dim} x="310" y="194" transform="rotate(6 310 194)" textAnchor="middle">
                  74 ft
                </text>
                <text className={s.dim} x="151" y="300" transform="rotate(-84 151 300)" textAnchor="middle">
                  74 ft
                </text>
              </motion.g>
              {PARCEL.map(([x, y], i) => (
                <motion.g
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.6 + i * 0.12, type: "spring", stiffness: 300, damping: 14 }}
                >
                  <circle cx={x} cy={y} r="14" className={s.pulse} style={{ animationDelay: `${i * 0.6}s` }} />
                  <circle cx={x} cy={y} r="5.5" className={s.point} />
                </motion.g>
              ))}
            </motion.g>

            <motion.g className={s.north} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.4 }}>
              <path d="M540 52 L550 80 L540 74 L530 80 Z" />
              <text x="540" y="44" textAnchor="middle">
                N
              </text>
            </motion.g>
          </svg>

          <motion.div className={s.badge} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.3, duration: 0.7 }}>
            <span className={s.badgeLabel}>
              1 Ropani <span className="deva">१ रोपनी</span>
            </span>
            <span className={s.badgeValue}>
              <span className={s.eq}>=</span>
              <span className={s.ticker}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={fact}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {FACTS[fact]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </span>
          </motion.div>

          <motion.div className={s.coords} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>
            27.7172° N · 85.3240° E
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.a href="#convert" className={s.cue} aria-label="Scroll to converter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }}>
        <span />
      </motion.a>
    </header>
  );
}
