"use client";
import { Banknote, Check, CreditCard, PhoneCall } from "lucide-react";
import { motion } from "framer-motion";
import { formatINR, cn } from "@/lib/utils";

export default function PaymentOptions({ method, setMethod, payment, total, codBlocked }) {
  const codOn = Boolean(payment.codEnabled);
  const rzpOn = Boolean(payment.razorpayEnabled);
  return (
    <div role="radiogroup" aria-label="Payment method" className="grid gap-3">
      <Option
        id="pay-cod"
        checked={method === "COD"}
        disabled={!codOn}
        onSelect={() => setMethod("COD")}
        icon={Banknote}
        title="Cash on Delivery"
        badge={codOn ? <span className="rounded bg-lume/10 px-2 py-0.5 text-lume">Available</span> : "Unavailable"}
      >
        <p className="text-[14px] leading-relaxed text-bone-2">
          Pay <span className="font-bold text-bone">{formatINR(total)}</span> in cash or by UPI to the courier when your watch arrives.
          No advance, no card details.
        </p>
        <p className="mt-3 flex items-start gap-2 text-[13px] text-mute">
          <PhoneCall className="mt-0.5 size-3.5 shrink-0 text-gold" strokeWidth={2} />
          We&apos;ll call or WhatsApp you once to confirm the order before dispatch.
        </p>
        {payment.codFee > 0 && (
          <p className="mt-2 text-[12px] text-mute">
            Includes {formatINR(payment.codFee)} COD handling
          </p>
        )}
        {codBlocked && (
          <p className="mt-3 rounded-lg border border-ember/30 bg-ember/5 px-3 py-2 text-[13px] text-ember" role="alert">
            Cash on Delivery is available on orders up to {formatINR(payment.codMaxOrder)}.
            {rzpOn ? " Please pay online for this order." : " Please reduce the bag or contact us to arrange the order."}
          </p>
        )}
      </Option>

      <Option
        id="pay-online"
        checked={method === "RAZORPAY"}
        disabled={!rzpOn}
        onSelect={() => setMethod("RAZORPAY")}
        icon={CreditCard}
        title="Pay online"
        badge={rzpOn ? "UPI · Cards · Netbanking" : <span className="rounded bg-ink-3 px-2 py-0.5 text-bone-2">Coming soon</span>}
      >
        <p className="text-[14px] text-bone-2">
          {rzpOn ? "Secure payment via Razorpay. You'll be redirected to complete the payment." : "UPI, cards and netbanking are arriving shortly."}
        </p>
      </Option>
    </div>
  );
}

function Option({ id, checked, disabled, onSelect, icon: Icon, title, badge, children }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "relative block cursor-pointer rounded-xl border bg-white p-4 transition-colors duration-200 sm:p-5",
        checked ? "border-gold bg-gold-3/60" : "border-line-2 hover:border-gold/60",
        disabled && "cursor-not-allowed bg-ink-2 opacity-60 hover:border-line-2"
      )}
    >
      <input
        id={id}
        type="radio"
        name="paymentMethod"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      {checked && (
        <motion.span
          layoutId="pay-ring"
          className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-gold"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          aria-hidden
        />
      )}
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition",
            checked ? "border-gold bg-gold text-white" : "border-line-2 bg-white"
          )}
          aria-hidden
        >
          {checked && <Check className="size-3" strokeWidth={2.25} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="flex items-center gap-2.5 text-[15px] font-bold text-bone">
              <Icon className="size-5 text-gold" strokeWidth={1.75} />
              {title}
            </span>
            <span className="text-[12px] font-semibold text-mute">{badge}</span>
          </div>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </label>
  );
}
