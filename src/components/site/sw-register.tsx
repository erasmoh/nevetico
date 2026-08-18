"use client";

import { useEffect } from "react";

/**
 * Registra el service worker en producción. En dev lo skip-eamos para no
 * cachear rutas stale durante el desarrollo.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sw] registration failed:", err);
    });
  }, []);
  return null;
}
