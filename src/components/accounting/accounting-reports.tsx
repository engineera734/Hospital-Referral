"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../lazy-dashboard/client";
import type { Doctor, Department } from "../lazy-dashboard/types";
import { Download, FileText, Filter, Printer } from "lucide-react";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AccountingReports() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filter, setFilter] = useState({ year: String(new Date().getFullYear()), doctor_id: "all", month_from: "1", month_to: String(new Date().getMonth() + 1), department_id: "all" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      const json = await authFetch("/api/accounting/reports-data");
      setDoctors(json.doctors || []);
      setDepartments(json.departments || []);
    } catch (error: any) {
      setMessage(error?.message || "تعذر تحميل التقارير.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadReport() {
    const json = await authFetch("/api/accounting/reports-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filter),
    });
    downloadBlob(new Blob([json.html || ""], { type: "text/html;charset=utf-8" }), "تقرير-المحاسبة.html");
  }

  if (loading) {
    return (
      <div className="dashboard-card py-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-gray-400">جارٍ تحميل بيانات التقارير...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {message && <div className="dashboard-card text-red-400 lg:col-span-2">{message}</div>}

      <div className="dashboard-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2">
            <FileText className="text-blue-400" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-white">التقرير العام</h3>
        </div>
        <p className="mb-6 text-sm text-gray-400">تقرير شامل لجميع العمليات المالية يتم إنشاؤه عند الطلب.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={downloadReport} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700">
            <Download size={16} /> تنزيل HTML
          </button>
          <button onClick={downloadReport} className="flex items-center gap-2 rounded-xl bg-gray-700 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-gray-600">
            <Printer size={16} /> طباعة PDF
          </button>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-purple-500/10 p-2">
            <Filter className="text-purple-400" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-white">تقرير مخصص</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select label="السنة" value={filter.year} onChange={(v) => setFilter({ ...filter, year: v })} options={[["2026", "2026"], ["2027", "2027"]]} />
          <Select label="الطبيب" value={filter.doctor_id} onChange={(v) => setFilter({ ...filter, doctor_id: v })} options={[["all", "كل الأطباء"], ...doctors.map((d) => [d.id, d.full_name])]} />
          <MonthSelect label="من شهر" value={filter.month_from} onChange={(v) => setFilter({ ...filter, month_from: v })} />
          <MonthSelect label="إلى شهر" value={filter.month_to} onChange={(v) => setFilter({ ...filter, month_to: v })} />
          <div className="md:col-span-2">
            <Select label="القسم" value={filter.department_id} onChange={(v) => setFilter({ ...filter, department_id: v })} options={[["all", "كل الأقسام"], ...departments.map((d) => [d.id, d.name])]} />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 md:col-span-2">
            <button disabled={Number(filter.month_from) > Number(filter.month_to)} onClick={downloadReport} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50">
              <Download size={16} /> تنزيل HTML
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[][] }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-400">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-gray-700 px-4 py-2.5 text-sm text-gray-300">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function MonthSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-400">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-gray-700 px-4 py-2.5 text-sm text-gray-300">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={String(m)}>{m}</option>)}
      </select>
    </div>
  );
}
