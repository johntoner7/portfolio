import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { App } from "./App";
import { Photos } from "@/pages/Photos";

import "./index.css";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{ position: "absolute", inset: 0, minHeight: "100vh" }}
      >
        <Routes location={location}>
          <Route path="/" element={<App />} />
          <Route path="/photos" element={<Photos />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

const root = document.getElementById("root") as HTMLElement;
const loading = document.getElementById("loading");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  </React.StrictMode>,
);

if (loading) {
  loading.style.opacity = "0";
  loading.style.pointerEvents = "none";
  setTimeout(() => loading.remove(), 350);
}
