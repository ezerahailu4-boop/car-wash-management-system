"use client";

import { useEffect, useState } from "react";
import { Plus, Search, X, Pencil, RefreshCw } from "lucide-react";
import { INVENTORY as MOCK_INVENTORY } from "@/lib/mock";
import { fetchInventory } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string; product_name: string; category: string; total_ml: number;
  min_stock_ml: number; supplier: string | null; expiry_date: string | null; status: string;
};

const tone: Record<string, { bg: string; fg: string }> = {
  ok: { bg: "#123A34", fg: "var(--accent)" },
  low: { bg: "#3A2E14", fg: "var(--amber)" },
  critical: { bg: "#3A1A1A", fg: "var(--red)" },
};

const EMPTY = { product_name: "", category: "", total_ml: "", min_stock_ml: "", supplier: "", expiry_date: "" };

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

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function notify(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function load() {
    setLoading(true);
    try {
      const data = await fetchInventory();
      setItems(data.length ? data : MOCK_INVENTORY as Item[]);
    } catch {
      setItems(MOCK_INVENTORY as Item[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY); setEditItem(null); setModal("add"); }
  function openEdit(item: Item) {
    setEditItem(item);
    setForm({
      product_name: item.product_name, category: item.category,
      total_ml: String(item.total_ml), min_stock_ml: String(item.min_stock_ml),
      supplier: item.supplier ?? "", expiry_date: item.expiry_date ?? "",
    });
    setModal("edit");
  }

  async function save() {
    if (!form.product_name || !form.total_ml) return;
    setSaving(true);
    const payload = {
      product_name: form.product_name, category: form.category,
      total_ml: Number(form.total_ml), min_stock_ml: Number(form.min_stock_ml),
      supplier: form.supplier || null, expiry_date: form.expiry_date || null,
    };
    try {
      const supabase = createClient();
      if (modal === "edit" && editItem) {
        await supabase.from("inventory").update(payload).eq("id", editItem.id);
        notify("Item updated.");
      } else {
        await supabase.from("inventory").insert(payload);
        notify("Item added.");
      }
      await load();
    } catch {
      // demo fallback
      if (modal === "edit" && editItem) {
        setItems((prev) => prev.map((i) => i.id === editItem.id ? { ...i, ...payload, status: i.status } : i));
      } else {
        setItems((prev) => [...prev, { id: String(Date.now()), ...payload, status: "ok" }]);
      }
      notify(modal === "edit" ? "Item updated (demo)." : "Item added (demo).");
    }
    setSaving(false);
    setModal(null);
  }

  const filtered = items.filter((i) =>
    i.product_name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase()) ||
    (i.supplier ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const counts = { ok: items.filter((i) => i.status === "ok").length, low: items.filter((i) => i.status === "low").length, critical: items.filter((i) => i.status === "critical").length };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Healthy", value: counts.ok, color: "var(--accent)", bg: "#123A34" },
          { label: "Low Stock", value: counts.low, color: "var(--amber)", bg: "#3A2E14" },
          { label: "Critical", value: counts.critical, color: "var(--red)", bg: "#3A1A1A" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-2xl p-4 border border-line bg-panel flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
              <p className="font-[family-name:var(--font-display)] text-2xl mt-1">{value}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: bg, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-panel overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-lg">Store Inventory</h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-panel-2 border border-line flex-1 sm:flex-none">
              <Search size={14} className="text-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="bg-transparent outline-none text-sm w-40" />
            </div>
            <button onClick={load} className="p-2.5 rounded-xl bg-panel-2 border border-line text-muted hover:text-text"><RefreshCw size={15} /></button>
            <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-[#06201D] flex items-center gap-2 whitespace-nowrap">
              <Plus size={16} /> Add Item
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-t border-b border-line">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3">Min</th>
                <th className="px-5 py-3">Expiry</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const pct = Math.min(100, (i.total_ml / (i.min_stock_ml * 3)) * 100);
                const t = tone[i.status] ?? tone.ok;
                return (
                  <tr key={i.id} className="border-b border-line hover:bg-panel-2 transition">
                    <td className="px-5 py-3.5 font-medium">{i.product_name}</td>
                    <td className="px-5 py-3.5 text-muted">{i.category}</td>
                    <td className="px-5 py-3.5 text-muted">{i.supplier ?? "—"}</td>
                    <td className="px-5 py-3.5 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-panel-2">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: t.fg }} />
                        </div>
                        <span className="font-[family-name:var(--font-mono)] text-xs">{(i.total_ml / 1000).toFixed(1)} L</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-[family-name:var(--font-mono)] text-xs text-muted">{(i.min_stock_ml / 1000).toFixed(1)} L</td>
                    <td className="px-5 py-3.5 font-[family-name:var(--font-mono)] text-xs text-muted">{i.expiry_date ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>
                        {i.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => openEdit(i)} className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-panel-2"><Pencil size={14} /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-muted text-sm">No items found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === "edit" ? "Edit Item" : "Add Inventory Item"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {[
              { label: "Product Name", key: "product_name", placeholder: "e.g. Foam Shampoo Concentrate" },
              { label: "Category", key: "category", placeholder: "e.g. Soap" },
              { label: "Supplier", key: "supplier", placeholder: "e.g. Chemtech PLC" },
              { label: "Current Stock (ml)", key: "total_ml", placeholder: "e.g. 18000" },
              { label: "Min Stock (ml)", key: "min_stock_ml", placeholder: "e.g. 5000" },
              { label: "Expiry Date", key: "expiry_date", placeholder: "YYYY-MM-DD" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-xs uppercase tracking-wide text-muted">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-panel-2 border border-line outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-accent text-[#06201D] disabled:opacity-50">
                {saving ? "Saving…" : modal === "edit" ? "Save Changes" : "Add Item"}
              </button>
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm border border-line text-muted">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <div className="fixed bottom-6 right-6 fade-up rounded-xl px-4 py-3 text-sm bg-[var(--accent-dim)] text-accent z-50">{toast}</div>}
    </div>
  );
}
