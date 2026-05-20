"use client";

import { useEffect } from "react";

export function PwaInit() {
  useEffect(() => {
    // process.env.NODE_ENV is replaced at build time by Next.js, so this
    // branch is dead-code-eliminated in production bundles
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed:", err));
    }
  }, []);

  return null;
}
