"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, MousePointerClick } from "lucide-react";
import { Modal } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/** Shared bits for the catalog CRUD sections (brands / categories / collections / banners). */

export function useIsDesktop(query = "(min-width: 1024px)") {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const m = window.matchMedia(query);
    const f = () => setOk(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [query]);
  return ok;
}

/** Editor that docks on the right on desktop and becomes a bottom-sheet modal on mobile. */
export function SplitEditor({ open, title, subtitle, onClose, footer, children, emptyText = "Select an item to edit", isDesktop }) {
  if (!isDesktop) {
    return (
      <Modal open={open} onClose={onClose} title={title} footer={footer} width={640}>
        {children}
      </Modal>
    );
  }
  return (
    <aside className="sticky top-4 self-start">
      {open ? (
        <section className="a-card flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden">
          <header className="a-card-h">
            <div className="min-w-0">
              <div className="a-card-t truncate">{title}</div>
              {subtitle && <div className="truncate text-[11.5px] text-mute">{subtitle}</div>}
            </div>
            <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={onClose}>
              Close <span className="a-kbd">Esc</span>
            </button>
          </header>
          <div className="overflow-y-auto p-4">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line p-3">{footer}</div>}
        </section>
      ) : (
        <div className="a-dots flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-line-2 p-8 text-center">
          <MousePointerClick className="mb-3 h-5 w-5 text-gold" />
          <div className="font-display text-xl">{emptyText}</div>
          <p className="mt-1 text-[12px] text-mute">…or create a new one with the button above.</p>
        </div>
      )}
    </aside>
  );
}

/** Close the docked editor with Esc (the modal handles its own Esc). */
export function useEscape(active, fn) {
  useEffect(() => {
    if (!active) return;
    const h = (e) => e.key === "Escape" && !e.defaultPrevented && fn();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active, fn]);
}

export function ReorderButtons({ onUp, onDown, disableUp, disableDown, label = "" }) {
  return (
    <div className="flex flex-col">
      <button type="button" className="grid h-4 w-6 place-items-center rounded text-mute hover:bg-ink-4 hover:text-gold disabled:opacity-25" onClick={onUp} disabled={disableUp} aria-label={`Move ${label} up`}>
        <ArrowUp className="h-3 w-3" />
      </button>
      <button type="button" className="grid h-4 w-6 place-items-center rounded text-mute hover:bg-ink-4 hover:text-gold disabled:opacity-25" onClick={onDown} disabled={disableDown} aria-label={`Move ${label} down`}>
        <ArrowDown className="h-3 w-3" />
      </button>
    </div>
  );
}

export const moveItem = (arr, from, to) => {
  if (to < 0 || to >= arr.length || from === to) return arr;
  const next = arr.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
};

/** Google-style search snippet preview. */
export function SeoPreview({ title, desc, path }) {
  return (
    <div className="rounded-xl border border-line bg-ink p-3">
      <div className="a-label !mb-1.5 !text-[9.5px]">Search preview</div>
      <div className="truncate text-[11.5px] text-mute">premiumshopy.com{path}</div>
      <div className={cn("truncate text-[15px] leading-snug text-[#1a0dab]", !title && "italic opacity-60")}>{title || "SEO title"}</div>
      <div className={cn("line-clamp-2 text-[12px] text-bone-2", !desc && "italic opacity-60")}>{desc || "Meta description shown under the title in Google results."}</div>
    </div>
  );
}

/** Small square/rounded thumbnail with a monogram fallback. */
export function Thumb({ src, name, className, round }) {
  return (
    <div className={cn("relative grid h-10 w-10 flex-none place-items-center overflow-hidden border border-line bg-ink-3", round ? "rounded-full" : "rounded-lg", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display text-[15px] text-gold-2">{(name || "?").trim().slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}
