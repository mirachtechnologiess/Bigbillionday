import Link from "next/link";
import { Search } from "lucide-react";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** 404 — simple, friendly page with a search box and shortcuts. */
export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-ink-2">
      <div className="border-b border-line bg-white">
        <div className="container-lux flex h-14 items-center">
          <Link href="/" className="text-[20px] font-extrabold tracking-tight text-bone">
            Premium <span className="text-gold">Shopy</span>
          </Link>
        </div>
      </div>

      <div className="container-lux flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-lg rounded-xl border border-line bg-white px-5 py-8 text-center sm:px-8">
          <p className="text-5xl font-extrabold text-gold sm:text-6xl">404</p>
          <h1 className="mt-3 text-2xl font-bold text-bone">Sorry, we couldn&apos;t find that page</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-bone-2">
            The page may have moved or the product may no longer be available. Try searching for a watch instead.
          </p>

          <form action="/watches" method="get" role="search" className="mt-5 flex gap-2">
            <label htmlFor="nf-q" className="sr-only">
              Search watches
            </label>
            <input id="nf-q" name="q" type="search" placeholder="Search watches, brands…" className="field h-11 min-w-0 flex-1" />
            <button type="submit" className="btn btn-sun btn-sm h-11" aria-label="Search">
              <Search className="size-4" strokeWidth={2.25} />
            </button>
          </form>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/watches" className="btn btn-gold">
              Shop all watches
            </Link>
            <Link href="/" className="btn btn-ghost">
              Go to home
            </Link>
          </div>

          <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] font-medium">
            {[
              ["Men", "/men"],
              ["Women", "/women"],
              ["New arrivals", "/new-arrivals"],
              ["Brands", "/brands"],
              ["Track order", "/track-order"],
            ].map(([l, h]) => (
              <li key={h}>
                <Link href={h} className="text-gold-2 hover:underline">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
