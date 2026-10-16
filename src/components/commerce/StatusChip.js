import { ORDER_STATUS_LABEL, cn } from "@/lib/utils";
import { statusTone, TONE_CLASS } from "./format";

export default function StatusChip({ status, className }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold",
        TONE_CLASS[tone],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {ORDER_STATUS_LABEL[status] || status}
    </span>
  );
}
