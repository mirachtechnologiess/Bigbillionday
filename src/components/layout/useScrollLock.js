"use client";
import { useEffect } from "react";

/** Locks page scroll while an overlay is open (pair with data-lenis-prevent on the overlay). */
export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    const gap = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (gap > 0) html.style.paddingRight = `${gap}px`;
    return () => {
      html.style.overflow = prev;
      html.style.paddingRight = "";
    };
  }, [locked]);
}

export function useEscape(active, onEscape) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => e.key === "Escape" && onEscape();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onEscape]);
}
