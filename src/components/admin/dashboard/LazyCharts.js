"use client";

import dynamic from "next/dynamic";

function ChartSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {[3, 2].map((span, i) => (
        <div key={i} className={`a-card a-dots h-[300px] animate-pulse ${span === 3 ? "lg:col-span-3" : "lg:col-span-2"}`} />
      ))}
    </div>
  );
}

const Charts = dynamic(() => import("./Charts"), { ssr: false, loading: ChartSkeleton });

export default function LazyCharts(props) {
  return <Charts {...props} />;
}
