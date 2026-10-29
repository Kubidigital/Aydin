"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEuro, formatEuroShort } from "@/lib/format";
import type { DashboardData } from "@/lib/stats";

// Palette catégorielle validée (thème sombre) : bleu puis orange.
const SERIES_1 = "#3987e5";
const SERIES_2 = "#d95926";
const AXIS = "#64748b";
const GRID = "rgba(255,255,255,0.06)";

const tooltipStyle = {
  contentStyle: {
    background: "#151824",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    fontSize: 12,
    color: "#e2e8f0",
  },
  labelStyle: { color: "#94a3b8", marginBottom: 4 },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

export function RevenueChart({ data }: { data: DashboardData["monthly"] }) {
  const empty = data.every((m) => m.encaisse === 0 && m.signe === 0);
  return (
    <div className="relative h-72">
      {empty && (
        <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-slate-500">
          Les montants apparaîtront dès vos premiers devis signés et factures payées.
        </p>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="22%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={56}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k€` : `${v} €`)} />
          <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [formatEuro(v), name]} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 8 }} />
          <Bar dataKey="encaisse" name="Encaissé" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          <Bar dataKey="signe" name="Signé" fill={SERIES_2} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PipelineChart({ data }: { data: DashboardData["pipeline"] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number, _name: string, item: { payload?: { value: number } }) => [
              `${v} contact(s) · ${formatEuroShort(item.payload?.value ?? 0)}`,
              "Opportunités",
            ]}
          />
          <Bar dataKey="count" name="Contacts" fill="#9085e9" radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false}
            label={{ position: "right", fill: "#94a3b8", fontSize: 11 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
