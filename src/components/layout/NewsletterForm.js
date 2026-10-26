"use client";
import { useState } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not subscribe");
      setState("done");
      setMsg(json.message || "You're on the list.");
      setEmail("");
    } catch (err) {
      setState("error");
      setMsg(err.message);
    }
  };

  return (
    <form method="post" onSubmit={submit} className="w-full max-w-md">
      <label htmlFor="nl-email" className="sr-only">
        Email address
      </label>
      <div className="flex h-11 overflow-hidden rounded-lg bg-white">
        <input
          id="nl-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "loading") setState("idle");
          }}
          placeholder="Enter your email"
          autoComplete="email"
          className="min-w-0 flex-1 bg-transparent px-3.5 text-[14px] text-bone outline-none placeholder:text-mute"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="flex shrink-0 items-center gap-1.5 bg-gold px-4 text-[13.5px] font-bold text-white transition-colors hover:bg-gold-2 disabled:opacity-70"
        >
          {state === "loading" ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : state === "done" ? (
            <Check size={15} />
          ) : (
            <ArrowRight size={15} />
          )}
          Subscribe
        </button>
      </div>
      <p aria-live="polite" className={`mt-2 min-h-[1.1rem] text-[12px] ${state === "error" ? "text-[#ff8a9a]" : "text-[#5fd6a6]"}`}>
        {msg}
      </p>
    </form>
  );
}
