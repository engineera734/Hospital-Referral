"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../lazy-dashboard/client";
import type { Referral } from "../lazy-dashboard/types";
import { formatDate, formatDepartment } from "../../lib/format";
import StatusPill from "../ui/status-pill";
import { FileText, RefreshCw } from "lucide-react";

export default function AdminReferrals() {
  const [rows, setRows] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      const json = await authFetch("/api/admin/referrals");
      setRows(json.referrals || []);
    } catch (error: any) {
      setMessage(error?.message || "تعذر تحميل التحويلات.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading text="جارٍ تحميل التحويلات..." />;

  return (
    <div className="dashboard-card">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <FileText className="text-blue-400" size={20} />
          التحويلات
        </h3>
        <button onClick={loadData} className="flex items-center gap-2 rounded-xl bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      {message && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{message}</div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-gray-400">
              <th className="p-3">الكود</th>
              <th className="p-3">المريض</th>
              <th className="p-3">الطبيب</th>
              <th className="p-3">القسم</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 text-gray-300">
                <td className="p-3">{r.referral_code || "-"}</td>
                <td className="p-3">{r.patient_name}</td>
                <td className="p-3">{r.doctors?.full_name || "-"}</td>
                <td className="p-3">{formatDepartment(r.departments?.name || "")}</td>
                <td className="p-3"><StatusPill status={r.status as any} /></td>
                <td className="p-3">{formatDate(r.referral_date || r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length && <p className="py-8 text-center text-gray-500">لا توجد تحويلات لعرضها.</p>}
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="dashboard-card py-12 text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      <p className="text-gray-400">{text}</p>
    </div>
  );
}
