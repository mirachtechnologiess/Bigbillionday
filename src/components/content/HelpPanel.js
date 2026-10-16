import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

/** Closing "still have questions" panel used at the end of policy / FAQ pages. */
export default function HelpPanel({ store, title = "Still have a question?" }) {
  return (
    <aside className="mt-10 rounded-xl border border-line bg-gold-3 p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-bone">{title}</h2>
          <p className="mt-1 max-w-md text-[14px] leading-relaxed text-bone-2">
            Our team replies within one business day, Monday to Saturday, 10:00 to 19:00 IST.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/contact" className="btn btn-gold btn-sm">
            Contact us <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
          {store?.email && (
            <a href={`mailto:${store.email}`} className="btn btn-ghost btn-sm">
              <Mail size={16} strokeWidth={2} aria-hidden="true" /> Email
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
