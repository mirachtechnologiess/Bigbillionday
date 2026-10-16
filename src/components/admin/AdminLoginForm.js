"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { api } from "./fetcher";
import { Spinner } from "./ui";

export default function AdminLoginForm({ next = "/admin" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth-admin/login", { method: "POST", body: { email, password } });
      toast.success("Welcome back");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="adm relative grid min-h-dvh place-items-center overflow-hidden px-4">
      {/* rotating bezel backdrop */}
      <svg viewBox="0 0 600 600" className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-[0.07]" aria-hidden>
        <circle cx="300" cy="300" r="290" fill="none" stroke="#f2600c" strokeWidth="1" />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const r1 = i % 5 === 0 ? 255 : 270;
          return <line key={i} x1={300 + Math.cos(a) * r1} y1={300 + Math.sin(a) * r1} x2={300 + Math.cos(a) * 285} y2={300 + Math.sin(a) * 285} stroke="#f2600c" strokeWidth={i % 5 === 0 ? 3 : 1} />;
        })}
      </svg>
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="a-card relative w-full max-w-[400px] p-7 shadow-[0_30px_80px_-30px_rgba(17,24,39,.3)]"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 bg-gold/10">
            <Lock className="h-4 w-4 text-gold" />
          </span>
          <div>
            <div className="eyebrow !text-[10px]">Restricted</div>
            <h1 className="font-display text-3xl leading-none">Mission control</h1>
          </div>
        </div>
        <label className="mb-3 block">
          <span className="a-label">Email</span>
          <input className="a-input !h-11" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label className="mb-2 block">
          <span className="a-label">Password</span>
          <span className="relative block">
            <input className="a-input !h-11 !pr-10" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-bone" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        {error && <p className="mb-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger" role="alert">{error}</p>}
        <button className="a-btn a-btn-gold mt-3 !h-11 w-full" disabled={busy}>
          {busy ? <Spinner /> : <>Sign in <ArrowRight /></>}
        </button>
        <p className="mt-4 text-center text-[11.5px] text-mute">Only ADMIN and STAFF accounts can sign in here.</p>
      </motion.form>
    </div>
  );
}
