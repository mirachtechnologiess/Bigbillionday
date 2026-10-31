"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileUp, ListChecks, Play, RotateCcw, Settings2, Square, Table2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader, Pill, Spinner, Toggle } from "../ui";
import { api, downloadFile } from "../fetcher";
import { cn } from "@/lib/utils";
import { autoMap, IMPORT_FIELDS, IMPORT_KEYS, TEMPLATE_EXAMPLES } from "./fields";

const GROUPS = [...new Set(IMPORT_FIELDS.map((f) => f.group))];
const FIELD = Object.fromEntries(IMPORT_FIELDS.map((f) => [f.key, f]));
const REQUIRED = IMPORT_FIELDS.filter((f) => f.required).map((f) => f.key);

export default function Importer({ aiOn, productCount }) {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [opts, setOpts] = useState({ enrich: false, downloadImages: true, updateExisting: false, defaultStatus: "DRAFT" });
  const [drag, setDrag] = useState(false);
  const [run, setRun] = useState(null); // {done,total,created,updated,skipped,failed,running}
  const [results, setResults] = useState([]); // newest first
  const stopRef = useRef(false);
  const inputRef = useRef(null);

  const parse = (f) => {
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name) && f.type !== "text/csv") return toast.error("Please choose a .csv file");
    Papa.parse(f, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.replace(/^﻿/, "").trim(),
      complete: (res) => {
        const hs = (res.meta.fields || []).filter(Boolean);
        if (!hs.length || !res.data.length) return toast.error("That file has no header row or no data");
        setFile({ name: f.name, size: f.size });
        setHeaders(hs);
        setRows(res.data);
        setMapping(autoMap(hs));
        setResults([]);
        setRun(null);
        if (res.errors?.length) toast.message(`${res.errors.length} row(s) had parse issues; check the preview`);
        else toast.success(`Loaded ${res.data.length} rows`);
      },
      error: (err) => toast.error(err.message),
    });
  };

  const mappedKeys = Object.values(mapping).filter(Boolean);
  const missingRequired = REQUIRED.filter((k) => !mappedKeys.includes(k));
  const toTarget = (row) => {
    const out = {};
    for (const [h, k] of Object.entries(mapping)) if (k) out[k] = row[h] ?? "";
    return out;
  };
  const preview = useMemo(() => rows.slice(0, 20).map(toTarget), [rows, mapping]); // eslint-disable-line react-hooks/exhaustive-deps
  const previewCols = IMPORT_KEYS.filter((k) => mappedKeys.includes(k));

  const setMap = (h, k) => {
    const next = { ...mapping };
    if (k) for (const other of Object.keys(next)) if (next[other] === k) next[other] = "";
    next[h] = k;
    setMapping(next);
  };

  const start = async () => {
    if (missingRequired.length && !opts.updateExisting) return toast.error(`Map required columns: ${missingRequired.map((k) => FIELD[k].label).join(", ")}`);
    stopRef.current = false;
    setResults([]);
    const size = opts.enrich ? 5 : 25;
    const state = { done: 0, total: rows.length, created: 0, updated: 0, skipped: 0, failed: 0, warnings: 0, running: true };
    setRun({ ...state });
    for (let i = 0; i < rows.length; i += size) {
      if (stopRef.current) break;
      const chunk = rows.slice(i, i + size).map((r, j) => ({ index: i + j, data: toTarget(r) }));
      let res;
      try {
        res = (await api("/api/admin/import", { method: "POST", body: { rows: chunk, options: opts } })).results;
      } catch (e) {
        res = chunk.map((c) => ({ index: c.index, ok: false, error: e.message, warnings: [] }));
        if ([401, 403, 503].includes(e.status)) {
          toast.error(e.message);
          stopRef.current = true;
        }
      }
      for (const r of res) {
        if (r.ok) state[r.action === "updated" ? "updated" : "created"]++;
        else if (r.skipped) state.skipped++;
        else state.failed++;
        if (r.warnings?.length) state.warnings++;
      }
      state.done = Math.min(rows.length, i + size);
      setRun({ ...state });
      setResults((prev) => [...res.map((r) => ({ ...r, name: chunk.find((c) => c.index === r.index)?.data.name })).reverse(), ...prev]);
    }
    state.running = false;
    setRun({ ...state });
    toast.success(`Import ${stopRef.current ? "stopped" : "finished"}: ${state.created} created, ${state.updated} updated, ${state.skipped} skipped, ${state.failed} failed`);
  };

  const downloadErrors = () => {
    const bad = results.filter((r) => !r.ok).sort((a, b) => a.index - b.index);
    if (!bad.length) return;
    const data = bad.map((r) => ({ ...rows[r.index], error: r.error }));
    downloadFile(Papa.unparse({ fields: [...headers, "error"], data: data.map((d) => [...headers.map((h) => d[h] ?? ""), d.error]) }), `import-errors-${Date.now()}.csv`);
  };

  const downloadTemplate = () => {
    downloadFile(Papa.unparse({ fields: IMPORT_KEYS, data: TEMPLATE_EXAMPLES.map((r) => IMPORT_KEYS.map((k) => r[k] ?? "")) }), "premiumshopy-products-template.csv");
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResults([]);
    setRun(null);
  };

  const failedCount = results.filter((r) => !r.ok).length;
  const busy = run?.running;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Catalogue"
        title="Bulk import"
        description="Bring products in from any spreadsheet. Columns are auto-mapped, specs normalised, brands and categories created on the fly, and AI can fill whatever copy is missing."
        actions={
          <>
            <button className="a-btn a-btn-sm a-btn-ghost" onClick={downloadTemplate}>
              <FileSpreadsheet /> CSV template
            </button>
            <a className="a-btn a-btn-sm" href="/api/admin/export/products" download>
              <Download /> Export all products <span className="a-num text-mute">({productCount})</span>
            </a>
          </>
        }
      />

      {!rows.length ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            parse(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          className={cn(
            "a-dots flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center transition-colors",
            drag ? "border-gold bg-gold/5" : "border-line-2 hover:border-gold/60"
          )}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full border border-line-2 bg-ink-3">
            <FileUp className="h-5 w-5 text-gold" />
          </div>
          <div className="font-display text-2xl">Drop a CSV file</div>
          <p className="max-w-md text-[12.5px] text-mute">
            Shopify, WooCommerce, supplier sheets or our own template. Lists (images, tags, highlights, features) are separated with <span className="a-kbd">|</span>.
          </p>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => parse(e.target.files?.[0])} />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink-2 p-3 text-[12.5px]">
            <FileSpreadsheet className="h-4 w-4 text-gold" />
            <span className="font-medium">{file?.name}</span>
            <span className="text-mute">
              <span className="a-num">{rows.length}</span> rows · <span className="a-num">{headers.length}</span> columns · <span className="a-num">{mappedKeys.length}</span> mapped
            </span>
            <button className="a-btn a-btn-sm a-btn-ghost ml-auto" onClick={reset} disabled={busy}>
              <RotateCcw /> Choose another file
            </button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <Card title="Column mapping" icon={ListChecks} bodyClass="!p-0">
              {missingRequired.length > 0 && (
                <div className="flex items-center gap-2 border-b border-line bg-ember/5 px-4 py-2 text-[12px] text-ember">
                  <AlertTriangle className="h-3.5 w-3.5" /> Not mapped: {missingRequired.map((k) => FIELD[k].label).join(", ")}
                  {opts.updateExisting && <span className="text-mute">(ok when only updating by SKU)</span>}
                </div>
              )}
              <div className="max-h-[440px] overflow-auto">
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>CSV column</th>
                      <th>Sample</th>
                      <th>Maps to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((h) => {
                      const sample = rows.find((r) => r[h])?.[h] || "";
                      return (
                        <tr key={h}>
                          <td className="font-mono text-[12px]">{h}</td>
                          <td className="max-w-[220px] truncate text-[12px] text-mute" title={sample}>
                            {sample || "—"}
                          </td>
                          <td className="w-[220px]">
                            <select className={cn("a-input a-input-sm", mapping[h] && "!border-gold/40")} value={mapping[h] || ""} onChange={(e) => setMap(h, e.target.value)}>
                              <option value="">— ignore —</option>
                              {GROUPS.map((g) => (
                                <optgroup key={g} label={g}>
                                  {IMPORT_FIELDS.filter((f) => f.group === g).map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label}
                                      {f.required ? " *" : ""}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Options" icon={Settings2} bodyClass="space-y-4">
              <Toggle
                checked={opts.enrich}
                onChange={(v) => setOpts({ ...opts, enrich: v })}
                disabled={!aiOn}
                label="AI-enrich missing fields"
                hint={aiOn ? "Writes missing descriptions, highlights, tags and SEO, and infers specs. Slower: 5 rows per request." : "AI is not configured."}
              />
              <Toggle checked={opts.downloadImages} onChange={(v) => setOpts({ ...opts, downloadImages: v })} label="Download image URLs" hint="Copies remote images to our storage (optimised WebP). Off = hotlink the original URLs." />
              <Toggle
                checked={opts.updateExisting}
                onChange={(v) => setOpts({ ...opts, updateExisting: v })}
                label="Update existing products by SKU"
                hint="Rows whose SKU already exists update that product (blank cells keep current values). Off = such rows are skipped."
              />
              <label className="block">
                <span className="a-label">Default status for new products</span>
                <select className="a-input" value={opts.defaultStatus} onChange={(e) => setOpts({ ...opts, defaultStatus: e.target.value })}>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active (published)</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <span className="a-hint block">Used when the row has no status column value.</span>
              </label>
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                {busy ? (
                  <button className="a-btn" onClick={() => (stopRef.current = true)}>
                    <Square /> Stop after this batch
                  </button>
                ) : (
                  <button className="a-btn a-btn-gold" onClick={start} disabled={!rows.length}>
                    <Play /> Import {rows.length} row{rows.length === 1 ? "" : "s"}
                  </button>
                )}
              </div>
            </Card>
          </div>

          {run && (
            <Card
              title={
                <span className="flex items-center gap-2">
                  {busy ? <Spinner className="text-gold" /> : <CheckCircle2 className="h-4 w-4 text-lume" />} {busy ? "Importing" : "Import complete"}
                </span>
              }
              actions={
                failedCount > 0 && (
                  <button className="a-btn a-btn-sm" onClick={downloadErrors}>
                    <Download /> Error rows CSV ({failedCount})
                  </button>
                )
              }
              bodyClass="space-y-3"
            >
              <div className="flex items-center justify-between text-[12px]">
                <span className="a-num">
                  {run.done}/{run.total}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <Pill tone="lume">{run.created} created</Pill>
                  <Pill tone="info">{run.updated} updated</Pill>
                  <Pill tone="mute">{run.skipped} skipped</Pill>
                  <Pill tone="danger">{run.failed} failed</Pill>
                  {run.warnings > 0 && <Pill tone="gold">{run.warnings} with warnings</Pill>}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-4">
                <motion.div className="h-full bg-gradient-to-r from-gold-3 via-gold to-lume" animate={{ width: `${(run.done / Math.max(1, run.total)) * 100}%` }} />
              </div>
              <div className="max-h-[320px] overflow-auto rounded-xl border border-line bg-ink/60 font-mono text-[11.5px]">
                {results.map((r) => (
                  <div key={r.index} className="flex items-start gap-2 border-b border-line px-3 py-1.5 last:border-0">
                    <span className="w-12 flex-none text-mute">#{r.index + 2}</span>
                    {r.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-lume" /> : r.skipped ? <Square className="mt-0.5 h-3.5 w-3.5 flex-none text-mute" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 flex-none text-danger" />}
                    <span className="min-w-0 flex-1">
                      <span className="text-bone-2">
                        {r.ok ? (
                          <Link href={`/admin/products/${r.id}`} className="hover:text-gold-2">
                            {r.action} · {r.name || r.id}
                          </Link>
                        ) : (
                          <>
                            {r.name || "(no name)"} · <span className={r.skipped ? "text-mute" : "text-danger"}>{r.error}</span>
                          </>
                        )}
                      </span>
                      {r.warnings?.map((w, i) => (
                        <span key={i} className="block text-gold-2/80">
                          ⚠ {w}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
                {!results.length && <div className="px-3 py-4 text-mute">Waiting for the first batch…</div>}
              </div>
            </Card>
          )}

          <Card title={`Preview · first ${Math.min(20, rows.length)} rows as they will be imported`} icon={Table2} bodyClass="!p-0">
            {previewCols.length ? (
              <div className="max-h-[420px] overflow-auto">
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {previewCols.map((k) => (
                        <th key={k}>{FIELD[k].label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i}>
                        <td className="a-num text-mute">{i + 2}</td>
                        {previewCols.map((k) => (
                          <td key={k} className="max-w-[220px] truncate text-[12px]" title={String(r[k] ?? "")}>
                            {String(r[k] ?? "") || <span className="text-mute">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-6 text-center text-[12.5px] text-mute">Map at least one column to see a preview.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
