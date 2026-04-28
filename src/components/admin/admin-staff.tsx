"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../lazy-dashboard/client";
import type { StaffProfile } from "../lazy-dashboard/types";
import { Building2, RefreshCw } from "lucide-react";

export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      const json = await authFetch("/api/admin/staff");
      setStaff(json.staff || []);
    } catch (error: any) {
      setMessage(error?.message || "تعذر تحميل الموظفين.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading text="جارٍ تحميل الموظفين..." />;

  return (
    <div className="dashboard-card">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Building2 className="text-blue-400" size={20} />
          الموظفون
        </h3>
        <button onClick={loadData} className="flex items-center gap-2 rounded-xl bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      {message && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{message}</div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-gray-400">
              <th className="p-3">الاسم</th>
              <th className="p-3">البريد</th>
              <th className="p-3">الدور</th>
              <th className="p-3">الهاتف</th>
              <th className="p-3">الهوية</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-border/60 text-gray-300">
                <td className="p-3">{s.full_name}</td>
                <td className="p-3">{s.username}</td>
                <td className="p-3">{s.role === "reception" ? "استقبال" : "محاسب"}</td>
                <td className="p-3">{s.phone || "-"}</td>
                <td className="p-3">{s.national_id || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!staff.length && <p className="py-8 text-center text-gray-500">لا توجد بيانات موظفين.</p>}
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
