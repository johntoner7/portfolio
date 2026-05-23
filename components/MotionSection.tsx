import type { ReactNode } from "react";

import { motion } from "framer-motion";

type MotionSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
};

export function MotionSection({ children, className, delay = 0, id }: MotionSectionProps) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}