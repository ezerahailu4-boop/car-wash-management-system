"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Power, Users, ShieldCheck, Settings2, X, Check, Droplet, TrendingUp } from "lucide-react";
import { STAFF, VEHICLE_TYPES, WASHERS } from "@/lib/mock";
import { createClient } from "@/lib/supabase/client";

type StaffMember = (typeof STAFF)[number];

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  administrator: { bg: "#2a1f4a", fg: "var(--violet)" },
  manager:       { bg: "#123A34", fg: "var(--accent)" },
  store_keeper:  { bg: "#3A2E14", fg: "var(--amber)" },
  washer:        { bg: "#1c2830", fg: "var(--muted)" },
};

const TABS = ["Users", "Soap Tracking", "Pricing", "System"] as const;
type Tab = (typeof TABS)[number];

type WasherStat = { id: string; name: string; soapOut: number; revenue: number; cars: number };

const PRICING_INIT = VEHICLE_TYPES.map((v) => ({ ...v }));

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-[family-name:var(--font-display)] text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("Users");
  const [staff, setStaff] = useState(STAFF);
  const [pricing, setPricing] = useState(PRICING_INIT);
  const [editUser, setEditUser] = useState<StaffMember | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", role: "washer", phone: "" });
  const [washerStats, setWasherStats] = useState<WasherStat[]>([]);
  const [trackLoading, setTrackLoading] = useState(false);

  async function loadTracking() {
    setTrackLoading(true);
    const supabase = createClient();
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: txns } = await supabase
        .from("wash_transactions")
        .select("washer_id, price, soap_used_ml, profiles(full_name)")
        .gte("started_at", `${today}T00:00:00`)
        .eq("status", "completed");

      const map: Record<string, WasherStat> = {};
      (txns ?? []).forEach((t) => {
        const name = (t.profiles as { full_name: string } | null)?.full_name ?? t.washer_id;
        if (!map[t.washer_id]) map[t.washer_id] = { id: t.washer_id, name, soapOut: 0, revenue: 0, cars: 0 };
        map[t.washer_id].soapOut  += t.soap_used_ml ?? 0;
        map[t.washer_id].revenue  += t.price ?? 0;
        map[t.washer_id].cars     += 1;
      });

      const result = Object.values(map);
      setWasherStats(result.length ? result : WASHERS.map((w) => ({
        id: w.id, name: w.name, soapOut: w.carsToday * 10,
        revenue: w.revenueToday, cars: w.carsToday,
      })));
    } catch {
      setWasherStats(WASHERS.map((w) => ({
        id: w.id, name: w.name, soapOut: w.carsToday * 10,
        revenue: w.revenueToday, cars: w.carsToday,
      })));
    }
    setTrackLoading(false);
  }

  useEffect(() => { loadTracking(); }, []);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function toggleActive(id: string) {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
    notify("Staff status updated.");
  }

  function saveUser() {
    if (!form.name) return;
    if (editUser) {
      setStaff((prev) => prev.map((s) => (s.id === editUser.id ? { ...s, ...form } : s)));
      notify("User updated.");
    } else {
      setStaff((prev) => [...prev, { id: String(Date.now()), ...form, active: true, joined: new Date().toISOString().slice(0, 10) }]);
      notify("User added.");
    }
    setEditUser(null);
    setShowAdd(false);
    setForm({ name: "", role: "washer", phone: "" });
  }

  function openEdit(s: StaffMember) {
    setEditUser(s);
    setForm({ name: s.name, role: s.role, phone: s.phone });
  }

  function savePricing() {
    notify("Pricing saved (demo — connect Supabase to persist).");
  }

  const activeCount = staff.filter((s) => s.active).length;
  const roleBreakdown = ["washer", "manager", "store_keeper", "administrator"].map((r) => ({
    role: r,
    count: staff.filter((s) => s.role === r).length,
  }));

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: staff.length, icon: Users, accent: "var(--accent)" },
          { label: "Active", value: activeCount, icon: ShieldCheck, accent: "var(--accent)" },
          { label: "Inactive", value: staff.length - activeCount, icon: Power, accent: "var(--red)" },
          { label: "Roles", value: roleBreakdown.filter((r) => r.count > 0).length, icon: Settings2, accent: "var(--violet)" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-2xl p-5 border border-line bg-panel flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
              <p className="font-[family-name:var(--font-display)] text-2xl mt-1">{value}</p>
            </div>
            <div className="rounded-xl p-2.5 bg-panel-2" style={{ color: accent }}><Icon size={18} /></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm transition"
            style={{ background: tab === t ? "var(--panel-2)" : "transparent", color: tab === t ? "var(--accent)" : "var(--muted)", border: "1px solid", borderColor: tab === t ? "var(--accent)" : "var(--line)" }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === "Users" && (
        <div className="rounded-2xl border border-line bg-panel overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-display)] text-lg">Staff Management</h3>
            <button onClick={() => { setShowAdd(true); setForm({ name: "", role: "washer", phone: "" }); }} className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-[#06201D] flex items-center gap-2">
              <Plus size={16} /> Add Staff
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-t border-b border-line">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const rc = ROLE_COLORS[s.role] ?? ROLE_COLORS.washer;
                return (
                  <tr key={s.id} className="border-b border-line" style={{ opacity: s.active ? 1 : 0.5 }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-[family-name:var(--font-display)] bg-panel-2 text-accent">
                          {s.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        {s.name}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wide" style={{ background: rc.bg, color: rc.fg }}>
                        {s.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-[family-name:var(--font-mono)] text-xs text-muted">{s.phone}</td>
                    <td className="px-5 py-3.5 font-[family-name:var(--font-mono)] text-xs text-muted">{s.joined}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-[family-name:var(--font-mono)] uppercase" style={{ background: s.active ? "#123A34" : "#3A1A1A", color: s.active ? "var(--accent)" : "var(--red)" }}>
                        {s.active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(s)} className="px-3 py-1.5 rounded-xl text-xs bg-panel-2 border border-line flex items-center gap-1.5 text-muted hover:text-text">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => toggleActive(s.id)} className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5" style={{ background: s.active ? "#3A1A1A" : "#123A34", color: s.active ? "var(--red)" : "var(--accent)" }}>
                          <Power size={13} /> {s.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Soap Tracking Tab */}
      {tab === "Soap Tracking" && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Total Soap Out Today", value: `${washerStats.reduce((s, w) => s + w.soapOut, 0).toLocaleString()} ml`, icon: Droplet, accent: "var(--amber)" },
              { label: "Total Revenue Today",  value: `${washerStats.reduce((s, w) => s + w.revenue, 0).toLocaleString()} birr`, icon: TrendingUp, accent: "var(--accent)" },
              { label: "Total Cars Today",      value: washerStats.reduce((s, w) => s + w.cars, 0), icon: Users, accent: "var(--accent)" },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="rounded-2xl p-5 border border-line bg-panel flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
                  <p className="font-[family-name:var(--font-display)] text-2xl mt-1">{value}</p>
                </div>
                <div className="rounded-xl p-2.5 bg-panel-2" style={{ color: accent }}><Icon size={18} /></div>
              </div>
            ))}
          </div>

          {/* Per-washer breakdown */}
          <div className="rounded-2xl border border-line bg-panel overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-display)] text-lg">Per-Washer Soap & Revenue — Today</h3>
              <button onClick={loadTracking} className="p-2.5 rounded-xl bg-panel-2 border border-line text-muted hover:text-text text-xs px-3">
                Refresh
              </button>
            </div>
            {trackLoading ? (
              <div className="flex items-center justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted border-t border-b border-line">
                    <th className="px-5 py-3">Washer</th>
                    <th className="px-5 py-3">Cars</th>
                    <th className="px-5 py-3">Soap Used</th>
                    <th className="px-5 py-3">Revenue</th>
                    <th className="px-5 py-3">Soap / Revenue Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {washerStats.map((w) => {
                    const ratio = w.revenue > 0 ? ((w.soapOut / w.revenue) * 100).toFixed(1) : "0.0";
                    const totalSoap = washerStats.reduce((s, x) => s + x.soapOut, 0);
                    const pct = totalSoap > 0 ? (w.soapOut / totalSoap) * 100 : 0;
                    return (
                      <tr key={w.id} className="border-b border-line hover:bg-panel-2 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-[family-name:var(--font-display)] bg-panel-2 text-accent">
                              {w.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            {w.name}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-[family-name:var(--font-mono)]">{w.cars}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-panel-2 w-20">
                              <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-[family-name:var(--font-mono)] text-xs text-amber-400">{w.soapOut} ml</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-[family-name:var(--font-mono)] text-xs text-accent">{w.revenue.toLocaleString()} birr</td>
                        <td className="px-5 py-3.5 font-[family-name:var(--font-mono)] text-xs text-muted">{ratio} ml / birr</td>
                      </tr>
                    );
                  })}
                  {washerStats.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">No data yet today.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Soap Tracking Tab */}
      {tab === "Soap Tracking" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Total Soap Out Today", value: `${washerStats.reduce((s, w) => s + w.soapOut, 0).toLocaleString()} ml`, icon: Droplet, accent: "var(--amber)" },
              { label: "Total Revenue Today",  value: `${washerStats.reduce((s, w) => s + w.revenue, 0).toLocaleString()} birr`, icon: TrendingUp, accent: "var(--accent)" },
              { label: "Total Cars Today",      value: washerStats.reduce((s, w) => s + w.cars, 0), icon: Users, accent: "var(--accent)" },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="rounded-2xl p-5 border border-line bg-panel flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
                  <p className="font-[family-name:var(--font-display)] text-2xl mt-1">{value}</p>
                </div>
                <div className="rounded-xl p-2.5 bg-panel-2" style={{ color: accent }}><Icon size={18} /></div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-line bg-panel overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-display)] text-lg">Per-Washer Soap & Revenue — Today</h3>
              <button onClick={loadTracking} className="px-3 py-2 rounded-xl bg-panel-2 border border-line text-muted hover:text-text text-xs">Refresh</button>
            </div>
            {trackLoading ? (
              <div className="flex items-center justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted border-t border-b border-line">
                    <th className="px-5 py-3">Washer</th>
                    <th className="px-5 py-3">Cars</th>
                    <th className="px-5 py-3">Soap Used</th>
                    <th className="px-5 py-3">Revenue</th>
                    <th className="px-5 py-3">Soap / Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {washerStats.map((w) => {
                    const ratio = w.revenue > 0 ? ((w.soapOut / w.revenue) * 100).toFixed(1) : "0.0";
                    const totalSoap = washerStats.reduce((s, x) => s + x.soapOut, 0);
                    const pct = totalSoap > 0 ? (w.soapOut / totalSoap) * 100 : 0;
                    return (
                      <tr key={w.id} className="border-b border-line hover:bg-panel-2 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-[family-name:var(--font-display)] bg-panel-2 text-accent">
                              {w.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            {w.name}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-[family-name:var(--font-mono)]">{w.cars}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-panel-2 w-20">
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "var(--amber)" }} />
                            </div>
                            <span className="font-[family-name:var(--font-mono)] text-xs" style={{ color: "var(--amber)" }}>{w.soapOut} ml</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-[family-name:var(--font-mono)] text-xs text-accent">{w.revenue.toLocaleString()} birr</td>
                        <td className="px-5 py-3.5 font-[family-name:var(--font-mono)] text-xs text-muted">{ratio} ml/birr</td>
                      </tr>
                    );
                  })}
                  {washerStats.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">No data yet today.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Pricing Tab */}
      {tab === "Pricing" && (
        <div className="rounded-2xl border border-line bg-panel p-6 space-y-5">
          <h3 className="font-[family-name:var(--font-display)] text-lg">Vehicle Type Pricing</h3>
          <div className="space-y-4">
            {pricing.map((v, i) => (
              <div key={v.id} className="rounded-xl p-4 border border-line bg-panel-2 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <p className="text-xs text-muted mb-1 uppercase tracking-wide">{v.name}</p>
                  <p className="text-[11px] text-muted font-[family-name:var(--font-mono)]">{v.examples}</p>
                </div>
                {[
                  { label: "Price (birr)", key: "default_price" as const },
                  { label: "Soap (ml)", key: "default_soap_ml" as const },
                  { label: "Std. Minutes", key: "standard_minutes" as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-xs text-muted uppercase tracking-wide">{label}</label>
                    <input
                      type="number"
                      value={v[key]}
                      onChange={(e) => setPricing((prev) => prev.map((p, j) => j === i ? { ...p, [key]: Number(e.target.value) } : p))}
                      className="w-full mt-1 rounded-xl px-3 py-2 text-sm bg-panel border border-line outline-none focus:ring-2 focus:ring-accent font-[family-name:var(--font-mono)]"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <button onClick={savePricing} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-accent text-[#06201D] flex items-center gap-2">
            <Check size={16} /> Save Pricing
          </button>
        </div>
      )}

      {/* System Tab */}
      {tab === "System" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-line bg-panel p-6 space-y-4">
            <h3 className="font-[family-name:var(--font-display)] text-lg">Role Distribution</h3>
            {roleBreakdown.map(({ role, count }) => {
              const rc = ROLE_COLORS[role] ?? ROLE_COLORS.washer;
              const pct = staff.length ? (count / staff.length) * 100 : 0;
              return (
                <div key={role}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize text-muted">{role.replace("_", " ")}</span>
                    <span className="font-[family-name:var(--font-mono)]" style={{ color: rc.fg }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-panel-2">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: rc.fg }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-2xl border border-line bg-panel p-6 space-y-3">
            <h3 className="font-[family-name:var(--font-display)] text-lg">System Info</h3>
            {[
              { label: "App Version", value: "1.0.0-beta" },
              { label: "Database", value: "Supabase (PostgreSQL)" },
              { label: "Auth", value: "Supabase Auth" },
              { label: "Framework", value: "Next.js 15" },
              { label: "Theme", value: "Dark Industrial / Teal" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm border-b border-line pb-2">
                <span className="text-muted">{label}</span>
                <span className="font-[family-name:var(--font-mono)] text-xs">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(showAdd || editUser) && (
        <Modal title={editUser ? "Edit Staff" : "Add Staff"} onClose={() => { setShowAdd(false); setEditUser(null); }}>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted">Full Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-panel-2 border border-line outline-none focus:ring-2 focus:ring-accent" placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted">Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-panel-2 border border-line outline-none focus:ring-2 focus:ring-accent">
                {["washer", "manager", "store_keeper", "administrator"].map((r) => (
                  <option key={r} value={r}>{r.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted">Phone</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-panel-2 border border-line outline-none focus:ring-2 focus:ring-accent" placeholder="+251 9x xxx xxxx" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={saveUser} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-accent text-[#06201D]">
                {editUser ? "Save Changes" : "Add Staff"}
              </button>
              <button onClick={() => { setShowAdd(false); setEditUser(null); }} className="flex-1 py-2.5 rounded-xl text-sm border border-line text-muted">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <div className="fixed bottom-6 right-6 fade-up rounded-xl px-4 py-3 text-sm bg-[var(--accent-dim)] text-accent z-50">{toast}</div>}
    </div>
  );
}
