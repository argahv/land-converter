import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { formatArea } from "../lib/format";

interface Props {
  value: number;
  /** Keep this a stable function — a new one restarts the tween. */
  format?: (n: number) => string;
  className?: string;
}

/** Tweens between values by writing text directly, so typing never re-renders the tree per frame. */
export default function AnimatedNumber({ value, format = formatArea, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const [initial] = useState(() => format(value));
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || shown.current === value) {
      shown.current = value;
      el.textContent = format(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, format, reduce]);

  return (
    <span ref={ref} className={className}>
      {initial}
    </span>
  );
}
