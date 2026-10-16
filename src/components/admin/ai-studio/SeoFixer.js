"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, RefreshCw, SearchCheck, Square, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Card, Empty, Pill, ProductStatusPill, Spinner } from "../ui";
import { api } from "../fetcher";
import { cn } from "@/lib/utils";

const ISSUE = {
  "seoTitle-missing": ["No SEO title", "danger"],
  "seoTitle-long": ["Title > 60", "ember"],
  "seoTitle-short": ["Title < 20", "gold"],
  "seoDesc-missing": ["No meta desc", "danger"],
  "seoDesc-long": ["Desc > 155", "ember"],
  "seoDesc-short": ["Desc < 50", "gold"],
  "desc-missing": ["No description", "danger"],
  "desc-short": ["Thin description", "gold"],
  "alt-missing": ["Missing alt", "ember"],
  "tags-few": ["< 5 tags", "info"],
};
const BATCH = 3;

export default function SeoFixer({ aiOn, active }) {
  const [rows, setRows] = useState(null);
  const [scanned, setScanned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(new Set());
  const [filter, setFilter] = useState("");
  const [progress, setProgress] = useState(null); // {done,total,ok,failed}
  const [state, setState] = useState({}); // id -> "working" | "fixed" | error message
  const stopRef = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api("/api/admin/ai-studio/seo-audit");
      setRows(r.items);
      setScanned(r.scanned);
      setSel(new Set());
      setState({});
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active && rows === null && !loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const visible = (rows || []).filter((r) => !filter || r.issues.includes(filter));
  const allSel = visible.length > 0 && visible.every((r) => sel.has(r.id));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(visible.map((r) => r.id)));
  const toggle = (id) => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    setSel(n);
  };

  const fix = async () => {
    const ids = [...sel];
    if (!ids.length) return;
    stopRef.current = false;
    setProgress({ done: 0, total: ids.length, ok: 0, failed: 0 });
    let okN = 0;
    let failN = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      if (stopRef.current) break;
      const chunk = ids.slice(i, i + BATCH);
      setState((s) => ({ ...s, ...Object.fromEntries(chunk.map((id) => [id, "working"])) }));
      try {
        const r = await api("/api/admin/ai-studio/seo-fix", { method: "POST", body: { ids: chunk } });
        const map = {};
        for (const res of r.results) {
          map[res.id] = res.ok ? "fixed" : res.error || "Failed";
          res.ok ? okN++ : failN++;
        }
        setState((s) => ({ ...s, ...map }));
        setRows((list) =>
          list.map((row) => {
            const res = r.results.find((x) => x.id === row.id);
            return res?.ok ? { ...row, issues: res.remaining || [] } : row;
          })
        );
      } catch (e) {
        failN += chunk.length;
        setState((s) => ({ ...s, ...Object.fromEntries(chunk.map((id) => [id, e.message])) }));
        if (e.status === 503 || e.status === 429) {
          toast.error(e.message);
          stopRef.current = true;
        }
      }
      setProgress({ done: Math.min(i + BATCH, ids.length), total: ids.length, ok: okN, failed: failN });
    }
    setSel(new Set());
    toast.success(`SEO fixer: ${okN} fixed${failN ? `, ${failN} failed` : ""}`);
    setTimeout(() => setProgress((p) => (p && p.done >= p.total ? null : p)), 4000);
  };

  const running = progress && progress.done < progress.total && !stopRef.current;
  const counts = (rows || []).reduce((a, r) => {
    r.issues.forEach((i) => (a[i] = (a[i] || 0) + 1));
    return a;
  }, {});

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          SEO audit
          {rows && (
            <span className="text-[11.5px] font-normal text-mute">
              <span className="a-num text-bone">{rows.filter((r) => r.issues.length).length}</span> of <span className="a-num">{scanned}</span> products need work
            </span>
          )}
        </span>
      }
      icon={SearchCheck}
      bodyClass="space-y-3"
      actions={
        <>
          <button className="a-btn a-btn-sm a-btn-ghost" onClick={load} disabled={loading || running}>
            {loading ? <Spinner /> : <RefreshCw />} Rescan
          </button>
          {running ? (
            <button className="a-btn a-btn-sm" onClick={() => (stopRef.current = true)}>
              <Square /> Stop
            </button>
          ) : (
            <button className="a-btn a-btn-ai a-btn-sm" disabled={!sel.size || !aiOn} onClick={fix}>
              <Wand2 /> Fix selected {sel.size ? `(${sel.size})` : ""}
            </button>
          )}
        </>
      }
    >
      {progress && (
        <div className="rounded-xl border border-line bg-ink-3/50 p-3">
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <span className="text-bone-2">
              {progress.done < progress.total ? "Fixing" : "Done"} · <span className="a-num">{progress.done}</span>/<span className="a-num">{progress.total}</span>
            </span>
            <span className="a-num text-[11.5px] text-mute">
              <span className="text-lume">{progress.ok} ok</span>
              {progress.failed > 0 && <span className="text-danger"> · {progress.failed} failed</span>}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-4">
            <motion.div className="h-full bg-gradient-to-r from-gold-3 via-gold to-lume" animate={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button className={cn("pill", !filter && "!border-gold !text-gold-2")} data-dot="false" onClick={() => setFilter("")}>
            All · {rows.length}
          </button>
          {Object.entries(ISSUE)
            .filter(([k]) => counts[k])
            .map(([k, [label]]) => (
              <button key={k} className={cn("pill", filter === k && "!border-gold !text-gold-2")} data-dot="false" onClick={() => setFilter(filter === k ? "" : k)}>
                {label} · <span className="a-num">{counts[k]}</span>
              </button>
            ))}
        </div>
      )}

      {rows === null || (loading && !rows?.length) ? (
        <div className="flex items-center justify-center gap-2 py-14 text-[12.5px] text-mute">
          <Spinner /> Scanning catalogue…
        </div>
      ) : !rows.length ? (
        <Empty icon={CheckCircle2} title="Every listing is in shape">
          No product has missing or weak SEO titles, meta descriptions, descriptions, alt text or tags.
        </Empty>
      ) : (
        <div className="a-table-wrap !max-h-[60dvh]">
          <table className="a-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input type="checkbox" className="a-check" checked={allSel} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th>Product</th>
                <th>Issues</th>
                <th className="!text-right">Title</th>
                <th className="!text-right">Desc</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const st = state[r.id];
                return (
                  <tr key={r.id} data-selected={sel.has(r.id)}>
                    <td>
                      <input type="checkbox" className="a-check" checked={sel.has(r.id)} onChange={() => toggle(r.id)} disabled={st === "working"} aria-label={`Select ${r.name}`} />
                    </td>
                    <td className="min-w-[240px]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 flex-none overflow-hidden rounded-lg border border-line bg-ink-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {r.image && <img src={r.image} alt="" className="h-full w-full object-cover" loading="lazy" />}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/products/${r.id}`} className="line-clamp-1 text-[12.5px] hover:text-gold-2">
                            {r.name}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-mute">
                            {r.brand} <ProductStatusPill status={r.status} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex max-w-[360px] flex-wrap gap-1">
                        {r.issues.length ? (
                          r.issues.map((i) => (
                            <Pill key={i} tone={ISSUE[i]?.[1] || "mute"} dot={false}>
                              {ISSUE[i]?.[0] || i}
                            </Pill>
                          ))
                        ) : (
                          <Pill tone="lume">All good</Pill>
                        )}
                      </div>
                    </td>
                    <td className={cn("a-num text-right text-[12px]", r.seoTitle.length > 60 || r.seoTitle.length < 20 ? "text-ember" : "text-mute")}>{r.seoTitle.length}</td>
                    <td className={cn("a-num text-right text-[12px]", r.seoDesc.length > 155 || r.seoDesc.length < 50 ? "text-ember" : "text-mute")}>{r.seoDesc.length}</td>
                    <td className="text-[12px]">
                      {st === "working" ? (
                        <span className="inline-flex items-center gap-1.5 text-gold-2">
                          <Spinner className="!h-3 !w-3" /> Writing…
                        </span>
                      ) : st === "fixed" ? (
                        <Pill tone="lume">Fixed</Pill>
                      ) : st ? (
                        <span className="line-clamp-1 max-w-[180px] text-danger" title={st}>
                          {st}
                        </span>
                      ) : (
                        <span className="text-mute">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
