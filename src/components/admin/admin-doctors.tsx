"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../lazy-dashboard/client";
import type { Doctor } from "../lazy-dashboard/types";
import { Handshake, RefreshCw } from "lucide-react";

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      const json = await authFetch("/api/admin/doctors");
      setDoctors(json.doctors || []);
    } catch (error: any) {
      setMessage(error?.message || "تعذر تحميل الأطباء.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading text="جارٍ تحميل الأطباء..." />;

  return (
    <div className="dashboard-card">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Handshake className="text-emerald-400" size={20} />
          الأطباء
        </h3>
        <button onClick={loadData} className="flex items-center gap-2 rounded-xl bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      {message && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{message}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {doctors.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-gray-800/50 p-5">
            <h4 className="text-lg font-bold text-white">{d.full_name}</h4>
            <p className="mt-1 text-sm text-gray-400">{d.specialty || "طبيب"}</p>
            <div className="mt-4 space-y-1 text-sm text-gray-500">
              <p>رقم الكرت: {d.card_no || "-"}</p>
              <p>الهاتف: {d.phone || "-"}</p>
              <p>حساب الكريمي: {d.kareemy_account || "-"}</p>
            </div>
          </div>
        ))}
      </div>

      {!doctors.length && <p className="py-8 text-center text-gray-500">لا توجد بيانات أطباء.</p>}
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="dashboard-card py-12 text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      <p className="text-gray-400">{text}</p>
    </div>
  );
}
