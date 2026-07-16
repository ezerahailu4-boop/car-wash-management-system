"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Car, TrendingUp, Droplet } from "lucide-react";
import { WASHERS } from "@/lib/mock";
import { fetchProfiles } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; full_name: string; role: string; phone: string | null; active: boolean; created_at?: string };

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  administrator: { bg: "#2a1f4a", fg: "var(--violet)" },
  manager: { bg: "#123A34", fg: "var(--accent)" },
  store_keeper: { bg: "#3A2E14", fg: "var(--amber)" },
  washer: { bg: "#1c2830", fg: "var(--muted)" },
};

export default function EmployeesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [washerStats, setWasherStats] = useState<Record<string, { cars: number; revenue: number; soap: number }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchProfiles();
      if (data.length) {
        setProfiles(data);
        // fetch today's stats per washer
        const today = new Date().toISOString().slice(0, 10);
        const supabase = createClient();
        const { data: txns } = await supabase
          .from("wash_transactions")
          .select("washer_id, price")
          .gte("started_at", `${today}T00:00:00`)
          .eq("status", "completed");

        const { data: soap } = await supabase
          .from("washer_inventory")
          .select("washer_id, balance_ml");

        type TxnRow  = { washer_id: string; price: number | null };
        type SoapRow = { washer_id: string; balance_ml: number };

        const stats: Record<string, { cars: number; revenue: number; soap: number }> = {};
        (txns ?? [] as TxnRow[]).forEach((t) => {
          const row = t as TxnRow;
          if (!stats[row.washer_id]) stats[row.washer_id] = { cars: 0, revenue: 0, soap: 0 };
          stats[row.washer_id].cars++;
          stats[row.washer_id].revenue += row.price ?? 0;
        });
        (soap ?? [] as SoapRow[]).forEach((s) => {
          const row = s as SoapRow;
          if (!stats[row.washer_id]) stats[row.washer_id] = { cars: 0, revenue: 0, soap: 0 };
          stats[row.washer_id].soap = row.balance_ml;
        });
        setWasherStats(stats);
      } else {
        throw new Error("no data");
      }
    } catch {
      setProfiles(
        WASHERS.map((w, i) => ({
          id: w.id, full_name: w.name, role: i === 4 ? "manager" : "washer",
          phone: null, active: true,
        }))
      );
      const stats: Record<string, { cars: number; revenue: number; soap: number }> = {};
      WASHERS.forEach((w) => { stats[w.id] = { cars: w.carsToday, revenue: w.revenueToday, soap: w.soap }; });
      setWasherStats(stats);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const roles = ["all", ...Array.from(new Set(profiles.map((p) => p.role)))];
  const filtered = profiles.filter((p) => filter === "all" || p.role === filter);

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: profiles.length },
          { label: "Active", value: profiles.filter((p) => p.active).length },
          { label: "Washers", value: profiles.filter((p) => p.role === "washer").length },
          { label: "Management", value: profiles.filter((p) => p.role !== "washer").length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-4 border border-line bg-panel">
            <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
            <p className="font-[family-name:var(--font-display)] text-2xl mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {roles.map((r) => (
            <button key={r} onClick={() => setFilter(r)}
              className="px-3 py-1.5 rounded-xl text-xs capitalize transition"
              style={{ background: filter === r ? "var(--panel-2)" : "transparent", color: filter === r ? "var(--accent)" : "var(--muted)", border: "1px solid", borderColor: filter === r ? "var(--accent)" : "var(--line)" }}>
              {r.replace("_", " ")}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2.5 rounded-xl bg-panel-2 border border-line text-muted hover:text-text"><RefreshCw size={15} /></button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const rc = ROLE_COLORS[p.role] ?? ROLE_COLORS.washer;
            const s = washerStats[p.id] ?? { cars: 0, revenue: 0, soap: 0 };
            const soapPct = Math.min(100, (s.soap / 700) * 100);
            const initials = p.full_name.split(" ").map((n) => n[0]).join("");
            return (
              <div key={p.id} onClick={() => router.push(`/employees/${p.id}`)}
                className="rounded-2xl p-5 border border-line bg-panel cursor-pointer hover:border-accent transition"
                style={{ opacity: p.active ? 1 : 0.5 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-[family-name:var(--font-display)] text-lg bg-panel-2 text-accent">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.full_name}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wide" style={{ background: rc.bg, color: rc.fg }}>
                      {p.role.replace("_", " ")}
                    </span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.active ? "var(--accent)" : "var(--red)" }} title={p.active ? "Active" : "Inactive"} />
                </div>

                {p.role === "washer" && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { label: "Cars Today", value: s.cars, icon: Car },
                        { label: "Revenue", value: `${s.revenue.toLocaleString()} birr`, icon: TrendingUp },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="rounded-xl p-3 bg-panel-2 border border-line">
                          <div className="flex items-center gap-1.5 mb-1 text-muted"><Icon size={12} /><p className="text-[10px] uppercase tracking-wide">{label}</p></div>
                          <p className="font-[family-name:var(--font-mono)] text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted flex items-center gap-1"><Droplet size={11} /> Soap Balance</span>
                        <span className="font-[family-name:var(--font-mono)]" style={{ color: soapPct < 15 ? "var(--red)" : "var(--accent)" }}>{s.soap} ml</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-panel-2">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${soapPct}%`, background: soapPct < 15 ? "var(--red)" : "var(--accent)" }} />
                      </div>
                    </div>
                  </>
                )}

                {p.phone && (
                  <p className="text-xs text-muted font-[family-name:var(--font-mono)] mt-3">{p.phone}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
