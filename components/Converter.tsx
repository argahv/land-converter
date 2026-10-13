import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { accent } from "../lib/accent";
import { describe, formatArea, formatFixed, formatWhole } from "../lib/format";
import {
  breakdown,
  FAMILIES,
  fromSqft,
  parseAmount,
  SYSTEM_ORDER,
  SYSTEMS,
  UNITS,
  type Family,
  type SystemId,
  type UnitId,
} from "../lib/land";
import { useCopy } from "../lib/useCopy";
import { toQuery, type Land } from "../lib/useLand";
import AnimatedNumber from "./AnimatedNumber";
import { CheckIcon, CopyIcon, LinkIcon, MinusIcon, PlusIcon, ResetIcon, SparkIcon } from "./Icons";
import s from "../styles/Converter.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

const PRESETS: { unit: UnitId; system: SystemId }[] = [
  { unit: "ropani", system: "ropani" },
  { unit: "aana", system: "ropani" },
  { unit: "bigha", system: "bigha" },
  { unit: "kattha", system: "bigha" },
  { unit: "dhur", system: "bigha" },
  { unit: "hectare", system: "hectare" },
  { unit: "acre", system: "acre" },
];

const STEP: Partial<Record<UnitId, number>> = { sqft: 10, acre: 0.1, hectare: 0.1 };

const formatTwo = (n: number) => formatFixed(n, 2);

function definition(unit: UnitId): string {
  switch (unit) {
    case "sqft":
      return `1 ft² = ${formatArea(fromSqft(1, "sqm"))} m²`;
    case "sqm":
      return `1 m² = ${formatArea(UNITS.sqm.sqft)} ft²`;
    case "hectare":
      return `1 ha = 10,000 m² ≈ ${formatArea(fromSqft(UNITS.hectare.sqft, "ropani"))} Ropani`;
    case "acre":
      return `1 acre = 43,560 ft² ≈ ${formatArea(fromSqft(UNITS.acre.sqft, "ropani"))} Ropani`;
    default:
      return `1 ${UNITS[unit].name} = ${formatArea(UNITS[unit].sqft)} ft²`;
  }
}

/** The largest unit of a system that is at least 1, so totals read as "13.3 Ropani" not "0.07 Bigha". */
function headlineUnit(sqft: number, system: SystemId): UnitId {
  const units = SYSTEMS[system].units;
  return units.find((u) => fromSqft(sqft, u) >= 1) ?? units[units.length - 1];
}

// ---------- Input side ----------

function SystemTabs({ value, onChange }: { value: SystemId; onChange: (id: SystemId) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + SYSTEM_ORDER.length) % SYSTEM_ORDER.length;
    onChange(SYSTEM_ORDER[next]);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Measured in" className={s.tabs}>
      {SYSTEM_ORDER.map((id, i) => {
        const active = id === value;
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={active}
            aria-controls="convert-fields"
            tabIndex={active ? 0 : -1}
            className={s.tab}
            data-active={active}
            style={accent(SYSTEMS[id].family)}
            onClick={() => onChange(id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {active && <motion.span layoutId="system-pill" className={s.pill} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className={s.tabLabel}>{SYSTEMS[id].label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Press and hold to keep stepping, like a physical counter. */
function useRepeat(action: () => void) {
  const delay = useRef<number | undefined>(undefined);
  const repeat = useRef<number | undefined>(undefined);

  const stop = useCallback(() => {
    window.clearTimeout(delay.current);
    window.clearInterval(repeat.current);
  }, []);

  useEffect(() => stop, [stop]);

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      action();
      stop();
      delay.current = window.setTimeout(() => {
        repeat.current = window.setInterval(action, 70);
      }, 420);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    // Keyboard activation only; pointer presses are handled above.
    onClick: (e: MouseEvent) => {
      if (e.detail === 0) action();
    },
  };
}

function StepButton({ label, onStep, children }: { label: string; onStep: () => void; children: ReactNode }) {
  const handlers = useRepeat(onStep);
  return (
    <motion.button type="button" className={s.step} aria-label={label} whileTap={{ scale: 0.86 }} {...handlers}>
      {children}
    </motion.button>
  );
}

const fieldVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

interface FieldProps {
  unit: UnitId;
  value: string;
  large: boolean;
  onChange: (unit: UnitId, raw: string) => void;
  onStep: (unit: UnitId, delta: number) => void;
}

function Field({ unit, value, large, onChange, onStep }: FieldProps) {
  const id = useId();
  const info = UNITS[unit];
  const amount = parseAmount(value);
  const step = STEP[unit] ?? 1;
  const hint = amount > 0 && !large ? `= ${formatArea(amount * info.sqft)} ft²` : definition(unit);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      onStep(unit, e.key === "ArrowUp" ? step : -step);
    }
  };

  return (
    <motion.div className={s.field} data-large={large} data-filled={amount > 0} variants={fieldVariants}>
      <label htmlFor={id} className={s.fieldLabel}>
        <span>{info.name}</span>
        <span className="deva">{info.nepali}</span>
      </label>
      <div className={s.control}>
        <StepButton label={`Decrease ${info.name}`} onStep={() => onStep(unit, -step)}>
          <MinusIcon />
        </StepButton>
        <input
          id={id}
          className={`${s.input} tabular`}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          value={value}
          aria-describedby={`${id}-hint`}
          onChange={(e) => onChange(unit, e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={(e) => e.target.select()}
        />
        <StepButton label={`Increase ${info.name}`} onStep={() => onStep(unit, step)}>
          <PlusIcon />
        </StepButton>
      </div>
      <p id={`${id}-hint`} className={`${s.hint} tabular`}>
        {hint}
      </p>
    </motion.div>
  );
}

/** Animates its height to fit the content, so switching systems resizes smoothly. */
function AutoHeight({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0].blockSize));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div className={s.autoHeight} animate={{ height }} transition={{ duration: 0.45, ease: EASE }}>
      <div ref={inner} className={s.autoHeightInner}>
        {children}
      </div>
    </motion.div>
  );
}

// ---------- Results side ----------

function CopyButton({ label, copied, onCopy }: { label: string; copied: boolean; onCopy: () => void }) {
  return (
    <motion.button type="button" className={s.copy} onClick={onCopy} whileTap={{ scale: 0.88 }} aria-label={label} data-copied={copied}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "done" : "copy"}
          className={s.copyIcon}
          initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </motion.span>
      </AnimatePresence>
      <span className={s.copyText}>{copied ? "Copied" : "Copy"}</span>
    </motion.button>
  );
}

interface CardProps {
  family: Family;
  index: number;
  source: boolean;
  empty: boolean;
  changeKey: number;
  copyText: string;
  copied: boolean;
  onCopy: (key: string, text: string) => void;
  children: ReactNode;
}

function ResultCard({ family, index, source, empty, changeKey, copyText, copied, onCopy, children }: CardProps) {
  const info = FAMILIES[family];
  return (
    <motion.article
      className={`card ${s.result}`}
      data-source={source}
      data-empty={empty}
      style={accent(family)}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.08, duration: 0.7, ease: EASE }}
    >
      <span key={changeKey} className={s.sheen} aria-hidden />
      <header className={s.resultHead}>
        <span className={s.dot} aria-hidden />
        <div className={s.resultTitle}>
          <h3>{info.name}</h3>
          <p className="deva">{info.nepali}</p>
        </div>
        {source ? (
          <motion.span layoutId="source-badge" className={s.badge} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
            Your input
          </motion.span>
        ) : (
          <span className={s.where}>{info.where}</span>
        )}
      </header>
      <div className={s.resultBody}>{children}</div>
      <footer className={s.resultFoot}>
        <CopyButton label={`Copy ${info.name} value`} copied={copied} onCopy={() => onCopy(family, copyText)} />
      </footer>
    </motion.article>
  );
}

function Results({ sqft, system }: { sqft: number; system: SystemId }) {
  const { copied, copy } = useCopy();
  const sourceFamily = SYSTEMS[system].family;
  const empty = sqft <= 0;
  const changeKey = Math.round(sqft * 1000);

  const compound = (sys: "ropani" | "bigha", index: number) => {
    const parts = breakdown(sqft, sys);
    const total = headlineUnit(sqft, sys);
    const totalValue = fromSqft(sqft, total);
    return (
      <ResultCard
        family={sys}
        index={index}
        source={sourceFamily === sys}
        empty={empty}
        changeKey={changeKey}
        copyText={`${describe(sqft, sys)} (${formatArea(totalValue)} ${UNITS[total].symbol})`}
        copied={copied === sys}
        onCopy={copy}
      >
        <div className={s.parts} data-count={parts.length}>
          {parts.map((p, i) => (
            <div key={p.unit} className={s.part} data-zero={p.value === 0}>
              <AnimatedNumber className={`${s.partValue} tabular`} value={p.value} format={i === parts.length - 1 ? formatTwo : formatWhole} />
              <span className={s.partUnit}>{UNITS[p.unit].name}</span>
            </div>
          ))}
        </div>
        <p className={`${s.total} tabular`}>
          = <AnimatedNumber value={totalValue} /> {UNITS[total].name} in total
        </p>
      </ResultCard>
    );
  };

  const single = (family: "metric" | "imperial", primary: UnitId, secondary: UnitId, index: number) => {
    const main = fromSqft(sqft, primary);
    const second = fromSqft(sqft, secondary);
    return (
      <ResultCard
        family={family}
        index={index}
        source={sourceFamily === family}
        empty={empty}
        changeKey={changeKey}
        copyText={`${formatArea(main)} ${UNITS[primary].symbol} (${formatArea(second)} ${UNITS[secondary].symbol})`}
        copied={copied === family}
        onCopy={copy}
      >
        <div className={s.big}>
          <AnimatedNumber className={`${s.bigValue} tabular`} value={main} />
          <span className={s.bigUnit}>{UNITS[primary].symbol}</span>
        </div>
        <p className={`${s.total} tabular`}>
          = <AnimatedNumber value={second} /> {UNITS[secondary].name.toLowerCase()}
        </p>
      </ResultCard>
    );
  };

  return (
    <div className={s.results}>
      <p className="sr-only" aria-live="polite">
        {empty ? "" : `${describe(sqft, "ropani")}; ${describe(sqft, "bigha")}; ${describe(sqft, "sqm")}; ${describe(sqft, "sqft")}`}
      </p>
      {compound("ropani", 0)}
      {compound("bigha", 1)}
      {single("metric", "sqm", "hectare", 2)}
      {single("imperial", "sqft", "acre", 3)}
    </div>
  );
}

// ---------- Section ----------

export default function Converter({ land }: { land: Land }) {
  const { system, inputs, sqft, normalized } = land;
  const family = SYSTEMS[system].family;
  const units = SYSTEMS[system].units;
  const { copied, copy } = useCopy(2000);
  const [spins, setSpins] = useState(0);

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}${toQuery(system, inputs)}`;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "Land area", text: describe(sqft, system), url });
        return;
      } catch {
        // Cancelled or unsupported — fall back to copying.
      }
    }
    await copy("link", url);
  };

  const copyAll = () =>
    copy(
      "all",
      [describe(sqft, "ropani"), describe(sqft, "bigha"), describe(sqft, "sqm"), describe(sqft, "sqft"), describe(sqft, "acre"), describe(sqft, "hectare")].join("\n"),
    );

  return (
    <section id="convert" className="section" style={accent(family)}>
      <div className="wrap">
        <motion.div className="section-head" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }}>
          <span className="eyebrow">Converter</span>
          <h2 className="h2">
            Enter the area from your <em>Lalpurja</em>
          </h2>
          <p className="lede">Type in any system and every other one updates as you go. Hold + or − to count quickly; arrow keys work too.</p>
        </motion.div>

        <div className={s.layout}>
          <motion.div
            className={`card ${s.panel}`}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className={s.panelHead}>
              <span className={s.panelLabel}>Measured in</span>
              <span className={s.region}>
                <span className={s.regionDot} />
                {FAMILIES[family].where}
              </span>
            </div>
            <SystemTabs value={system} onChange={land.switchSystem} />

            <AutoHeight>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={system}
                  id="convert-fields"
                  role="tabpanel"
                  aria-labelledby={`tab-${system}`}
                  className={s.fields}
                  data-count={units.length}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  variants={{ show: { transition: { staggerChildren: 0.05 } }, exit: { transition: { duration: 0.12 } } }}
                >
                  {units.map((unit) => (
                    <Field key={unit} unit={unit} value={inputs[unit] ?? ""} large={units.length === 1} onChange={land.setField} onStep={land.step} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </AutoHeight>

            <AnimatePresence initial={false}>
              {!normalized && sqft > 0 && (
                <motion.div
                  className={s.tidy}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <div className={s.tidyInner}>
                    <SparkIcon />
                    <span>
                      That&apos;s <strong>{describe(sqft, system)}</strong>
                    </span>
                    <button type="button" className="chip" onClick={land.tidy}>
                      Tidy up
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={s.actions}>
              <motion.button
                type="button"
                className="btn"
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSpins((n) => n + 1);
                  land.reset();
                }}
              >
                <motion.span className={s.btnIcon} animate={{ rotate: -360 * spins }} transition={{ duration: 0.6, ease: EASE }}>
                  <ResetIcon />
                </motion.span>
                Reset
              </motion.button>
              <motion.button type="button" className="btn" whileTap={{ scale: 0.95 }} onClick={share} disabled={sqft <= 0}>
                {copied === "link" ? <CheckIcon /> : <LinkIcon />}
                {copied === "link" ? "Link copied" : "Share"}
              </motion.button>
              <motion.button type="button" className="btn" whileTap={{ scale: 0.95 }} onClick={copyAll} disabled={sqft <= 0}>
                {copied === "all" ? <CheckIcon /> : <CopyIcon />}
                {copied === "all" ? "Copied" : "Copy all"}
              </motion.button>
            </div>

            <div className={s.presets}>
              <span className={s.presetsLabel}>Try</span>
              {PRESETS.map(({ unit, system: target }) => (
                <motion.button
                  key={unit}
                  type="button"
                  className="chip"
                  style={accent(SYSTEMS[target].family)}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => land.load(UNITS[unit].sqft, target)}
                >
                  1 {UNITS[unit].name}
                </motion.button>
              ))}
            </div>
          </motion.div>

          <Results sqft={sqft} system={system} />
        </div>
      </div>
    </section>
  );
}
