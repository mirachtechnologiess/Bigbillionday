"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import s from "./home.module.css";

const INTERVAL = 5000;
const inr = new Intl.NumberFormat("en-IN");

/** Solid colour themes (no gradients) + pattern + matching CTA / sticker colours. */
const THEMES = {
  saffron: { bg: "bg-saffron", fg: "text-white", pat: s.patStripes, pill: "bg-white/20 text-white", cta: "bg-white text-bone", sticker: "bg-sun text-bone", sub: "text-white/85" },
  teal: { bg: "bg-teal", fg: "text-white", pat: s.patDots, pill: "bg-white/20 text-white", cta: "bg-sun text-bone", sticker: "bg-sun text-bone", sub: "text-white/85" },
  crimson: { bg: "bg-crimson", fg: "text-white", pat: s.patStripes, pill: "bg-white/20 text-white", cta: "bg-white text-bone", sticker: "bg-sun text-bone", sub: "text-white/85" },
  sun: { bg: "bg-sun", fg: "text-bone", pat: s.patDotsDark, pill: "bg-bone text-white", cta: "bg-bone text-white", sticker: "bg-crimson text-white", sub: "text-bone/75" },
  forest: { bg: "bg-forest", fg: "text-white", pat: s.patChecks, pill: "bg-white/20 text-white", cta: "bg-sun text-bone", sticker: "bg-sun text-bone", sub: "text-white/85" },
  ink: { bg: "bg-bone", fg: "text-white", pat: s.patDots, pill: "bg-saffron text-white", cta: "bg-saffron text-white", sticker: "bg-sun text-bone", sub: "text-white/75" },
};

/**
 * The big discount line. The first number in the text counts up (0 → n) each time the slide becomes
 * active, while the whole line "stamps" in. SSR / no-JS render the final text.
 */
function BigBadge({ text, active, reduce }) {
  const m = String(text || "").match(/^(.*?)(\d[\d,]*)(.*)$/);
  const target = m ? Number(m[2].replace(/,/g, "")) : 0;
  const [n, setN] = useState(target);

  useEffect(() => {
    if (!m || !active || reduce) {
      setN(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = Math.min(1100, 500 + target / 4);
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target, reduce]);

  if (!m) return <span>{text}</span>;
  const pretty = m[2].includes(",") || target >= 1000 ? inr.format(n) : String(n);
  return (
    <span>
      {m[1]}
      <span className="tabular-nums">{pretty}</span>
      {m[3]}
    </span>
  );
}

const ROT = ["-5deg", "4deg", "-2deg"];

function ProductFrames({ products, theme, active }) {
  const list = products.slice(0, 3);
  const many = list.length > 1;
  return (
    <div className="relative flex h-full items-center justify-center gap-3 sm:gap-5 md:justify-end">
      {list.map((p, i) => (
        <div
          key={`${p.id}-${active}`}
          className={`${s.popIn} relative shrink-0 ${i === 1 ? "md:-translate-y-3" : ""} ${i === 2 ? "hidden sm:block" : ""}`}
          style={{ "--rot": ROT[i], animationDelay: `${0.15 + i * 0.12}s` }}
        >
          <div
            className={`relative overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.45)] ${
              many ? "size-[118px] sm:size-[150px] md:size-[170px] lg:size-[196px]" : "size-[180px] sm:size-[210px] md:size-[240px]"
            }`}
          >
            <div className="relative size-full overflow-hidden rounded-xl bg-ink-2">
              {p.image?.url ? (
                <Image
                  src={p.image.url}
                  alt={p.image.alt || p.name}
                  fill
                  draggable={false}
                  sizes="(min-width: 1024px) 200px, 150px"
                  className="object-cover"
                  placeholder={p.image.blurData ? "blur" : "empty"}
                  blurDataURL={p.image.blurData || undefined}
                />
              ) : null}
            </div>
          </div>
          {p.price ? (
            <span
              className={`${s.tagIn} ${theme.sticker} absolute -left-2 -top-3 rounded-lg px-2 py-1 text-[13px] font-extrabold leading-none shadow-md sm:text-sm`}
              style={{ animationDelay: `${0.45 + i * 0.12}s` }}
            >
              ₹{inr.format(p.price)}
              {p.mrp > p.price ? <s className="ml-1 text-[10px] font-semibold opacity-70">₹{inr.format(p.mrp)}</s> : null}
            </span>
          ) : null}
          {p.off ? (
            <span className="absolute -bottom-2 right-2 rounded-full bg-lume px-2 py-0.5 text-[10.5px] font-bold text-white shadow">{p.off}% off</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Slide({ slide, index, total, active, reduce }) {
  const theme = THEMES[slide.theme] || THEMES.saffron;
  const lead = slide.products?.[0];
  return (
    <Link
      href={slide.href || "/watches"}
      draggable={false}
      aria-label={`${slide.badge}: ${slide.title}. ${slide.cta || "Shop now"}`}
      className={`group ${s.slide} ${theme.pat} ${theme.bg} ${theme.fg} block h-[440px] w-full shrink-0 overflow-hidden sm:h-[400px] md:h-[340px] lg:h-[360px]`}
    >
      <div className="container-lux grid h-full grid-rows-[auto_1fr] items-center gap-2 py-6 md:grid-cols-[1.05fr_1fr] md:grid-rows-1 md:gap-8 md:py-0">
        {/* key forces the reveal animations to replay every time the slide becomes active */}
        <div key={`copy-${active}`} className="relative z-10 flex flex-col items-start">
          <span className={`${s.rise} ${theme.pill} rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]`}>{slide.label}</span>
          <p className={`${s.rise} mt-3 text-base font-bold sm:text-lg md:text-xl`} style={{ animationDelay: "0.08s" }}>
            {slide.title}
          </p>
          <p
            className={`${s.stamp} display mt-1 origin-left text-[clamp(2.4rem,7.4vw,4.9rem)] uppercase leading-[0.95] drop-shadow-[0_3px_0_rgb(0_0_0/0.12)]`}
            style={{ animationDelay: "0.15s" }}
          >
            <BigBadge text={slide.badge} active={active} reduce={reduce} />
          </p>
          {slide.sub ? (
            <p className={`${s.rise} ${theme.sub} mt-2 line-clamp-1 max-w-[46ch] text-sm md:text-[15px]`} style={{ animationDelay: "0.3s" }}>
              {slide.sub}
            </p>
          ) : null}
          {lead?.price && slide.products.length === 1 && lead.mrp > lead.price ? (
            <p className={`${s.rise} mt-2 flex items-baseline gap-2 text-sm font-semibold`} style={{ animationDelay: "0.38s" }}>
              <span className={`${s.strike} opacity-75`}>₹{inr.format(lead.mrp)}</span>
              <ArrowRight size={14} aria-hidden="true" className="self-center" />
              <span className="text-2xl font-extrabold">₹{inr.format(lead.price)}</span>
            </p>
          ) : null}
          <span
            className={`${s.rise} ${theme.cta} mt-4 inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold shadow-md transition-transform group-hover:translate-x-1 md:mt-5 md:h-11`}
            style={{ animationDelay: "0.42s" }}
          >
            {slide.cta || "Shop now"} <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
          </span>
        </div>

        <div className="relative h-full min-h-0 py-2 md:py-8">
          {slide.image ? (
            <div key={`img-${active}`} className={`${s.popIn} relative ml-auto h-full max-h-[300px] w-full max-w-[520px] overflow-hidden rounded-2xl bg-white/10 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.45)]`}>
              <Image src={slide.image} alt="" fill draggable={false} sizes="(min-width: 768px) 520px, 92vw" className="object-cover" priority={index === 0} />
            </div>
          ) : slide.products?.length ? (
            <ProductFrames products={slide.products} theme={theme} active={active} />
          ) : null}
        </div>
      </div>
      <span className="sr-only">
        Slide {index + 1} of {total}
      </span>
    </Link>
  );
}

/**
 * Amazon-style festival banner carousel. Auto-advances every 5s (driven by the CSS progress bar's
 * animationend, so pausing on hover/focus is exact), swipeable, keyboard + screen-reader friendly.
 */
export default function DealBanner({ slides = [] }) {
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [drag, setDrag] = useState(0);
  const drag0 = useRef(null);
  const moved = useRef(false);
  const total = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduce(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  const go = useCallback((i) => setIndex(((i % total) + total) % total), [total]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  if (!total) return null;
  const paused = hover || userPaused || reduce || total < 2;

  const onPointerDown = (e) => {
    if (total < 2 || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag0.current = { x: e.clientX, y: e.clientY, w: e.currentTarget.offsetWidth || 1 };
    moved.current = false;
  };
  const onPointerMove = (e) => {
    const d = drag0.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!moved.current && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - d.y)) moved.current = true;
    if (moved.current) setDrag(dx);
  };
  const onPointerUp = () => {
    const d = drag0.current;
    drag0.current = null;
    if (!d) return;
    if (moved.current && Math.abs(drag) > Math.min(80, d.w * 0.15)) (drag < 0 ? next : prev)();
    setDrag(0);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Today's offers"
      className={`relative select-none bg-white ${paused ? s.paused : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHover(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") next();
        else if (e.key === "ArrowLeft") prev();
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
      >
        <div
          aria-live={paused ? "polite" : "off"}
          className="flex"
          style={{
            transform: `translate3d(calc(${-index * 100}% + ${drag}px),0,0)`,
            transition: drag ? "none" : reduce ? "none" : "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {slides.map((sl, i) => (
            <div
              key={sl.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${total}`}
              aria-hidden={i !== index}
              inert={i !== index ? true : undefined}
              className="w-full shrink-0"
            >
              <Slide slide={sl} index={i} total={total} active={i === index} reduce={reduce} />
            </div>
          ))}
        </div>

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous offer"
              className="absolute left-3 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-bone shadow-lg transition hover:scale-105 hover:bg-white md:grid"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next offer"
              className="absolute right-3 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-bone shadow-lg transition hover:scale-105 hover:bg-white md:grid"
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 backdrop-blur-sm">
            {slides.map((sl, i) => (
              <button
                key={sl.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show offer ${i + 1}: ${sl.title}`}
                aria-current={i === index ? "true" : undefined}
                className={`relative h-2 overflow-hidden rounded-full transition-all duration-300 ${i === index ? "w-7 bg-white/40" : "w-2 bg-white/60 hover:bg-white"}`}
              >
                {i === index ? (
                  <span
                    key={`p-${index}`}
                    className={`${s.progress} absolute inset-0 rounded-full bg-white`}
                    style={{ animationDuration: `${INTERVAL}ms`, animationPlayState: paused ? "paused" : "running" }}
                    onAnimationEnd={next}
                  />
                ) : null}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUserPaused((v) => !v)}
              aria-label={userPaused ? "Play offers slideshow" : "Pause offers slideshow"}
              className="ml-1 grid size-5 place-items-center rounded-full text-white hover:bg-white/20"
            >
              {userPaused ? <Play size={11} fill="currentColor" aria-hidden="true" /> : <Pause size={11} fill="currentColor" aria-hidden="true" />}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
