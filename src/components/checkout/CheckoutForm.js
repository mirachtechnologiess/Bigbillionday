"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-store";
import { computeTotals } from "@/lib/pricing";
import { formatINR, cn } from "@/lib/utils";
import { checkoutFormSchema, fieldErrors, issuesToErrors } from "@/lib/validators";
import { useMounted } from "@/components/commerce/hooks";
import { pincodeServiceable } from "@/components/commerce/format";
import Field from "@/components/commerce/Field";
import AddressFields from "@/components/commerce/AddressFields";
import CheckoutSummary from "./CheckoutSummary";
import PaymentOptions from "./PaymentOptions";

const EASE = [0.22, 1, 0.36, 1];
const ADDRESS_KEYS = ["name", "line1", "line2", "landmark", "pincode", "city", "state"];

function fromAddress(a) {
  return Object.fromEntries(ADDRESS_KEYS.map((k) => [k, a?.[k] || ""]));
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutForm({ user, addresses, settings }) {
  const router = useRouter();
  const mounted = useMounted();
  const items = useCart((s) => s.items);
  const coupon = useCart((s) => s.coupon);
  const clear = useCart((s) => s.clear);
  const { shipping, payment } = settings;

  const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
  const [selected, setSelected] = useState(defaultAddr?.id || "new");
  const [form, setForm] = useState(() => ({
    email: user?.email || "",
    phone: user?.phone || defaultAddr?.phone || "",
    ...fromAddress(defaultAddr ? defaultAddr : { name: user?.name }),
  }));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState(payment.codEnabled ? "COD" : payment.razorpayEnabled ? "RAZORPAY" : "COD");
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const errorRef = useRef(null);

  const totals = useMemo(() => computeTotals({ items, coupon, shipping, payment, method }), [items, coupon, shipping, payment, method]);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const codBlocked = method === "COD" && payment.codMaxOrder > 0 && totals.total > payment.codMaxOrder;
  const serviceable = pincodeServiceable(form.pincode, shipping.serviceablePincodes);

  useEffect(() => {
    if (serverError) errorRef.current?.focus();
  }, [serverError]);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  const chooseAddress = (id) => {
    setSelected(id);
    setErrors({});
    if (id === "new") setForm((f) => ({ ...f, ...fromAddress({ name: user?.name }) }));
    else {
      const a = addresses.find((x) => x.id === id);
      setForm((f) => ({ ...f, ...fromAddress(a), phone: f.phone || a.phone }));
    }
  };

  const focusField = (key) => {
    const id = ["email", "phone"].includes(key) ? `co-${key}` : `co-addr-${key}`;
    setTimeout(() => {
      const el = document.getElementById(id);
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
  };

  const finish = (data) => {
    clear();
    router.replace(`/order/${data.orderNumber}?t=${data.token}`);
  };

  async function payOnline(data) {
    const ok = await loadRazorpay();
    if (!ok) {
      toast.error("Couldn't load the payment window. Your order is saved — we'll contact you.");
      return finish(data);
    }
    const r = data.razorpay;
    const rzp = new window.Razorpay({
      key: r.keyId,
      amount: r.amount,
      currency: r.currency,
      name: r.name,
      description: `Order ${data.orderNumber}`,
      order_id: r.orderId,
      prefill: r.prefill,
      theme: { color: "#f2600c" },
      handler: async (resp) => {
        try {
          const v = await fetch("/api/orders/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNumber: data.orderNumber, token: data.token, ...resp }),
          });
          if (!v.ok) toast.error((await v.json().catch(() => ({}))).error || "Payment verification failed");
        } finally {
          finish(data);
        }
      },
      modal: {
        ondismiss: () => {
          toast("Payment not completed. Your order is saved — you can retry or contact us.");
          finish(data);
        },
      },
    });
    rzp.open();
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setServerError("");
    const parsed = checkoutFormSchema.safeParse(form);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      const first = Object.keys(errs)[0];
      if (ADDRESS_KEYS.includes(first) && selected !== "new") setSelected("new");
      focusField(first);
      return;
    }
    if (!serviceable) {
      setErrors({ pincode: "We don't deliver to this pincode yet" });
      if (selected !== "new") setSelected("new");
      return focusField("pincode");
    }
    if (codBlocked) return setServerError(`Cash on Delivery is available on orders up to ${formatINR(payment.codMaxOrder)}.`);

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          paymentMethod: method,
          couponCode: coupon?.code || null,
          saveAddress: Boolean(user && selected === "new" && saveAddress),
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 422 && data.issues) {
          const errs = issuesToErrors(data.issues);
          setErrors(errs);
          const first = Object.keys(errs)[0];
          if (first) focusField(first);
        }
        throw new Error(data.error || "We couldn't place your order. Please try again.");
      }
      setPlaced(true);
      if (data.razorpay) await payOnline(data);
      else finish(data);
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  }

  if (!mounted) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="skeleton h-10 w-1/2 rounded-lg" />
          <div className="skeleton h-56 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
        <div className="skeleton hidden h-[420px] rounded-xl lg:block" />
      </div>
    );
  }

  if (placed) return <PlacingOverlay />;

  if (!items.length) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-line bg-white px-5 py-12 text-center">
        <h1 className="text-2xl font-bold text-bone">Your cart is empty</h1>
        <p className="mt-2 text-[14px] text-bone-2">Add a watch to your cart to check out.</p>
        <Link href="/watches" className="btn btn-gold mt-6">
          Shop watches <ArrowRight className="size-4" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  const placeLabel = method === "COD" ? `Place order · ${formatINR(totals.total)}` : `Pay ${formatINR(totals.total)}`;

  return (
    <form method="post" onSubmit={onSubmit} noValidate>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-bone sm:text-3xl">
          <Lock className="size-5 text-lume" strokeWidth={2} aria-hidden />
          Checkout
        </h1>
        {!user && (
          <p className="text-[13px] text-bone-2">
            Have an account?{" "}
            <Link href="/login?next=/checkout" className="font-semibold text-gold-2 hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </header>

      {/* Mobile collapsible summary */}
      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white lg:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
          aria-controls="co-summary-mobile"
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
        >
          <span className="flex items-center gap-2 text-[14px] font-semibold text-gold-2">
            {summaryOpen ? "Hide" : "Show"} order summary ({count})
            <ChevronDown className={cn("size-4 transition-transform duration-300", summaryOpen && "rotate-180")} strokeWidth={2} />
          </span>
          <span className="text-lg font-bold text-bone tabular-nums">{formatINR(totals.total)}</span>
        </button>
        <AnimatePresence initial={false}>
          {summaryOpen && (
            <motion.div
              id="co-summary-mobile"
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="border-t border-line px-4 py-4">
                <CheckoutSummary items={items} totals={totals} coupon={coupon} count={count} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 grid gap-5 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <div className="min-w-0 space-y-4">
          <Section n="1" title="Contact details" note="For delivery updates and a quick COD confirmation">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="co-phone"
                name="phone"
                label="Mobile number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={14}
                prefix="+91"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                error={errors.phone}
              />
              <Field
                id="co-email"
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                error={errors.email}
                hint="Your invoice and order link arrive here"
              />
            </div>
          </Section>

          <Section n="2" title="Delivery address" note={`Delivered in ${shipping.etaDays} business days`}>
            {addresses.length > 0 && (
              <div role="radiogroup" aria-label="Saved addresses" className="mb-5 grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => (
                  <AddressOption key={a.id} checked={selected === a.id} onSelect={() => chooseAddress(a.id)} id={`co-saved-${a.id}`}>
                    <p className="text-[15px] font-semibold text-bone">
                      {a.name}
                      {a.isDefault && (
                        <span className="ml-2 rounded bg-ink-3 px-1.5 py-0.5 text-[11px] font-semibold text-bone-2">Default</span>
                      )}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-bone-2">
                      {[a.line1, a.line2, a.city].filter(Boolean).join(", ")} · {a.pincode}
                    </p>
                  </AddressOption>
                ))}
                <AddressOption checked={selected === "new"} onSelect={() => chooseAddress("new")} id="co-saved-new">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-gold-2">
                    <Plus className="size-4" strokeWidth={2} /> New address
                  </p>
                  <p className="mt-1 text-[13px] text-bone-2">Deliver somewhere else</p>
                </AddressOption>
              </div>
            )}
            <AnimatePresence initial={false} mode="popLayout">
              {selected === "new" && (
                <motion.div
                  key="new-address"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <AddressFields prefix="co-addr" values={form} errors={errors} set={set} serviceable={serviceable} />
                  {user && (
                    <label className="mt-5 flex cursor-pointer items-center gap-3 text-[14px] text-bone-2">
                      <input
                        type="checkbox"
                        checked={saveAddress}
                        onChange={(e) => setSaveAddress(e.target.checked)}
                        className="size-4 accent-[#f2600c]"
                      />
                      Save this address to my account
                    </label>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          <Section n="3" title="Payment method" note="Nothing to pay now">
            <PaymentOptions method={method} setMethod={setMethod} payment={payment} total={totals.total} codBlocked={codBlocked} />
          </Section>

          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            aria-live="assertive"
            className={cn(
              "rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-[14px] text-danger outline-none",
              !serverError && "hidden"
            )}
          >
            {serverError}
          </div>

          <div className="pb-[env(safe-area-inset-bottom)]">
            {/* Disabled until the page is interactive, so an early tap can't do a plain form post and lose the details */}
            <button type="submit" className="btn btn-gold h-[52px] w-full text-[15px]" disabled={!mounted || submitting || codBlocked}>
              {!mounted ? (
                "Loading…"
              ) : submitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                  Placing your order…
                </>
              ) : (
                <>
                  <Lock className="size-4" strokeWidth={2} /> {placeLabel}
                </>
              )}
            </button>
            <p className="mt-3 text-center text-[12px] leading-relaxed text-mute">
              By placing this order you agree to our{" "}
              <Link href="/terms" className="text-gold-2 hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/return-policy" className="text-gold-2 hover:underline">
                Return policy
              </Link>
              .
            </p>
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="Order summary">
          <div className="sticky top-[calc(var(--header-h)+1rem)] rounded-xl border border-line bg-white p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-bold text-bone">Order summary</h2>
              <p className="text-[13px] text-mute">
                {count} {count === 1 ? "item" : "items"}
              </p>
            </div>
            <CheckoutSummary items={items} totals={totals} coupon={coupon} count={count} />
          </div>
        </aside>
      </div>
    </form>
  );
}

function Section({ n, title, note, children }) {
  return (
    <motion.fieldset
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay: Number(n) * 0.05 }}
      className="min-w-0 rounded-xl border border-line bg-white p-4 sm:p-5"
    >
      <legend className="sr-only">{title}</legend>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
        <h2 className="flex items-center gap-2.5">
          <span className="grid size-6 place-items-center rounded-full bg-gold text-[12px] font-bold text-white">{n}</span>
          <span className="text-[17px] font-bold text-bone">{title}</span>
        </h2>
        {note && <p className="text-[12px] text-mute">{note}</p>}
      </div>
      {children}
    </motion.fieldset>
  );
}

function AddressOption({ id, checked, onSelect, children }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "relative block cursor-pointer rounded-lg border bg-white p-4 transition-colors duration-200",
        checked ? "border-gold bg-gold-3/60 ring-1 ring-gold" : "border-line-2 hover:border-gold/60"
      )}
    >
      <input id={id} type="radio" name="savedAddress" className="sr-only" checked={checked} onChange={onSelect} />
      <span
        className={cn(
          "absolute right-4 top-4 size-4 rounded-full border-2",
          checked ? "border-gold bg-gold shadow-[inset_0_0_0_2px_#fff]" : "border-line-2"
        )}
        aria-hidden
      />
      <div className="pr-6">{children}</div>
    </label>
  );
}

function PlacingOverlay() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" role="status" aria-live="polite">
      <span className="size-12 animate-spin rounded-full border-4 border-gold-3 border-t-gold" aria-hidden />
      <p className="mt-5 text-xl font-bold text-bone">Placing your order…</p>
      <p className="mt-3 text-[14px] text-bone-2">Please don&apos;t close this window.</p>
    </div>
  );
}
