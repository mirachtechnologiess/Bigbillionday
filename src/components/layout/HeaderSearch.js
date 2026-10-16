"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";
import { cn, discountPct, formatINR } from "@/lib/utils";

const POPULAR = ["Casio", "G-Shock", "Rolex", "Fossil", "Smart watch", "Couple watch"];

/** Prominent header search with live suggestions from /api/search/suggest. */
export default function HeaderSearch({ className, inputRef: externalRef }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const uid = useId();
  const listId = `${uid}-list`;
  const localRef = useRef(null);
  const inputRef = externalRef || localRef;
  const boxRef = useRef(null);
  const [q, setQ] = useState(() => (pathname === "/watches" ? params.get("q") || "" : ""));
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ products: [], brands: [] });
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  // close on route change
  useEffect(() => setOpen(false), [pathname]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData({ products: [], brands: [] });
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = await res.json();
        setData({ products: json.products || [], brands: json.brands || [] });
        setActive(-1);
      } catch {
        /* aborted or offline */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (href) => {
    setOpen(false);
    inputRef.current?.blur();
    router.push(href);
  };

  const submit = (e) => {
    e.preventDefault();
    const p = data.products[active];
    if (p) return go(`/watches/${p.slug}`);
    const term = q.trim();
    go(term ? `/watches?q=${encodeURIComponent(term)}` : "/watches");
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!data.products.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % data.products.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? data.products.length - 1 : i - 1));
    }
  };

  const term = q.trim();
  const empty = term.length >= 2 && !loading && !data.products.length && !data.brands.length;
  const showPanel = open && (term.length < 2 || data.products.length > 0 || data.brands.length > 0 || empty);

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form onSubmit={submit} role="search" className="flex h-11 overflow-hidden rounded-lg border-2 border-gold bg-white shadow-sm">
        <label htmlFor={`${uid}-q`} className="sr-only">
          Search watches
        </label>
        <input
          ref={inputRef}
          id={`${uid}-q`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search watches, brands and more"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
          className="min-w-0 flex-1 bg-transparent pl-3.5 pr-2 text-[15px] text-bone outline-none placeholder:text-mute [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            className="grid w-9 place-items-center text-mute hover:text-bone"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
        <button type="submit" className="grid w-12 shrink-0 place-items-center bg-gold text-white transition-colors hover:bg-gold-2" aria-label="Search">
          {loading ? <LoaderCircle size={19} className="animate-spin" /> : <Search size={19} strokeWidth={2.2} />}
        </button>
      </form>

      {showPanel && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-[60] max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-white py-2 shadow-[0_18px_40px_-12px_rgba(17,24,39,0.25)]" data-lenis-prevent>
          {term.length < 2 ? (
            <div className="px-4 py-2">
              <p className="text-[12px] font-semibold text-mute">Popular searches</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {POPULAR.map((p) => (
                  <li key={p}>
                    <button type="button" onClick={() => go(`/watches?q=${encodeURIComponent(p)}`)} className="chip bg-ink-2 hover:border-gold hover:text-gold-2">
                      <Search size={12} /> {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : empty ? (
            <p className="px-4 py-3 text-[14px] text-bone-2">
              No matches for <strong className="text-bone">&ldquo;{term}&rdquo;</strong>. Try a brand like Casio or Fossil.
            </p>
          ) : (
            <>
              {data.brands.length > 0 && (
                <ul className="flex flex-wrap gap-2 border-b border-line px-4 pb-2.5 pt-1">
                  {data.brands.map((b) => (
                    <li key={b.slug}>
                      <Link href={`/brands/${b.slug}`} onClick={() => setOpen(false)} className="chip border-gold/40 bg-gold-3 font-semibold text-gold-2">
                        {b.name} watches
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <ul id={listId} role="listbox" aria-label="Suggestions">
                {data.products.map((p, i) => {
                  const off = discountPct(p.price, p.mrp);
                  return (
                    <li key={p.id} id={`${uid}-opt-${i}`} role="option" aria-selected={active === i}>
                      <Link
                        href={`/watches/${p.slug}`}
                        onClick={() => setOpen(false)}
                        className={cn("flex items-center gap-3 px-4 py-2 transition-colors", active === i ? "bg-ink-3" : "hover:bg-ink-2")}
                      >
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-ink-2">
                          {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-bone">{p.name}</span>
                          <span className="block text-[12px] text-mute">{p.brand}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[14px] font-bold text-bone">{formatINR(p.price)}</span>
                          {off > 0 && <span className="block text-[11.5px] font-semibold text-lume">{off}% off</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => go(`/watches?q=${encodeURIComponent(term)}`)}
                className="mx-4 mt-1 block py-2 text-left text-[13.5px] font-semibold text-gold-2 hover:underline"
              >
                See all results for &ldquo;{term}&rdquo;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
