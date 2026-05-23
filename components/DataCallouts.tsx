"use client";

import { useEffect, useRef, useState } from "react";

import { useInView } from "framer-motion";

import { MotionSection } from "@/components/MotionSection";
import { siteData } from "@/lib/data";

function AnimatedStat({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, amount: 0.7 });

  useEffect(() => {
    if (!isInView) {
      return;
    }

    const duration = 1500;
    const startedAt = performance.now();
    let animationFrameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [isInView, value]);

  return (
    <div ref={ref} className="rounded-2xl border border-divider bg-page/60 p-6 text-center">
      <p className="text-4xl font-semibold text-ocean sm:text-5xl">
        {new Intl.NumberFormat("en-GB").format(displayValue)}{suffix}
      </p>
      <p className="mt-3 text-sm uppercase tracking-[0.24em] text-muted">{label}</p>
    </div>
  );
}

export function DataCallouts() {
  return (
    <MotionSection className="rounded-3xl border border-divider bg-surface/70 p-6 shadow-glow sm:p-8" delay={0.24}>
      <div className="grid gap-4 md:grid-cols-3">
        {siteData.stats.map((stat) => (
          <AnimatedStat key={stat.label} value={stat.value} suffix={stat.suffix} label={stat.label} />
        ))}
      </div>
    </MotionSection>
  );
}
