"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { REQUESTS as INITIAL } from "@/lib/mock";
import { createClient } from "@/lib/supabase/client";

const tone: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#3A2E14", fg: "var(--amber)" },
  approved: { bg: "#123A34", fg: "var(--accent)" },
  rejected: { bg: "#3A1A1A", fg: "var(--red)" },
};

export default function RequestsPage() {
  const [requests, setRequests] = useState(INITIAL);

  async function decide(id: string, status: "approved" | "rejected") {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const supabase = createClient();
      await supabase.from("soap_requests").update({ status }).eq("id", id);
    } catch {
      // demo mode — Supabase not configured yet
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-panel overflow-hidden">
      <div className="p-5">
        <h3 className="font-[family-name:var(--font-display)] text-lg">Soap Requests</h3>
      </div>
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
            const t = tone[r.status];
            return (
              <tr key={r.id} className="border-b border-line">
                <td className="px-5 py-3.5 font-[family-name:var(--font-mono)] text-xs">{r.request_number}</td>
                <td className="px-5 py-3.5">{r.washer}</td>
                <td className="px-5 py-3.5 text-muted">{r.product}</td>
                <td className="px-5 py-3.5 font-[family-name:var(--font-mono)]">{r.qty} ml</td>
                <td className="px-5 py-3.5">
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wide"
                    style={{ background: t.bg, color: t.fg }}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {r.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(r.id, "approved")}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-panel-2 border border-line flex items-center gap-1.5"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => decide(r.id, "rejected")}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#3A1A1A] text-red flex items-center gap-1.5"
                      >
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
        </tbody>
      </table>
    </div>
  );
}
