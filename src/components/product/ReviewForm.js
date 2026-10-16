"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, LoaderCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Exceptional"];

export default function ReviewForm({ productId }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, setState] = useState({ status: "idle" });

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setState({ status: "error", message: "Please choose a star rating." });
    const fd = new FormData(e.currentTarget);
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          name: fd.get("name"),
          title: fd.get("title"),
          body: fd.get("body"),
          website: fd.get("website"), // honeypot
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const first = json.issues && Object.values(json.issues).flat()[0];
        throw new Error(first || json.error || "Could not submit review");
      }
      setState({ status: "done" });
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  };

  if (state.status === "done") {
    return (
      <div className="card-glass flex items-start gap-4 p-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-lume/40 text-lume">
          <Check size={16} strokeWidth={1.6} />
        </span>
        <div>
          <p className="text-[18px] font-bold text-bone">Thank you!</p>
          <p className="mt-1 text-[14px] text-bone-2">Your review has been received and will appear once it&apos;s approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost btn-sm rounded-lg">
          Write a review
        </button>
      ) : null}
      <AnimatePresence>
        {open && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="card-glass space-y-5 p-5 sm:p-7">
              <div>
                <p className="label">Your rating</p>
                <div className="flex items-center gap-3">
                  <div className="flex" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={rating === i}
                        aria-label={`${i} star${i > 1 ? "s" : ""}`}
                        onMouseEnter={() => setHover(i)}
                        onClick={() => setRating(i)}
                        className="p-1"
                      >
                        <Star
                          size={24}
                          strokeWidth={1.2}
                          className={cn("transition-colors", i <= (hover || rating) ? "fill-gold text-gold" : "text-ink-4")}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[13px] font-semibold text-gold-2">{LABELS[hover || rating]}</span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="rv-name">
                    Name
                  </label>
                  <input id="rv-name" name="name" required minLength={2} maxLength={60} className="field" autoComplete="name" />
                </div>
                <div>
                  <label className="label" htmlFor="rv-title">
                    Headline <span className="text-mute">(optional)</span>
                  </label>
                  <input id="rv-title" name="title" maxLength={100} className="field" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="rv-body">
                  Your review
                </label>
                <textarea id="rv-body" name="body" required minLength={10} maxLength={2000} rows={4} className="field" placeholder="How does it look and feel? Is it worth the price?" />
              </div>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              {state.status === "error" && <p className="text-[13px] text-ember">{state.message}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={state.status === "loading"} className="btn btn-gold btn-sm">
                  {state.status === "loading" ? <LoaderCircle size={14} className="animate-spin" /> : "Submit review"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
