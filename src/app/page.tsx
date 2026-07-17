"use client";

import { useEffect, useState } from "react";
import { Car, TrendingUp, Droplet, Bell, Clock, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, Line, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";
import { WASHERS, INVENTORY, REQUESTS, REVENUE_TREND } from "@/lib/mock";
import { fetchDashboardStats } from "@/lib/queries";

function KpiCard({ label, value, sub, icon: Icon, accent = "var(--accent)" }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; accent?: string;
}) {
  return (
    <div className="fade-up rounded-2xl p-5 border border-line bg-panel">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
          <p className="font-[family-name:var(--font-display)] text-2xl mt-2">{value}</p>
          {sub && <p className="text-xs mt-1 font-[family-name:var(--font-mono)]" style={{ color: accent }}>{sub}</p>}
        </div>
        <div className="rounded-xl p-2.5 bg-panel-2" style={{ color: accent }}><Icon size={18} /></div>
      </div>
    </div>
  );
}

function SoapGauge({ label, ml, capacity = 700 }: { label: string; ml: number; capacity?: number }) {
  const pct = Math.max(0, Math.min(100, (ml / capacity) * 100));
  const critical = pct < 15;
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--panel-2)" strokeWidth="7" />
        <circle cx="38" cy="38" r={r} fill="none"
          stroke={critical ? "var(--red)" : "var(--accent)"} strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          strokeLinecap="round" transform="rotate(-90 38 38)" />
        <text x="38" y="42" textAnchor="middle" fontSize="13" fill="var(--text)" fontFamily="var(--font-mono)">
          {Math.round(pct)}%
        </text>
      </svg>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-[11px] font-[family-name:var(--font-mono)] text-muted">{ml} ml</p>
    </div>
  );
}

const fleetColors = { small: "#2FD5C8", medium: "#F2A93B", large: "#8B7CF6" };

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    carsToday: number;
    revenueToday: number;
    revenueYesterday: number;
    soapUsed: number;
    pendingRequests: number;
    avgMinutes: number;
    lowStock: number;
    washers: { name: string; ml: number }[];
    revenueTrend: { day: string; revenue: number; expenses?: number }[];
    fleetMix: { name: string; value: number; color: string }[];
  } | null>(null);

  useEffect(() => {
    fetchDashboardStats()
      .then((d) => {
        if (!d.washes.length && !d.inventory.length) throw new Error("no data");

        type WashRow = { vehicle_type_id: string; price: number | null; soap_used_ml: number | null; actual_minutes: number | null; started_at: string };
        type WasherRow = { washer_id: string; balance_ml: number; profiles: { full_name: string } | null };

        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

        const fleetCount: Record<string, number> = {};
        (d.washes as WashRow[]).forEach((w) => {
          fleetCount[w.vehicle_type_id] = (fleetCount[w.vehicle_type_id] ?? 0) + 1;
        });

        // Build 7-day revenue trend from transactions
        const dayMap: Record<string, number> = {};
        (d.washes as WashRow[]).forEach((w) => {
          const day = w.started_at?.slice(0, 10);
          if (day) dayMap[day] = (dayMap[day] ?? 0) + (w.price ?? 0);
        });
        const revenueTrend = Object.entries(dayMap).sort().map(([day, revenue]) => ({
          day: new Date(day + "T12:00:00").toLocaleDateString("en", { weekday: "short" }),
          revenue,
        }));

        const revenueToday = (d.washes as WashRow[]).filter((w) => w.started_at?.startsWith(today)).reduce((s, w) => s + (w.price ?? 0), 0);
        const revenueYesterday = (d.washes as WashRow[]).filter((w) => w.started_at?.startsWith(yesterday)).reduce((s, w) => s + (w.price ?? 0), 0);

        setStats({
          carsToday: d.washes.length,
          revenueToday,
          revenueYesterday,
          soapUsed: (d.washes as WashRow[]).reduce((s, w) => s + (w.soap_used_ml ?? 0), 0),
          pendingRequests: d.pendingRequests,
          avgMinutes: d.washes.length
            ? Math.round((d.washes as WashRow[]).reduce((s, w) => s + (w.actual_minutes ?? 0), 0) / d.washes.length)
            : 0,
          lowStock: (d.inventory as { status: string }[]).filter((i) => i.status !== "ok").length,
          washers: (d.washers as WasherRow[]).map((w) => ({
            name: w.profiles?.full_name ?? "Unknown",
            ml: w.balance_ml,
          })),
          revenueTrend: revenueTrend.length ? revenueTrend : REVENUE_TREND,
          fleetMix: Object.entries(fleetCount).map(([id, value]) => ({
            name: id.charAt(0).toUpperCase() + id.slice(1),
            value,
            color: fleetColors[id as keyof typeof fleetColors] ?? "#84939E",
          })),
        });
      })
      .catch(() => {
        setStats({
          carsToday: 37,
          revenueToday: 24600,
          revenueYesterday: 20800,
          soapUsed: 1240,
          pendingRequests: REQUESTS.filter((r) => r.status === "pending").length,
          avgMinutes: 41,
          lowStock: INVENTORY.filter((i) => i.status !== "ok").length,
          washers: WASHERS.map((w) => ({ name: w.name, ml: w.soap })),
          revenueTrend: REVENUE_TREND,
          fleetMix: [
            { name: "Small", value: 62, color: "#2FD5C8" },
            { name: "Medium", value: 28, color: "#F2A93B" },
            { name: "Large", value: 10, color: "#8B7CF6" },
          ],
        });
      });
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const revDelta = stats.revenueYesterday > 0
    ? Math.round(((stats.revenueToday - stats.revenueYesterday) / stats.revenueYesterday) * 100)
    : null;
  const revSub = revDelta !== null
    ? `${revDelta >= 0 ? "+" : ""}${revDelta}% vs yesterday`
    : "no prior data";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Cars Today" value={stats.carsToday} sub="washes completed" icon={Car} />
        <KpiCard label="Revenue Today" value={`${stats.revenueToday.toLocaleString()} birr`} sub={revSub} icon={TrendingUp} />
        <KpiCard label="Soap Used" value={`${stats.soapUsed.toLocaleString()} ml`} sub="today" icon={Droplet} accent="var(--amber)" />
        <KpiCard label="Pending Requests" value={stats.pendingRequests} sub={stats.pendingRequests > 0 ? "needs review" : "all clear"} icon={Bell} accent="var(--amber)" />
        <KpiCard label="Avg Wash Time" value={`${stats.avgMinutes} min`} sub="standard tracked" icon={Clock} />
        <KpiCard label="Low Stock Alerts" value={stats.lowStock} sub={stats.lowStock > 0 ? "action needed" : "stock healthy"} icon={AlertTriangle} accent={stats.lowStock > 0 ? "var(--red)" : "var(--accent)"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl p-5 border border-line bg-panel">
          <h3 className="font-[family-name:var(--font-display)] text-lg mb-4">Revenue — this week</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.revenueTrend}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FD5C8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2FD5C8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#243139" />
              <XAxis dataKey="day" stroke="#84939E" fontSize={12} />
              <YAxis stroke="#84939E" fontSize={12} />
              <Tooltip contentStyle={{ background: "#1C2830", border: "1px solid #243139", borderRadius: 8, color: "#E8EEF2" }} />
              <Area type="monotone" dataKey="revenue" stroke="#2FD5C8" fill="url(#rev)" strokeWidth={2} />
              {"expenses" in (stats.revenueTrend[0] ?? {}) && (
                <Line type="monotone" dataKey="expenses" stroke="#F2A93B" strokeWidth={2} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5 border border-line bg-panel">
          <h3 className="font-[family-name:var(--font-display)] text-lg mb-4">Fleet Mix Today</h3>
          {stats.fleetMix.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={stats.fleetMix} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {stats.fleetMix.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1C2830", border: "1px solid #243139", borderRadius: 8, color: "#E8EEF2" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {stats.fleetMix.map((e) => (
                  <div key={e.name} className="flex items-center gap-1.5 text-xs text-muted">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                    {e.name} ({e.value})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No washes recorded today.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-5 border border-line bg-panel">
        <h3 className="font-[family-name:var(--font-display)] text-lg mb-4">Washer Soap Balance</h3>
        <div className="flex flex-wrap gap-8 justify-around">
          {stats.washers.length > 0
            ? stats.washers.map((w, i) => <SoapGauge key={i} label={w.name.split(" ")[0]} ml={w.ml} />)
            : WASHERS.map((w) => <SoapGauge key={w.id} label={w.name.split(" ")[0]} ml={w.soap} />)
          }
        </div>
      </div>
    </div>
  );
}
