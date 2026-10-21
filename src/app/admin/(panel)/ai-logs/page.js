import { paging, requireAdminPage } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { aiEnabled, TEXT_MODEL, VISION_MODEL } from "@/lib/ai";
import { Card, Empty, PageHeader, Pagination, Pill } from "@/components/admin/ui";
import LogFilters from "@/components/admin/ai-logs/LogFilters";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI logs" };

const fmt = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const num = (n) => Number(n || 0).toLocaleString("en-IN");

function baseHost() {
  try {
    return new URL(process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").host;
  } catch {
    return "invalid URL";
  }
}

export default async function AiLogsPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;
  const { page, per, skip, take } = paging(sp, 50);
  const task = typeof sp?.task === "string" && sp.task ? sp.task.slice(0, 60) : null;
  const okFilter = sp?.ok === "ok" ? true : sp?.ok === "failed" ? false : null;
  const where = { ...(task ? { task } : {}), ...(okFilter !== null ? { ok: okFilter } : {}) };
  const since = new Date(Date.now() - 7 * 86_400_000);

  const [rows, total, week, weekFailed, byTask, byTaskFailed, tasks] = await Promise.all([
    db.aiLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    db.aiLog.count({ where }),
    db.aiLog.aggregate({ where: { createdAt: { gte: since } }, _count: true, _sum: { tokens: true } }),
    db.aiLog.count({ where: { createdAt: { gte: since }, ok: false } }),
    db.aiLog.groupBy({ by: ["task"], where: { createdAt: { gte: since } }, _count: true, _sum: { tokens: true }, orderBy: { _count: { task: "desc" } } }),
    db.aiLog.groupBy({ by: ["task"], where: { createdAt: { gte: since }, ok: false }, _count: true }),
    db.aiLog.findMany({ distinct: ["task"], select: { task: true }, orderBy: { task: "asc" } }),
  ]);

  const calls = week._count || 0;
  const failRate = calls ? (weekFailed / calls) * 100 : 0;
  const failMap = Object.fromEntries(byTaskFailed.map((t) => [t.task, t._count]));
  const maxTask = Math.max(1, ...byTask.map((t) => t._count));
  const on = await aiEnabled();

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Atelier · AI" title="AI logs" description="Every model call the store makes: what it was for, which model answered, tokens spent, and what went wrong." />

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card title="Status">
          <dl className="space-y-3 text-[12.5px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-mute">AI configured</dt>
              <dd>{on ? <Pill tone="lume">Yes</Pill> : <Pill tone="danger">No: add key in Settings → AI</Pill>}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-mute">Text model</dt>
              <dd className="truncate font-mono text-[11.5px] text-bone">{TEXT_MODEL}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-mute">Vision model</dt>
              <dd className="truncate font-mono text-[11.5px] text-bone">{VISION_MODEL}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-mute">Endpoint host</dt>
              <dd className="truncate font-mono text-[11.5px] text-bone">{baseHost()}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Last 7 days">
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              ["Calls", num(calls), "text-bone"],
              ["Failure rate", `${failRate.toFixed(1)}%`, failRate > 10 ? "text-ember" : "text-lume"],
              ["Tokens", num(week._sum.tokens), "text-gold-2"],
            ].map(([label, value, cls]) => (
              <div key={label} className="rounded-xl border border-line bg-ink-3/50 p-3">
                <div className="a-label !mb-1">{label}</div>
                <div className={`a-num text-[22px] ${cls}`}>{value}</div>
              </div>
            ))}
          </div>
          {byTask.length ? (
            <ul className="space-y-1.5">
              {byTask.map((t) => (
                <li key={t.task} className="grid grid-cols-[140px_1fr_auto] items-center gap-3 text-[12px]">
                  <a href={`/admin/ai-logs?task=${encodeURIComponent(t.task)}`} className="truncate font-mono text-bone-2 hover:text-gold-2">
                    {t.task}
                  </a>
                  <span className="relative h-2 overflow-hidden rounded-full bg-ink-4">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-gold/80" style={{ width: `${(t._count / maxTask) * 100}%` }} />
                    {failMap[t.task] ? <span className="absolute inset-y-0 left-0 rounded-full bg-ember" style={{ width: `${(failMap[t.task] / maxTask) * 100}%` }} /> : null}
                  </span>
                  <span className="a-num whitespace-nowrap text-right text-mute">
                    <span className="text-bone">{t._count}</span>
                    {failMap[t.task] ? <span className="text-ember"> · {failMap[t.task]} failed</span> : null} · {num(t._sum.tokens)} tok
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-[12.5px] text-mute">No AI calls in the last 7 days.</p>
          )}
        </Card>
      </div>

      <LogFilters tasks={tasks.map((t) => t.task)} />

      {rows.length ? (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Model</th>
                <th>Result</th>
                <th className="!text-right">Tokens</th>
                <th>Error</th>
                <th>When (IST)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-[12px]">{r.task}</td>
                  <td className="max-w-[220px] truncate font-mono text-[11.5px] text-mute" title={r.model}>
                    {r.model}
                  </td>
                  <td>{r.ok ? <Pill tone="lume">ok</Pill> : <Pill tone="danger">failed</Pill>}</td>
                  <td className="a-num text-right text-[12px]">{r.tokens ? num(r.tokens) : "—"}</td>
                  <td className="max-w-[320px] truncate text-[12px] text-danger/90" title={r.error || undefined}>
                    {r.error || <span className="text-mute">—</span>}
                  </td>
                  <td className="whitespace-nowrap text-[12px] text-mute">{fmt(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No log entries">{task || okFilter !== null ? "Nothing matches these filters." : "AI calls will be recorded here as they happen."}</Empty>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / per))} total={total} />
    </div>
  );
}
