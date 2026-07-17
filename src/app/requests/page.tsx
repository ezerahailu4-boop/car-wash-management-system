"use client";

import { useEffect, useState } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { REQUESTS as MOCK } from "@/lib/mock";
import { createClient } from "@/lib/supabase/client";

type Request = {
  id: string;
  request_number: string;
  washer: string;
  product: string;
  qty: number;
  status: "pending" | "approved" | "rejected" | "partial";
};

const tone: Record<string, { bg: string; fg: string }> = {
  pending:  { bg: "#3A2E14", fg: "var(--amber)" },
  approved: { bg: "#123A34", fg: "var(--accent)" },
  rejected: { bg: "#3A1A1A", fg: "var(--red)" },
  partial:  { bg: "#2a1f4a", fg: "var(--violet)" },
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from("soap_requests")
        .select("id, request_number, status, quantity_requested, profiles(full_name), inventory(product_name)")
        .order("created_at", { ascending: false });
      type Row = { id: string; request_number: string; status: string; quantity_requested: number; profiles: { full_name: string } | null; inventory: { product_name: string } | null };
      if (data?.length) {
        setRequests((data as Row[]).map((r) => ({
          id: r.id,
          request_number: r.request_number,
          washer: r.profiles?.full_name ?? "Unknown",
          product: r.inventory?.product_name ?? "—",
          qty: r.quantity_requested,
          status: r.status as Request["status"],
        })));
        setUseMock(false);
      } else {
        setRequests(MOCK.map((r) => ({ id: r.id, request_number: r.request_number, washer: r.washer, product: r.product, qty: r.qty, status: r.status })));
        setUseMock(true);
      }
    } catch {
      setRequests(MOCK.map((r) => ({ id: r.id, request_number: r.request_number, washer: r.washer, product: r.product, qty: r.qty, status: r.status })));
      setUseMock(true);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function decide(id: string, status: "approved" | "rejected") {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (!useMock) {
      const supabase = createClient();
      try {
        await supabase.from("soap_requests").update({ status }).eq("id", id);
      } catch { /* demo */ }
    }
  }

  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", value: requests.filter((r) => r.status === "pending").length, color: "var(--amber)", bg: "#3A2E14" },
          { label: "Approved", value: requests.filter((r) => r.status === "approved").length, color: "var(--accent)", bg: "#123A34" },
          { label: "Rejected", value: requests.filter((r) => r.status === "rejected").length, color: "var(--red)", bg: "#3A1A1A" },
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
        <div className="p-5 flex items-center justify-between">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg">Soap Requests</h3>
            {pending > 0 && <p className="text-xs text-muted mt-0.5">{pending} request{pending > 1 ? "s" : ""} awaiting review</p>}
          </div>
          <button onClick={load} className="p-2.5 rounded-xl bg-panel-2 border border-line text-muted hover:text-text">
            <RefreshCw size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-t border-b border-line">
                <th className="px-5 py-3">Request</th>
                <th className="px-5 py-3">Washer</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Qty</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const t = tone[r.status] ?? tone.pending;
                return (
                  <tr key={r.id} className="border-b border-line hover:bg-panel-2 transition">
                    <td className="px-5 py-3.5 font-[family-name:var(--font-mono)] text-xs">{r.request_number}</td>
                    <td className="px-5 py-3.5">{r.washer}</td>
                    <td className="px-5 py-3.5 text-muted">{r.product}</td>
                    <td className="px-5 py-3.5 font-[family-name:var(--font-mono)]">{r.qty} ml</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.status === "pending" ? (
                        <div className="flex gap-2">
                          <button onClick={() => decide(r.id, "approved")}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-panel-2 border border-line flex items-center gap-1.5 hover:border-accent transition">
                            <Check size={14} /> Approve
                          </button>
                          <button onClick={() => decide(r.id, "rejected")}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#3A1A1A] text-red flex items-center gap-1.5">
                            <X size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">No requests found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
