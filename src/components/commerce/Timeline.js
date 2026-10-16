import { Check } from "lucide-react";
import { ORDER_FLOW, ORDER_STATUS_LABEL, cn } from "@/lib/utils";
import { formatDateTime } from "./format";

const STEP_COPY = {
  PENDING: "We've received your order",
  CONFIRMED: "Verified with you by our team",
  PACKED: "Quality checked and packed",
  SHIPPED: "Handed to our courier partner",
  OUT_FOR_DELIVERY: "Arriving today",
  DELIVERED: "In your hands",
};

/**
 * Vertical order timeline.
 * props: status (current OrderStatus), events [{status, label?, note?, at}]
 */
export default function Timeline({ status, events = [], className }) {
  const latest = (s) => [...events].reverse().find((e) => e.status === s);
  const offFlow = !ORDER_FLOW.includes(status);

  // Cancelled / return flows: show the actual event history instead of the happy path
  if (offFlow) {
    return (
      <ol className={cn("relative space-y-6", className)}>
        {events.map((e, i) => {
          const last = i === events.length - 1;
          return (
            <li key={i} className="relative flex gap-4">
              {!last && <span className="absolute left-[11px] top-7 bottom-[-22px] w-px bg-line-2" aria-hidden />}
              <span
                className={cn(
                  "relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                  last ? "border-ember/50 bg-ember/10" : "border-gold/40 bg-gold/10"
                )}
                aria-hidden
              >
                <span className={cn("size-1.5 rounded-full", last ? "bg-ember" : "bg-gold")} />
              </span>
              <div className="min-w-0">
                <p className={cn("text-[15px] font-semibold", last ? "text-ember" : "text-bone")}>{e.label || ORDER_STATUS_LABEL[e.status]}</p>
                {e.note && <p className="mt-0.5 text-[13px] text-bone-2">{e.note}</p>}
                <p className="mt-1 text-[12px] text-mute">{formatDateTime(e.at)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  const currentIdx = ORDER_FLOW.indexOf(status);
  return (
    <ol className={cn("relative", className)}>
      {ORDER_FLOW.map((s, i) => {
        const done = i < currentIdx || status === "DELIVERED";
        const current = i === currentIdx && status !== "DELIVERED";
        const ev = latest(s);
        const last = i === ORDER_FLOW.length - 1;
        return (
          <li key={s} className="relative flex gap-4 pb-7 last:pb-0" aria-current={current ? "step" : undefined}>
            {!last && (
              <span className="absolute left-[11px] top-7 bottom-1 w-0.5 bg-ink-4" aria-hidden>
                <span className={cn("block w-0.5 bg-lume transition-all duration-700", done ? "h-full" : "h-0")} />
              </span>
            )}
            <span
              className={cn(
                "relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                done && "border-lume bg-lume text-white",
                current && "border-gold bg-gold-3",
                !done && !current && "border-line-2 bg-white"
              )}
              aria-hidden
            >
              {done && <Check className="size-3.5" strokeWidth={2} />}
              {current && (
                <>
                  <span className="absolute inset-0 animate-ping rounded-full border border-gold/40" />
                  <span className="size-2 rounded-full bg-gold" />
                </>
              )}
            </span>
            <div className="min-w-0">
              <p className={cn("text-[15px] font-semibold", done || current ? "text-bone" : "text-mute")}>
                {ORDER_STATUS_LABEL[s]}
                <span className="sr-only">{done ? " — completed" : current ? " — current step" : " — upcoming"}</span>
              </p>
              <p className={cn("mt-0.5 text-[13px]", done || current ? "text-bone-2" : "text-mute/70")}>{ev?.note || STEP_COPY[s]}</p>
              {ev && <p className="mt-1 text-[12px] text-mute">{formatDateTime(ev.at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
