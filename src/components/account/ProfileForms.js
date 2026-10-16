"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { profileSchema, changePasswordSchema, fieldErrors, issuesToErrors } from "@/lib/validators";
import { cn } from "@/lib/utils";
import Field from "@/components/commerce/Field";
import PasswordInput from "@/components/auth/PasswordInput";

async function patch(body) {
  const res = await fetch("/api/account/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong");
    err.issues = data.issues;
    throw err;
  }
  return data;
}

export default function ProfileForms({ user }) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-bone sm:text-xl">
        My Profile
      </h1>
      <DetailsForm user={user} />
      <PasswordForm />
    </div>
  );
}

function Panel({ n, title, children, onSubmit, busy, error, cta }) {
  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <h2 className="mb-4 border-b border-line pb-3" data-step={n}>
        <span className="text-[16px] font-bold text-bone">{title}</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      <p role="alert" aria-live="assertive" className={cn("mt-5 text-[13px] text-danger", !error && "sr-only")}>
        {error}
      </p>
      <button type="submit" className="btn btn-gold btn-sm mt-5" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" strokeWidth={1.5} /> : cta}
      </button>
    </form>
  );
}

function DetailsForm({ user }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setBusy(true);
    try {
      await patch(parsed.data);
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      if (err.issues) setErrors(issuesToErrors(err.issues));
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  return (
    <Panel n="01" title="Details" onSubmit={onSubmit} busy={busy} error={error} cta="Save changes">
      <Field id="pf-name" label="Full name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
      <Field
        id="pf-phone"
        label="Mobile number"
        type="tel"
        inputMode="numeric"
        prefix="+91"
        maxLength={14}
        autoComplete="tel-national"
        value={form.phone}
        onChange={set("phone")}
        error={errors.phone}
      />
      <Field id="pf-email" label="Email" value={user.email} readOnly disabled className="sm:col-span-2" hint="Contact us to change the email on your account" />
    </Panel>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const parsed = changePasswordSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setBusy(true);
    try {
      await patch(parsed.data);
      toast.success("Password changed");
      setForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      if (err.issues) setErrors(issuesToErrors(err.issues));
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  return (
    <Panel n="02" title="Password" onSubmit={onSubmit} busy={busy} error={error} cta="Update password">
      <PasswordInput
        id="pw-current"
        label="Current password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={set("currentPassword")}
        error={errors.currentPassword}
      />
      <PasswordInput
        id="pw-new"
        label="New password"
        autoComplete="new-password"
        value={form.newPassword}
        onChange={set("newPassword")}
        error={errors.newPassword}
        hint="At least 8 characters"
      />
    </Panel>
  );
}
