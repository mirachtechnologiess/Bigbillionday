"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CancelOrderButton({ orderNumber }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderNumber}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't cancel the order");
      toast.success("Your order has been cancelled");
      setConfirm(false);
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <AnimatePresence mode="wait" initial={false}>
        {confirm ? (
          <motion.div key="confirm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-[15px] font-semibold text-bone">Cancel this order?</p>
            <p className="mt-1 text-[13px] text-bone-2">This can&apos;t be undone.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={cancel} disabled={busy} className="btn btn-sm bg-ember text-white hover:bg-crimson">
                {busy ? <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} /> : "Yes, cancel order"}
              </button>
              <button type="button" onClick={() => setConfirm(false)} disabled={busy} className="btn btn-ghost btn-sm">
                Keep order
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-bone-2">Changed your mind? You can cancel until the order is packed.</p>
            <button type="button" onClick={() => setConfirm(true)} className="btn btn-sm border border-ember/40 bg-white text-ember hover:bg-ember/5">
              Cancel order
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <p role="alert" aria-live="assertive" className={error ? "mt-3 text-[13px] text-danger" : "sr-only"}>
        {error}
      </p>
    </div>
  );
}
