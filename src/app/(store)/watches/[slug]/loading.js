export default function Loading() {
  return (
    <div className="container-lux pt-3 sm:pt-4" aria-busy="true" aria-label="Loading watch">
      <div className="skeleton h-3 w-60 max-w-full rounded" />
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div className="lg:grid lg:grid-cols-[64px_1fr] lg:gap-3">
          <div className="hidden space-y-2 lg:block">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton aspect-square rounded-lg" />
            ))}
          </div>
          <div className="skeleton aspect-square rounded-xl" />
        </div>
        <div>
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton mt-3 h-7 w-4/5 rounded-md" />
          <div className="skeleton mt-2 h-7 w-3/5 rounded-md" />
          <div className="skeleton mt-4 h-5 w-28 rounded" />
          <div className="skeleton mt-5 h-10 w-56 rounded-md" />
          <div className="skeleton mt-6 h-24 rounded-xl" />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="skeleton h-12 rounded-lg" />
            <div className="skeleton h-12 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
