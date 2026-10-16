"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";

/**
 * Inertial smooth scroll (Lenis) driven by the GSAP ticker so ScrollTrigger and Lenis share one clock.
 * Light touch (lerp 0.12) and only on the home page (scroll-driven hero); shop pages keep native scroll.
 * Touch devices keep native scroll (syncTouch: false). Fully disabled for prefers-reduced-motion.
 * The instance is exposed as window.__lenis (e.g. drawers can call __lenis.stop()/start()).
 */
export default function SmoothScroll() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis = null;
    let tick = null;

    const start = () => {
      if (lenis || mq.matches || !isHome) return;
      lenis = new Lenis({ lerp: 0.12, smoothWheel: true, syncTouch: false, autoRaf: false });
      window.__lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time) => lenis && lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    };

    const stop = () => {
      if (tick) gsap.ticker.remove(tick);
      tick = null;
      if (lenis) lenis.destroy();
      lenis = null;
      if (window.__lenis) delete window.__lenis;
      gsap.ticker.lagSmoothing(500, 33);
    };

    const onChange = () => (mq.matches ? stop() : start());
    start();
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      stop();
    };
  }, [isHome]);

  // Reset to top on route change (Lenis-aware), then let ScrollTrigger re-measure the new page.
  useEffect(() => {
    if (window.location.hash) return;
    const lenis = window.__lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
