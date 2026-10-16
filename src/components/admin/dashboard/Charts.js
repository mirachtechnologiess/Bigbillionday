"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { Card } from "../ui";
import { formatINR } from "@/lib/utils";

const GOLD = "#f2600c";
const LUME = "#0f8a5f";
const EMBER = "#e0243f";
const GRID = "rgba(17,24,39,.07)";
const AXIS = { fill: "#6b7280", fontSize: 10.5, fontFamily: "var(--font-mono)" };

const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const compactINR = (n) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${(n / 1e3).toFixed(0)}k` : `₹${n}`);

function ChartTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line-2 px-3 py-2 text-[12px] shadow-lg" style={{ background: "#ffffff" }}>
      <div className="mb-1 font-mono text-[10.5px] uppercase tracking-wider text-mute">{shortDate(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-bone-2">{p.name}</span>
          <span className="a-num ml-auto pl-3 text-bone">{money ? formatINR(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Charts({ series = [] }) {
  const total = series.reduce((s, d) => s + d.revenue, 0);
  const orders = series.reduce((s, d) => s + d.orders, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card title="Revenue · 30 days" icon={TrendingUp} className="lg:col-span-3" actions={<span className="a-num text-[12px] text-gold-2">{formatINR(total)}</span>}>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tickFormatter={compactINR} tick={AXIS} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<ChartTooltip money />} cursor={{ stroke: "rgba(242,96,12,.35)", strokeDasharray: "3 3" }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke={GOLD} strokeWidth={2} fill="url(#revFill)" activeDot={{ r: 4, fill: GOLD, stroke: "#ffffff", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Orders by day" icon={BarChart3} className="lg:col-span-2" actions={<span className="a-num text-[12px] text-lume">{orders}</span>}>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series.map((d) => ({ ...d, kept: d.orders - d.cancelled }))} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(17,24,39,.04)" }} />
              <Bar dataKey="kept" name="Orders" stackId="o" fill={LUME} fillOpacity={0.85} radius={[0, 0, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled/returned" stackId="o" fill={EMBER} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
