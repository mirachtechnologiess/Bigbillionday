"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { registerSchema, fieldErrors, issuesToErrors, safeNext } from "@/lib/validators";
import { cn } from "@/lib/utils";
import Field from "@/components/commerce/Field";
import PasswordInput from "./PasswordInput";
import { syncWishlist } from "./syncWishlist";

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH = ["Too short", "Fair", "Good", "Strong", "Excellent"];

export default function RegisterForm({ next }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dest = safeNext(next);
  const s = strength(form.password);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      document.getElementById(`reg-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.issues) setErrors(issuesToErrors(data.issues));
        throw new Error(data.error || "Couldn't create your account. Please try again.");
      }
      await syncWishlist();
      toast.success(`Welcome, ${data.user.name.split(" ")[0]}`);
      router.replace(dest);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="reg-name" label="Full name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
      <Field
        id="reg-email"
        label="Email"
        type="email"
        autoComplete="email"
        value={form.email}
        onChange={set("email")}
        error={errors.email}
      />
      <Field
        id="reg-phone"
        label="Mobile number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={14}
        prefix="+91"
        value={form.phone}
        onChange={set("phone")}
        error={errors.phone}
        hint="Used for delivery updates — never shared"
      />
      <div>
        <PasswordInput
          id="reg-password"
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          hint="At least 8 characters"
        />
        {form.password && (
          <div className="mt-3 flex items-center gap-3" aria-live="polite">
            <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={cn("h-1 rounded-full transition-colors duration-500", i <= s ? (s >= 3 ? "bg-lume" : "bg-gold") : "bg-line-2")} />
              ))}
            </div>
            <span className="w-20 text-right text-[12px] font-medium text-mute">{STRENGTH[s]}</span>
          </div>
        )}
      </div>
      <p role="alert" aria-live="assertive" className={cn("rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger", !error && "hidden")}>
        {error}
      </p>
      <button type="submit" className="btn btn-gold w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" strokeWidth={1.5} /> : <>Create account <ArrowRight className="size-4" strokeWidth={1.5} /></>}
      </button>
      <p className="text-center text-[12px] leading-relaxed text-mute">
        By continuing you agree to our{" "}
        <Link href="/terms" className="link-u text-bone-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy-policy" className="link-u text-bone-2">
          Privacy policy
        </Link>
        .
      </p>
      <p className="text-center text-[14px] text-bone-2">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(dest)}` : ""}`} className="font-semibold text-gold-2 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
