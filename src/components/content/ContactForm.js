"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

const EASE = [0.22, 1, 0.36, 1];
const EMPTY = { name: "", email: "", phone: "", message: "", website: "" };
const MAX_MSG = 2000;

const normalizePhone = (v) => v.replace(/[\s-]/g, "").replace(/^(\+?91|0)(?=\d{10}$)/, "");

function validate(v) {
  const e = {};
  const name = v.name.trim();
  if (name.length < 2) e.name = "Please enter your name (at least 2 characters).";
  else if (name.length > 80) e.name = "Name must be 80 characters or fewer.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = "Please enter a valid email address.";
  const phone = normalizePhone(v.phone.trim());
  if (phone && !/^[6-9]\d{9}$/.test(phone)) e.phone = "Enter a valid 10-digit Indian mobile number, or leave it blank.";
  const msg = v.message.trim();
  if (msg.length < 10) e.message = "Please write at least 10 characters so we can help.";
  else if (msg.length > MAX_MSG) e.message = `Message must be ${MAX_MSG} characters or fewer.`;
  return e;
}

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">
          {label}
        </label>
        {hint && <span className="mb-[0.45rem] text-[11px] text-mute">{hint}</span>}
      </div>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-2 text-[12px] text-danger"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success
  const [formError, setFormError] = useState("");
  const formRef = useRef(null);

  const set = (k) => (e) => {
    const val = e.target.value;
    setValues((v) => ({ ...v, [k]: val }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const invalidProps = (k) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `contact-${k}-error` : undefined,
  });

  async function onSubmit(e) {
    e.preventDefault();
    setFormError("");
    const found = validate(values);
    setErrors(found);
    const firstKey = Object.keys(found)[0];
    if (firstKey) {
      setFormError("Please correct the highlighted fields.");
      formRef.current?.querySelector(`#contact-${firstKey}`)?.focus();
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, phone: normalizePhone(values.phone.trim()) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.issues) {
          const mapped = Object.fromEntries(Object.entries(data.issues).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]));
          setErrors(mapped);
        }
        throw new Error(data?.error || "We couldn't send your message. Please try again.");
      }
      setStatus("success");
      setValues(EMPTY);
      toast.success("Message received — we'll be in touch shortly.");
    } catch (err) {
      setStatus("idle");
      setFormError(err.message || "Network error. Please try again.");
      toast.error(err.message || "Network error. Please try again.");
    }
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex min-h-[320px] flex-col items-center justify-center text-center"
            role="status"
            aria-live="polite"
          >
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.6, ease: EASE }}
              className="grid size-14 place-items-center rounded-full bg-lume text-white"
            >
              <Check size={26} strokeWidth={2.5} aria-hidden="true" />
            </motion.span>
            <h3 className="mt-4 text-xl font-bold text-bone">Thank you! Message received.</h3>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-bone-2">
              A member of our team will reply by email within one business day. For anything urgent about an existing order, keep your order number handy.
            </p>
            <button type="button" onClick={() => setStatus("idle")} className="btn btn-ghost btn-sm mt-5">
              Send another message
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            ref={formRef}
            noValidate
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="space-y-5"
            aria-describedby="contact-form-status"
          >
            <div id="contact-form-status" role="alert" aria-live="assertive" className="min-h-0">
              {formError && (
                <p className="rounded-lg border border-danger/40 bg-danger/[0.06] px-4 py-3 text-[13px] text-danger">{formError}</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="contact-name" label="Full name" error={errors.name}>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  required
                  className="field"
                  placeholder="Your name"
                  value={values.name}
                  onChange={set("name")}
                  {...invalidProps("name")}
                />
              </Field>
              <Field id="contact-email" label="Email" error={errors.email}>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  className="field"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={set("email")}
                  {...invalidProps("email")}
                />
              </Field>
            </div>

            <Field id="contact-phone" label="Mobile number" hint="Optional" error={errors.phone}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[13px] text-mute" aria-hidden="true">
                  +91
                </span>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={14}
                  className="field pl-14"
                  placeholder="98765 43210"
                  value={values.phone}
                  onChange={set("phone")}
                  {...invalidProps("phone")}
                />
              </div>
            </Field>

            <Field id="contact-message" label="How can we help?" hint={`${values.message.length}/${MAX_MSG}`} error={errors.message}>
              <textarea
                id="contact-message"
                name="message"
                rows={6}
                required
                maxLength={MAX_MSG}
                className="field resize-y"
                placeholder="Tell us about the watch you're looking for, or share your order number if this is about an existing order."
                value={values.message}
                onChange={set("message")}
                {...invalidProps("message")}
              />
            </Field>

            {/* Honeypot — hidden from people and assistive tech */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="contact-website">Website</label>
              <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
            </div>

            <div className="flex flex-col-reverse gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] leading-relaxed text-mute">
                We never share your details.
              </p>
              <button type="submit" className="btn btn-gold w-full sm:w-auto" disabled={status === "submitting"}>
                {status === "submitting" ? (
                  <>
                    <LoaderCircle size={16} strokeWidth={1.25} className="animate-spin" aria-hidden="true" /> Sending
                  </>
                ) : (
                  <>
                    Send message <ArrowRight size={16} strokeWidth={1.25} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
