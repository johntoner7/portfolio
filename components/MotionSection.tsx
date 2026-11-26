import type { ReactNode } from "react";

import { motion } from "framer-motion";

type MotionSectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/**
 * A small rise as a section scrolls in. Content is never hidden while it
 * waits: only position animates, so nothing is blank on a slow device, in a
 * screenshot, or for a reader that never scrolls.
 */
export function MotionSection({ children, className, id }: MotionSectionProps) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ y: 16 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}
