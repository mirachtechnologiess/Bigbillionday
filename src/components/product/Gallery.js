"use client";
import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_SIZES = "(min-width: 1280px) 44vw, (min-width: 1024px) 46vw, 100vw";

function Slide({ img, alt, priority }) {
  const [zoom, setZoom] = useState(false);
  const imgRef = useRef(null);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (imgRef.current) imgRef.current.style.transformOrigin = `${x}% ${y}%`;
  };

  return (
    <div
      className="relative aspect-square w-full shrink-0 snap-center overflow-hidden bg-white [@media(hover:hover)_and_(min-width:1024px)]:cursor-zoom-in"
      onMouseEnter={(e) => {
        if (!window.matchMedia("(hover: hover) and (min-width: 1024px)").matches) return;
        setZoom(true);
        onMove(e);
      }}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={zoom ? onMove : undefined}
    >
      <Image
        ref={imgRef}
        src={img.url}
        alt={img.alt || alt}
        fill
        sizes={MAIN_SIZES}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        quality={88}
        placeholder={img.blurData ? "blur" : "empty"}
        blurDataURL={img.blurData || undefined}
        draggable={false}
        className={cn("select-none object-contain transition-transform duration-300 ease-lux", zoom ? "scale-[2]" : "scale-100")}
      />
    </div>
  );
}

/** Product gallery: scroll-snap swipe track (mobile), thumbnail rail + hover zoom (desktop). */
export default function Gallery({ images = [], alt = "", badge }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const count = images.length;

  const goTo = useCallback((i) => {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(i, el.children.length - 1));
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }, []);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };

  if (!count) {
    return (
      <div className="grid aspect-square place-items-center rounded-xl border border-line bg-ink-2">
        <span className="text-[13px] text-mute">Image coming soon</span>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[64px_1fr] lg:gap-3">
      {/* thumbs (desktop) */}
      {count > 1 && (
        <ul className="hidden max-h-[calc(100dvh-var(--header-h)-2rem)] flex-col gap-2 overflow-y-auto lg:flex [scrollbar-width:none]" aria-label="Choose image">
          {images.map((img, i) => (
            <li key={img.url + i}>
              <button
                type="button"
                onClick={() => goTo(i)}
                onMouseEnter={() => goTo(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={active === i}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-white transition-colors",
                  active === i ? "border-gold" : "border-line hover:border-line-2"
                )}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={cn("relative", count === 1 && "lg:col-span-2")}>
        <div className="-mx-[clamp(16px,4vw,56px)] overflow-hidden border-y border-line bg-white sm:mx-0 sm:rounded-xl sm:border">
          <div
            ref={trackRef}
            onScroll={onScroll}
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="region"
            aria-roledescription="carousel"
            aria-label={`${alt} images`}
          >
            {images.map((img, i) => (
              <Slide key={img.url + i} img={img} alt={`${alt} — view ${i + 1}`} priority={i === 0} />
            ))}
          </div>
        </div>

        {badge && <div className="pointer-events-none absolute left-3 top-3">{badge}</div>}

        {count > 1 && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5 lg:hidden">
              {images.map((_, i) => (
                <span key={i} className={cn("h-[3px] rounded-full transition-all duration-500 ease-lux", active === i ? "w-5 bg-gold" : "w-1.5 bg-bone/25")} />
              ))}
            </div>
            <div className="absolute bottom-3 right-3 hidden items-center gap-2 lg:flex">
              <span className="mr-1 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-semibold text-bone-2 shadow-sm">
                {active + 1} / {count}
              </span>
              <button
                type="button"
                onClick={() => goTo(active - 1)}
                disabled={active === 0}
                aria-label="Previous image"
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white shadow-md transition-colors hover:text-gold-2 disabled:opacity-30"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => goTo(active + 1)}
                disabled={active === count - 1}
                aria-label="Next image"
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white shadow-md transition-colors hover:text-gold-2 disabled:opacity-30"
              >
                <ArrowRight size={16} strokeWidth={2} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
