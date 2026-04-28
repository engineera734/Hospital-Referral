"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../lazy-dashboard/client";
import { formatMoney } from "../../lib/format";
import {
  DollarSign, CheckCircle2, Clock, Users, ArrowUpRight,
  Banknote, ArrowDownRight, UserCheck
} from "lucide-react";

type OverviewData = {
  totalProfit: number;
  totalSettled: number;
  totalPendingProfit: number;
  doctorsCount: number;
};

export default function AccountingOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      const json = await authFetch("/api/accounting/overview-data");
      setData(json);
    } catch (error: any) {
      setMessage(error?.message || "تعذر تحميل النظرة العامة.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading text="جارٍ تحميل ملخص المحاسبة..." />;
  if (message) return <ErrorBox message={message} onRetry={loadData} />;

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="إجمالي المستحقات" value={formatMoney(data?.totalProfit || 0)} icon={<DollarSign className="text-white" size={24} />} sub="المجموع الكلي للحالات المستقبلة" color="from-blue-600 to-blue-800" subIcon={<ArrowUpRight size={14} />} />
        <StatCard title="تم تصفيتها" value={formatMoney(data?.totalSettled || 0)} icon={<CheckCircle2 className="text-white" size={24} />} sub="المدفوع للأطباء" color="from-emerald-600 to-emerald-800" subIcon={<Banknote size={14} />} />
        <StatCard title="مستحقات معلقة" value={formatMoney(data?.totalPendingProfit || 0)} icon={<Clock className="text-white" size={24} />} sub="بانتظار التصفية" color="from-amber-500 to-orange-600" subIcon={<ArrowDownRight size={14} />} />
        <StatCard title="عدد الأطباء" value={data?.doctorsCount || 0} icon={<Users className="text-white" size={24} />} sub="طبيب نشط" color="from-purple-600 to-purple-800" subIcon={<UserCheck size={14} />} />
      </div>

      <div className="dashboard-card">
        <h3 className="mb-3 text-lg font-semibold text-white">تم تبسيط التحميل</h3>
        <p className="text-sm leading-7 text-gray-400">
          هذه الصفحة الآن تحمل الملخص فقط. مستحقات الأطباء والتقارير يتم تحميلها عند فتح التبويب الخاص بها.
        </p>
      </div>
    </>
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

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="dashboard-card text-center">
      <p className="mb-4 text-red-400">{message}</p>
      <button onClick={onRetry} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
        إعادة المحاولة
      </button>
    </div>
  );
}

function StatCard({ title, value, icon, sub, color, subIcon }: any) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-5 shadow-lg`}>
      <div className="absolute left-0 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 text-sm text-white/75">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2">{icon}</div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-white/75">
          {subIcon}
          <span>{sub}</span>
        </div>
      </div>
    </div>
  );
}
