import { useEffect, useRef, useState } from "react";

import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Counts the leading number of a stat like "170k+" or "34 years" up from zero
 * the first time it scrolls into view; whatever follows the number is left as
 * is. Anything without a leading number, or a reader who prefers reduced
 * motion, just gets the value.
 */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();
  const match = value.match(/^(\d+)(.*)$/);
  const counts = match !== null && !reduceMotion;
  const target = match ? Number(match[1]) : 0;
  const [current, setCurrent] = useState(counts ? 0 : target);

  useEffect(() => {
    if (!counts) {
      setCurrent(target);
      return;
    }
    if (!inView) return;
    const controls = animate(0, target, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setCurrent(Math.round(latest)),
    });
    return () => controls.stop();
  }, [counts, inView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {match ? `${current}${match[2]}` : value}
    </span>
  );
}
