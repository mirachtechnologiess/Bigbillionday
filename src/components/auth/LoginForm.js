"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, fieldErrors, issuesToErrors, safeNext } from "@/lib/validators";
import { cn } from "@/lib/utils";
import Field from "@/components/commerce/Field";
import PasswordInput from "./PasswordInput";
import { syncWishlist } from "./syncWishlist";

export default function LoginForm({ next }) {
  const router = useRouter();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dest = safeNext(next);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      document.getElementById(`login-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.issues) setErrors(issuesToErrors(data.issues));
        throw new Error(data.error || "Couldn't sign you in. Please try again.");
      }
      await syncWishlist();
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}`);
      router.replace(dest);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field
        id="login-identifier"
        label="Email or mobile number"
        autoComplete="username"
        value={form.identifier}
        onChange={set("identifier")}
        error={errors.identifier}
      />
      <PasswordInput
        id="login-password"
        label="Password"
        autoComplete="current-password"
        value={form.password}
        onChange={set("password")}
        error={errors.password}
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-[13px] font-medium text-gold-2 hover:underline">
          Forgot password?
        </Link>
      </div>
      <p role="alert" aria-live="assertive" className={cn("rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger", !error && "hidden")}>
        {error}
      </p>
      <button type="submit" className="btn btn-gold w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" strokeWidth={1.5} /> : <>Sign in <ArrowRight className="size-4" strokeWidth={1.5} /></>}
      </button>
      <p className="pt-2 text-center text-[14px] text-bone-2">
        New here?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(dest)}` : ""}`} className="font-semibold text-gold-2 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
