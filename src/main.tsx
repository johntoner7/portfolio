import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { App } from "./App";
import { Photos } from "@/pages/Photos";

import "./index.css";

function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-transition">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/photos" element={<Photos />} />
      </Routes>
    </div>
  );
}

const root = document.getElementById("root") as HTMLElement;
const loading = document.getElementById("loading");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>,
);

if (loading) {
  loading.style.opacity = "0";
  loading.style.pointerEvents = "none";
  setTimeout(() => loading.remove(), 350);
}
