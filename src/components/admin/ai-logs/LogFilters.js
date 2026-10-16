"use client";

import { Spinner, useQueryState } from "../ui";

export default function LogFilters({ tasks = [] }) {
  const { sp, set, pending } = useQueryState();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="a-input a-input-sm !w-auto min-w-[170px]" value={sp.get("task") || ""} onChange={(e) => set({ task: e.target.value })} aria-label="Filter by task">
        <option value="">All tasks</option>
        {tasks.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <div className="a-tabs !border-0">
        {[
          ["", "All"],
          ["ok", "Succeeded"],
          ["failed", "Failed"],
        ].map(([v, label]) => (
          <button key={v || "all"} type="button" className="a-tab !h-8" data-active={(sp.get("ok") || "") === v} onClick={() => set({ ok: v })}>
            {label}
          </button>
        ))}
      </div>
      {pending && <Spinner className="text-mute" />}
    </div>
  );
}
