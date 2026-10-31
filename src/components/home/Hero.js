"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { gsap, ScrollTrigger } from "@/components/motion/gsap";
import { COLORWAYS, COLORWAY_KEYS } from "@/components/three/colorways";
import { getQuality, prefersReducedMotion } from "@/components/three/quality";
import LiveClock from "./LiveClock";
import WatchPoster from "./WatchPoster";
import s from "./home.module.css";

const WatchScene = dynamic(() => import("@/components/three/WatchScene"), { ssr: false, loading: () => null });

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Splits the admin-provided title into lines; the final word becomes the italic saffron accent. */
function HeadlineLines({ title }) {
  const lines = String(title || "Time, Engineered\nInto Art.").split("\n").filter(Boolean);
  return lines.map((line, i) => {
    const last = i === lines.length - 1;
    const words = line.trim().split(" ");
    const tail = last && words.length > 1 ? words.pop() : null;
    return (
      <span key={i} className={s.line}>
        <span className={s.lineInner} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
          {words.join(" ")}
          {tail ? (
            <>
              {" "}
              <em className={`text-gold-grad pr-[0.08em] ${s.shimmer}`}>{tail}</em>
            </>
          ) : null}
        </span>
      </span>
    );
  });
}

const CHAPTERS = [
  ["01", "Object"],
  ["02", "Anatomy"],
  ["03", "Yours"],
];

function Ctas() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/watches" className="btn btn-gold">
        Shop all watches <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </Link>
      <Link href="/watches?sale=1&sort=price-asc" className="btn btn-ghost">
        <Tag size={15} strokeWidth={2} aria-hidden="true" /> Today&apos;s deals
      </Link>
    </div>
  );
}

/**
 * HERO — white stage, procedural 3D watch. Desktop: a SHORT pinned scroll story (≈190vh) that
 * disassembles the watch. Mobile / reduced motion: no pin — just the watch and the copy.
 * Starts directly below the (solid, sticky) header. Poster SVG paints first; WebGL mounts lazily on idle.
 */
export default function Hero({ title, subtitle, storeName = "PremiumShopy" }) {
  const root = useRef(null);
  const progress = useRef(0);
  const [colorway, setColorway] = useState("steel");
  const [quality, setQuality] = useState(null);
  const [idle, setIdle] = useState(false);
  const [inView, setInView] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  // 1) Decide if/when WebGL may load: after first paint + idle, never for reduced motion / no WebGL.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const q = getQuality();
    if (!q.webgl) return;
    setQuality(q);
    let idleId = 0;
    let timer = 0;
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
    const cic = window.cancelIdleCallback || clearTimeout;
    const go = () => {
      idleId = ric(() => setIdle(true), { timeout: 2500 });
    };
    if (document.readyState === "complete") timer = setTimeout(go, 60);
    else window.addEventListener("load", go, { once: true });
    return () => {
      clearTimeout(timer);
      cic(idleId);
      window.removeEventListener("load", go);
    };
  }, []);

  // 2) Pause rendering when the hero is offscreen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "100px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (idle && inView && !mounted) setMounted(true);
  }, [idle, inView, mounted]);

  // 3) Scroll choreography — desktop only (mobile is not pinned).
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const rail = el.querySelectorAll("[data-chapter]");
        const setChapter = (p) => {
          const idx = p < 0.36 ? 0 : p < 0.78 ? 1 : 2;
          rail.forEach((n, i) => n.setAttribute("data-active", String(i === idx)));
        };
        const sync = (self) => {
          progress.current = self.progress;
          setChapter(self.progress);
        };
        // The stage pins below the sticky header, so the story starts where the stage sticks.
        const stage = el.firstElementChild;
        const start = () => `top ${parseFloat(getComputedStyle(stage).top) || 0}px`;
        ScrollTrigger.create({ trigger: el, start, end: "bottom bottom", invalidateOnRefresh: true, onUpdate: sync, onRefresh: sync });

        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: { trigger: el, start, end: "bottom bottom", scrub: 0.5, invalidateOnRefresh: true },
        });
        tl.to("[data-ch1]", { autoAlpha: 0, y: -60, duration: 0.12, ease: "power2.in" }, 0.06)
          .to("[data-cue]", { autoAlpha: 0, duration: 0.05 }, 0.02)
          .fromTo("[data-ch2]", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.44)
          .to("[data-ch2]", { autoAlpha: 0, y: -40, duration: 0.08, ease: "power2.in" }, 0.72)
          .fromTo("[data-ch3]", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.84)
          .fromTo("[data-bar]", { scaleY: 0 }, { scaleY: 1, duration: 1, ease: "none" }, 0)
          .set({}, {}, 1);
        return () => {
          progress.current = 0;
        };
      });
    }, el);
    return () => ctx.revert();
  }, []);

  const cw = COLORWAYS[colorway];

  return (
    <section ref={root} aria-label="Introduction" className="relative bg-[#fafafa] md:h-[190vh] motion-reduce:md:h-auto">
      <div
        className="relative h-[min(94svh,820px)] min-h-[600px] overflow-hidden md:sticky md:top-[var(--header-h,0px)] md:h-[calc(100svh-var(--header-h,0px))] md:min-h-[560px] motion-reduce:md:static"
      >
        {/* faint drafting rings behind the object (no gradients / particles on the white theme) */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[28%] -translate-x-1/2 -translate-y-1/2 md:left-[69%] md:top-1/2">
          <div className={`${s.rings} ${s.spin} w-[78vmin] md:w-[64vmin]`} />
        </div>

        {/* Static poster — instant paint, fades once WebGL has rendered */}
        <div
          aria-hidden="true"
          className={`${s.poster} pointer-events-none absolute left-1/2 top-[28%] h-[64svh] -translate-x-1/2 -translate-y-1/2 [mask-image:linear-gradient(to_bottom,black_70%,transparent)] md:left-[69%] md:top-1/2 md:h-[150svh] md:[mask-image:none]`}
          style={{ opacity: ready ? 0 : 1 }}
        >
          <WatchPoster colorway={colorway} className="h-full w-auto" />
        </div>

        {/* Mobile: the watch stays in the upper part (never behind the headline), strap fades at the edge */}
        {mounted && quality && (
          <div className="absolute inset-x-0 top-0 bottom-[44%] transition-opacity duration-[1200ms] [mask-image:linear-gradient(to_bottom,black_78%,transparent)] md:bottom-0 md:[mask-image:none]" style={{ opacity: ready ? 1 : 0 }}>
            <WatchScene
              progressRef={progress}
              colorway={colorway}
              active={inView}
              low={quality.low}
              mobile={quality.mobile}
              brand={storeName}
              onReady={() => setReady(true)}
            />
          </div>
        )}

        {/* Top meta row */}
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 md:top-6">
          <div className="container-lux flex items-start justify-between gap-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">
            <p className={`${s.fadeIn} hidden font-mono sm:block`} style={{ animationDelay: "0.9s" }}>
              Ref. PS-41 <span className="mx-2 text-line-2">/</span> Automatic <span className="mx-2 text-line-2">/</span> 41 mm
            </p>
            <p className={`${s.fadeIn} ml-auto rounded-full border border-line bg-white px-3 py-1.5 text-bone-2 shadow-sm`} style={{ animationDelay: "1s" }}>
              <LiveClock />
            </p>
          </div>
        </div>

        {/* Chapter rail (desktop) */}
        <ol aria-hidden="true" className="absolute right-[clamp(16px,3vw,48px)] top-1/2 z-10 hidden -translate-y-1/2 items-center gap-6 md:flex motion-reduce:md:hidden">
          <li className="relative h-32 w-px bg-line-2">
            <span data-bar className="absolute inset-0 origin-top scale-y-0 bg-gold" />
          </li>
          <li className="flex flex-col gap-4">
            {CHAPTERS.map(([n, label], i) => (
              <span
                key={n}
                data-chapter
                data-active={i === 0 ? "true" : "false"}
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-mute transition-colors duration-500 data-[active=true]:text-gold"
              >
                {n} <span className="ml-1 text-bone-2/70">{label}</span>
              </span>
            ))}
          </li>
        </ol>

        {/* CHAPTER 1 — the headline */}
        <div data-ch1 className="absolute inset-x-0 bottom-0 z-10 pb-[clamp(24px,5vh,64px)]">
          <div className="container-lux">
            <p className={`eyebrow ${s.fadeIn} mb-4 flex items-center gap-3`} style={{ animationDelay: "0.05s" }}>
              <span className="h-[2px] w-8 rounded bg-gold" aria-hidden="true" />
              New season · Cash on Delivery
            </p>
            <h1 className="display-serif max-w-[14ch] text-[clamp(2.7rem,6.4vw,6.75rem)] text-bone">
              <HeadlineLines title={title} />
            </h1>
            <div className="mt-6 flex flex-col gap-5 md:mt-8">
              {subtitle ? (
                <p className={`${s.fadeIn} max-w-[40ch] text-[15px] leading-relaxed text-bone-2 md:text-base`} style={{ animationDelay: "0.55s" }}>
                  {subtitle}
                </p>
              ) : null}
              <div className={s.fadeIn} style={{ animationDelay: "0.7s" }}>
                <Ctas />
              </div>
            </div>
          </div>
        </div>

        {/* CHAPTER 2 — anatomy (explode) — desktop scroll story only */}
        <div data-ch2 className="invisible absolute inset-x-0 bottom-0 z-10 hidden pb-[clamp(28px,7vh,72px)] opacity-0 md:block">
          <div className="container-lux">
            <p className="eyebrow mb-3 flex items-center gap-3">
              <span className="h-[2px] w-8 rounded bg-gold" aria-hidden="true" />
              Anatomy
            </p>
            <h2 className="display-serif text-[clamp(2.2rem,4.6vw,4.5rem)] text-bone">
              Seven layers.
              <br />
              <em className="text-gold-grad">One heartbeat.</em>
            </h2>
            <p className="mt-4 max-w-[44ch] text-sm leading-relaxed text-bone-2 md:text-[15px]">
              Crystal, bezel, dial, movement and strap. Every watch is quality checked before it ships, so what reaches you looks just like the photos.
            </p>
          </div>
        </div>

        {/* CHAPTER 3 — settle */}
        <div data-ch3 className="invisible absolute inset-x-0 top-1/2 z-10 hidden -translate-y-1/2 opacity-0 md:block">
          <div className="container-lux">
            <div className="max-w-xl">
              <p className="eyebrow mb-3 flex items-center gap-3">
                <span className="h-[2px] w-8 rounded bg-gold" aria-hidden="true" />
                Yours
              </p>
              <h2 className="display-serif text-[clamp(2.2rem,4.4vw,4.4rem)] text-bone">
                Built to be worn.
                <br />
                <em className="text-gold-grad">Paid at your door.</em>
              </h2>
              <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-bone-2 md:text-[15px]">
                Securely packed, delivered across India, and you pay cash only when it arrives. Easy 7-day returns.
              </p>
              <div className="mt-6">
                <Ctas />
              </div>
            </div>
          </div>
        </div>

        {/* Finish switcher */}
        <div
          className={`${s.fadeIn} absolute right-[clamp(16px,4vw,56px)] top-14 z-20 flex items-center gap-3 md:top-[calc(50%+7.5rem)]`}
          style={{ animationDelay: "1.2s" }}
        >
          <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-mute sm:inline">Finish</span>
          <div role="group" aria-label="Watch finish" className="flex items-center gap-1.5 rounded-full border border-line bg-white p-1 shadow-sm">
            {COLORWAY_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={colorway === k}
                aria-label={`${COLORWAYS[k].label} finish`}
                title={COLORWAYS[k].label}
                onClick={() => setColorway(k)}
                className="grid size-7 place-items-center rounded-full transition-[box-shadow] duration-300 aria-pressed:shadow-[0_0_0_2px_var(--color-gold)]"
              >
                <span className="size-4 rounded-full ring-1 ring-black/10" style={{ background: COLORWAYS[k].swatch }} />
              </button>
            ))}
          </div>
          <span className="sr-only" aria-live="polite">
            {cw.label} finish selected
          </span>
        </div>

        {/* Scroll cue (desktop) */}
        <div data-cue aria-hidden="true" className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex motion-reduce:lg:hidden">
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.26em] text-mute">Scroll to explore</span>
          <span className={s.cue} />
        </div>
      </div>
    </section>
  );
}
