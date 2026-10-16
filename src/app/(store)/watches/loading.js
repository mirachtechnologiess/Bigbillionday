import { ProductGridSkeleton } from "@/components/product/ProductGrid";

export default function Loading() {
  return (
    <div className="bg-ink-2 pb-6" aria-busy="true" aria-label="Loading watches">
      <div className="container-lux pt-3 sm:pt-4">
        <div className="skeleton h-3 w-40 rounded" />
        <div className="skeleton mt-3 h-7 w-56 rounded-md" />
        <div className="skeleton mt-2 h-3 w-72 max-w-full rounded" />
      </div>
      <div className="container-lux pt-4 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
        <div className="hidden h-[520px] rounded-xl border border-line bg-white p-4 lg:block">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton mb-4 h-6 rounded" />
          ))}
        </div>
        <div>
          <div className="mb-3 flex h-12 items-center justify-between rounded-xl border border-line bg-white px-4">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton hidden h-6 w-80 rounded-full md:block" />
          </div>
          <ProductGridSkeleton count={10} cols={5} />
        </div>
      </div>
    </div>
  );
}
