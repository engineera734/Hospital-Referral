"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../lazy-dashboard/client";
import { Users, Building2, FileText, DollarSign, TrendingUp } from "lucide-react";
import { formatMoney } from "../../lib/format";

export default function AdminOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      setData(await authFetch("/api/admin/overview-data"));
    } catch (error: any) {
      setMessage(error?.message || "تعذر تحميل النظرة العامة.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading text="جارٍ تحميل ملخص الإدارة..." />;
  if (message) return <ErrorBox message={message} onRetry={loadData} />;

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card title="الأطباء" value={data?.doctorsCount || 0} icon={<Users className="text-white" size={24} />} color="from-blue-600 to-blue-800" />
        <Card title="الأقسام" value={data?.departmentsCount || 0} icon={<Building2 className="text-white" size={24} />} color="from-emerald-600 to-emerald-800" />
        <Card title="التحويلات" value={data?.referralsCount || 0} icon={<FileText className="text-white" size={24} />} color="from-purple-600 to-purple-800" />
        <Card title="المستحقات" value={formatMoney(data?.totalSettled || 0)} icon={<DollarSign className="text-white" size={24} />} color="from-amber-500 to-orange-600" />
      </div>

      <div className="dashboard-card">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <TrendingUp className="text-emerald-400" size={20} />
          لوحة الإدارة أصبحت خفيفة
        </h3>
        <p className="text-sm leading-7 text-gray-400">
          يتم تحميل كل تبويب عند فتحه فقط: التحويلات، الأطباء، الموظفون، التقارير، وتصفية المستحقات.
        </p>
      </div>
    </>
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

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="dashboard-card text-center">
      <p className="mb-4 text-red-400">{message}</p>
      <button onClick={onRetry} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
        إعادة المحاولة
      </button>
    </div>
  );
}

function Card({ title, value, icon, color }: any) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-5 shadow-lg`}>
      <div className="absolute left-0 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-white/75">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="rounded-xl bg-white/10 p-2">{icon}</div>
      </div>
    </div>
  );
}
