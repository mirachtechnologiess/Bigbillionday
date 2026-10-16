"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, ClipboardCopy, Download, Mail, Newspaper, Trash2, TrendingUp, Users } from "lucide-react";
import { api, downloadFile } from "@/components/admin/fetcher";
import { ConfirmButton, CopyButton, Empty, PageHeader, Pagination, SearchInput, Spinner, Stat, fmtDate, timeAgo } from "@/components/admin/ui";

export default function NewsletterManager({ subscribers, stats, page, pages, matching, q, canDelete }) {
  const router = useRouter();
  const [copying, setCopying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [removed, setRemoved] = useState(() => new Set());
  const rows = subscribers.filter((s) => !removed.has(s.id));

  const growth = stats.prev30 > 0 ? ((stats.last30 - stats.prev30) / stats.prev30) * 100 : stats.last30 > 0 ? 100 : 0;

  const copyAll = async () => {
    setCopying(true);
    try {
      const { emails } = await api("/api/admin/newsletter?emails=1");
      if (!emails.length) return toast.info("No subscribers yet");
      await navigator.clipboard.writeText(emails.join(", "));
      toast.success(`Copied ${emails.length} email${emails.length === 1 ? "" : "s"} — paste into BCC`);
    } catch (e) {
      toast.error(e.message || "Copy failed");
    } finally {
      setCopying(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/newsletter/export", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Export failed (${res.status})`);
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || "newsletter-subscribers.csv";
      downloadFile(await res.blob(), name);
      toast.success("CSV downloaded");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  const remove = async (s) => {
    await api(`/api/admin/newsletter/${s.id}`, { method: "DELETE" });
    setRemoved((r) => new Set(r).add(s.id));
    toast.success(`${s.email} unsubscribed`);
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Storefront"
        title="Newsletter"
        description="Subscribers from the footer sign-up. Export for your email tool, or copy addresses for a quick BCC blast."
        actions={
          <>
            <button className="a-btn" onClick={copyAll} disabled={copying || !stats.total}>
              {copying ? <Spinner /> : <ClipboardCopy />} Copy all emails
            </button>
            <button className="a-btn a-btn-gold" onClick={exportCsv} disabled={exporting || !stats.total}>
              {exporting ? <Spinner /> : <Download />} Export CSV
            </button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Subscribers" value={stats.total.toLocaleString("en-IN")} icon={Users} sub="all time" />
        <Stat label="Last 30 days" value={`+${stats.last30}`} delta={growth} sub="vs prior 30d" spark={stats.series} icon={TrendingUp} tone="lume" />
        <Stat label="Last 7 days" value={`+${stats.last7}`} sub={`${(stats.last7 / 7).toFixed(1)}/day avg`} icon={CalendarDays} />
        <Stat label="Today" value={`+${stats.today}`} sub="IST" icon={Mail} />
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="Search email…" className="sm:w-80" />
        <span className="text-[12px] text-mute">
          {q ? (
            <>
              <span className="a-num text-bone">{matching}</span> match “{q}”
            </>
          ) : (
            <>
              <span className="a-num text-bone">{stats.total}</span> subscribers
            </>
          )}
        </span>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Newspaper} title={q ? "No matches" : "No subscribers yet"}>
          {q ? "Try a different search." : "Sign-ups from the storefront footer will appear here."}
        </Empty>
      ) : (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Subscribed (IST)</th>
                <th className="hidden sm:table-cell">Ago</th>
                <th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-[12.5px]">{s.email}</td>
                  <td className="a-num whitespace-nowrap text-[12px] text-bone-2">{fmtDate(s.createdAt, true)}</td>
                  <td className="hidden text-[12px] text-mute sm:table-cell">{timeAgo(s.createdAt)}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <CopyButton text={s.email} className="a-btn a-btn-ghost a-btn-sm a-btn-icon" />
                      {canDelete && (
                        <ConfirmButton className="a-btn a-btn-ghost a-btn-sm a-btn-icon" ariaLabel={`Remove ${s.email}`} title="Remove subscriber?" message={`${s.email} will no longer receive newsletters.`} confirmLabel="Remove" onConfirm={() => remove(s)}>
                          <Trash2 />
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pages} total={matching} />
    </div>
  );
}
