"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, MessageCircle, RotateCcw, Square, X } from "lucide-react";

const STORAGE_KEY = "ps:concierge:v1";
const MAX_CHARS = 600;
const STARTERS = ["Automatic under ₹30,000", "Gift for her", "Best diver watch", "Chronograph for daily wear"];
const EASE = [0.22, 1, 0.36, 1];

const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr)
      ? arr.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content).slice(-30)
      : [];
  } catch {
    return [];
  }
}

/* ───────────── Minimal, safe markdown (no innerHTML) ───────────── */

function renderInline(text, keyBase, onNavigate) {
  const out = [];
  const re = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[2] !== undefined) {
      out.push(
        <strong key={key} className="font-semibold text-bone">
          {renderInline(m[2], key, onNavigate)}
        </strong>
      );
    } else {
      const label = m[3];
      const href = m[4];
      if (href.startsWith("/") && !href.startsWith("//")) {
        out.push(
          <Link key={key} href={href} onClick={onNavigate} className="link-u text-gold-2 hover:text-gold">
            {label}
          </Link>
        );
      } else if (/^https?:\/\//i.test(href)) {
        out.push(
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="link-u text-gold-2 hover:text-gold">
            {label}
          </a>
        );
      } else {
        out.push(label);
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ text, onNavigate }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks = [];
  let para = [];
  let list = [];
  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", lines: para });
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "ul", items: list });
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) {
      flushPara();
      list.push(bullet[1]);
    } else if (!line.trim()) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.replace(/^#{1,6}\s+/, ""));
    }
  }
  flushPara();
  flushList();

  return (
    <div className="space-y-2.5">
      {blocks.map((b, bi) =>
        b.type === "ul" ? (
          <ul key={bi} className="space-y-1.5">
            {b.items.map((it, ii) => (
              <li key={ii} className="relative pl-4">
                <span aria-hidden className="absolute left-0 top-[0.72em] h-px w-2 bg-gold" />
                {renderInline(it, `${bi}-${ii}`, onNavigate)}
              </li>
            ))}
          </ul>
        ) : (
          <p key={bi}>
            {b.lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(l, `${bi}-${li}`, onNavigate)}
              </Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}

/* ───────────── Pieces ───────────── */

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 py-2" aria-label="Concierge is typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-gold"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

function whatsappHref(num) {
  const digits = String(num || "").replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent("Hi, I need help choosing a watch.")}`;
}

/* ───────────── Panel ───────────── */

export default function ConciergePanel({ open, onClose, storeName = "Our boutique", whatsapp }) {
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(false);

  const abortRef = useRef(null);
  const inputRef = useRef(null);
  const logRef = useRef(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Abort on unmount / close.
  useEffect(() => abort, [abort]);
  useEffect(() => {
    if (!open) abort();
  }, [open, abort]);

  // Persist settled conversation.
  useEffect(() => {
    if (streaming) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => m.content)));
    } catch {}
  }, [messages, streaming]);

  // Escape closes; focus input on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 220);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  // Keep the log pinned to the latest message.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, error, open]);

  // Auto-grow textarea.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [input, open]);

  const send = async (raw) => {
    const text = String(raw ?? input).trim().slice(0, MAX_CHARS);
    if (!text || streaming) return;
    setError(false);
    setInput("");
    const history = [...messages.filter((m) => m.content), { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;

    const appendToLast = (chunk) =>
      setMessages((prev) => {
        const next = prev.slice();
        const lastMsg = next[next.length - 1];
        if (lastMsg?.role === "assistant") next[next.length - 1] = { ...lastMsg, content: lastMsg.content + chunk };
        return next;
      });

    let received = false;
    try {
      const res = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          received = true;
          appendToLast(chunk);
        }
      }
      const tail = decoder.decode();
      if (tail) appendToLast(tail);
    } catch (e) {
      if (e?.name !== "AbortError" && !received) setError(true);
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      // Drop an empty assistant placeholder (error or abort before first token).
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        return lastMsg?.role === "assistant" && !lastMsg.content.trim() ? prev.slice(0, -1) : prev;
      });
      setStreaming(false);
    }
  };

  const clear = () => {
    abort();
    setMessages([]);
    setError(false);
    setInput("");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    inputRef.current?.focus();
  };

  const onNavigate = () => {
    if (isMobile()) onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const wa = whatsappHref(whatsapp);
  const empty = messages.length === 0;
  const lastMsg = messages[messages.length - 1];
  const waiting = streaming && lastMsg?.role === "assistant" && !lastMsg.content;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile scrim */}
          <motion.div
            key="concierge-scrim"
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[65] bg-bone/40 sm:hidden"
          />
          <motion.section
            key="concierge-panel"
            role="dialog"
            aria-modal="false"
            aria-label="Ask our watch concierge"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed inset-x-0 bottom-0 z-[66] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-line bg-ink pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_-12px_rgb(17_24_39/0.3)] sm:inset-x-auto sm:bottom-[calc(env(safe-area-inset-bottom)+20px)] sm:right-6 sm:h-[min(600px,calc(100dvh-120px))] sm:max-h-none sm:w-[380px] sm:rounded-2xl sm:border-b sm:pb-0 sm:shadow-[0_20px_60px_-20px_rgb(17_24_39/0.4)]"
          >
            {/* grab handle (mobile) */}
            <div className="flex justify-center bg-gold pt-2.5 sm:hidden" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-white/50" />
            </div>

            {/* Header */}
            <header className="relative flex items-center gap-3 border-b border-line bg-gold px-4 pb-3 pt-2 text-white sm:pt-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[12px] text-white/90">
                  <span className="relative flex size-1.5">
                    <span className="relative size-1.5 rounded-full bg-white" />
                  </span>
                  <span className="truncate">{storeName} · Online</span>
                </p>
                <h2 className="text-[16px] font-bold leading-tight text-white">
                  Watch shopping assistant
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!empty && (
                  <button
                    type="button"
                    onClick={clear}
                    aria-label="Clear conversation"
                    title="Clear conversation"
                    className="grid size-9 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <RotateCcw className="size-4" strokeWidth={2} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close concierge"
                  className="grid size-9 place-items-center rounded-full text-white transition-colors hover:bg-white/15"
                >
                  <X className="size-5" strokeWidth={2} />
                </button>
              </div>
            </header>

            {/* Message log */}
            <div
              ref={logRef}
              data-lenis-prevent
              aria-live="polite"
              aria-busy={streaming}
              className="relative min-h-[220px] flex-1 overflow-y-auto overscroll-contain bg-ink px-4 py-4 [scrollbar-width:thin]"
            >
              {empty ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
                >
                  <p className="rounded-2xl rounded-bl-md bg-ink-2 px-4 py-2.5 text-[14px] leading-relaxed text-bone-2">
                    Tell me the occasion, the wrist and the budget. I will shortlist pieces from our in-stock collection, with
                    honest notes on movement, size and wear.
                  </p>
                  <p className="mt-4 text-[12px] font-semibold text-mute">Try asking</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STARTERS.map((s, i) => (
                      <motion.button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: EASE, delay: 0.18 + i * 0.06 }}
                        className="chip bg-white hover:border-gold hover:text-gold-2"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <ol className="space-y-5">
                  {messages.map((m, i) => (
                    <motion.li
                      key={i}
                      layout="position"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className={m.role === "user" ? "flex justify-end" : "flex"}
                    >
                      {m.role === "user" ? (
                        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-gold/20 bg-gold-3 px-4 py-2.5 text-[14px] leading-relaxed text-bone">
                          {m.content}
                        </p>
                      ) : (
                        <div className="relative min-w-0 max-w-[92%] rounded-2xl rounded-bl-md bg-ink-2 px-4 py-2.5 text-[14px] leading-relaxed text-bone-2">
                          {m.content ? (
                            <div className="break-words">
                              <Markdown text={m.content} onNavigate={onNavigate} />
                              {streaming && i === messages.length - 1 && (
                                <span aria-hidden className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-gold" />
                              )}
                            </div>
                          ) : (
                            <TypingDots />
                          )}
                        </div>
                      )}
                    </motion.li>
                  ))}
                </ol>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="mt-4 rounded-xl border border-line bg-white p-4"
                  >
                    <p className="text-[15px] font-bold text-bone">The assistant is unavailable right now.</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-bone-2">A specialist can still help you choose, personally.</p>
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {wa ? (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-gold btn-sm">
                          <MessageCircle className="size-4" strokeWidth={1.5} /> WhatsApp us
                        </a>
                      ) : (
                        <Link href="/contact" onClick={onNavigate} className="btn btn-gold btn-sm">
                          <MessageCircle className="size-4" strokeWidth={1.5} /> Contact us
                        </Link>
                      )}
                      <button type="button" onClick={() => setError(false)} className="btn btn-ghost btn-sm">
                        Dismiss
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {waiting && <span className="sr-only">Concierge is composing a reply</span>}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="relative border-t border-line bg-ink px-3 pb-3 pt-3"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-line-2 bg-white p-1.5 pl-4 transition-colors focus-within:border-gold">
                <label htmlFor="concierge-input" className="sr-only">
                  Message the concierge
                </label>
                <textarea
                  id="concierge-input"
                  ref={inputRef}
                  rows={1}
                  value={input}
                  maxLength={MAX_CHARS}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={onKeyDown}
                  placeholder="A gift under ₹25,000…"
                  className="max-h-[132px] min-h-[38px] flex-1 resize-none bg-transparent py-2 text-[16px] leading-snug text-bone outline-none placeholder:text-mute sm:text-[14px]"
                />
                {streaming ? (
                  <button
                    type="button"
                    onClick={abort}
                    aria-label="Stop response"
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-line-2 text-gold-2 transition-colors hover:border-gold"
                  >
                    <Square className="size-3.5 fill-current" strokeWidth={1.25} />
                  </button>
                ) : (
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.9 }}
                    disabled={!input.trim()}
                    aria-label="Send message"
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-white transition-[background,opacity] hover:bg-gold-2 disabled:bg-ink-4 disabled:text-mute"
                  >
                    <ArrowUp className="size-4" strokeWidth={2.25} />
                  </motion.button>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[11px] text-mute">
                <span className="truncate">AI assistant · answers may contain mistakes</span>
                <span className={input.length > MAX_CHARS - 60 ? "text-gold" : undefined} aria-live="off">
                  {String(input.length).padStart(3, "0")}/{MAX_CHARS}
                </span>
              </div>
            </form>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
