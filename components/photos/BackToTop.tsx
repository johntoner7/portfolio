import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "1px solid rgb(var(--color-divider))",
            background: "rgb(var(--color-surface))",
            color: "rgb(var(--color-ink))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 50,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <ArrowUp size={16} strokeWidth={2} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
