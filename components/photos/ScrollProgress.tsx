import { useScroll, useSpring, motion } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  return (
    <motion.div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        scaleX,
        transformOrigin: "left",
        background: "rgb(var(--color-ocean))",
        zIndex: 100,
        pointerEvents: "none",
      }}
    />
  );
}
