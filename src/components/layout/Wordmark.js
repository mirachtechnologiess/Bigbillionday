import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brand logo (public/logo.png, generated from public/brand/logo-master.png via scripts/make-logo-assets.mjs).
 * Height follows the font-size set through className (e.g. text-[26px] → ~42px tall logo).
 * `light` uses the white-text variant for dark backgrounds.
 */
export default function Wordmark({ name = "BigBillionDay", className, light = false, priority = false }) {
  return (
    <span className={cn("inline-flex items-center leading-none", className)}>
      <Image
        src={light ? "/logo-light.png" : "/logo.png"}
        alt={name}
        width={721}
        height={240}
        priority={priority}
        sizes="200px"
        className="h-[1.6em] w-auto"
      />
    </span>
  );
}
