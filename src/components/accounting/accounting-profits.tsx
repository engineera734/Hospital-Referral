"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../lazy-dashboard/client";
import type { Doctor, Referral, Rate, Settlement, Profile } from "../lazy-dashboard/types";
import { formatMoney, monthNumber } from "../../lib/format";
import { Wallet, Search, Filter, CreditCard, Receipt, CheckCircle2 } from "lucide-react";

export default function AccountingProfits({ profile }: { profile: Profile }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [searchDoctorId, setSearchDoctorId] = useState("all");
  const [settleFilter, setSettleFilter] = useState({ scope: "all", year: String(new Date().getFullYear()), month_from: "1", month_to: String(new Date().getMonth() + 1) });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      const json = await authFetch("/api/accounting/profits-data");
      setDoctors(json.doctors || []);
      setReferrals(json.referrals || []);
      setRates((json.rates || []).map((r: any) => ({ doctor_id: String(r.doctor_id), department_id: String(r.department_id), amount: Number(r.amount || 0) })));
      setSettlements((json.settlements || []).map((s: any) => ({ doctor_id: String(s.doctor_id), amount: Number(s.amount || 0), referrals_count: Number(s.referrals_count || 0), settled_at: String(s.settled_at || ""), settled_by: s.settled_by || null, note: s.note || null })));
    } catch (error: any) {
      setMessage(error?.message || "تعذر تحميل المستحقات.");
    } finally {
      setLoading(false);
    }
  }

  const rateMap = useMemo(() => new Map(rates.map((r) => [`${r.doctor_id}:${r.department_id}`, Number(r.amount || 0)])), [rates]);

  const settlementPreview = useMemo(() => {
    if (searchDoctorId === "all") return { rows: [] as Referral[], amount: 0, count: 0, validRange: true, doctor: null as Doctor | null };
    const doctor = doctors.find((d) => d.id === searchDoctorId) || null;
    const monthFrom = Number(settleFilter.month_from);
    const monthTo = Number(settleFilter.month_to);
    const validRange = settleFilter.scope === "all" ? true : monthFrom <= monthTo;
    const year = Number(settleFilter.year);

    const rows = referrals.filter((row) => {
      if (row.doctors?.id !== searchDoctorId || row.status !== "arrived") return false;
      const sourceDate = row.arrived_at || row.referral_date || row.created_at;
      const date = new Date(sourceDate || "");
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return false;
      if (settleFilter.scope === "all") return true;
      const month = monthNumber(sourceDate);
      return month >= monthFrom && month <= monthTo;
    });

    const amount = rows.reduce((sum, row) => sum + (rateMap.get(`${row.doctors?.id}:${row.departments?.id || ""}`) || 0), 0);
    return { rows, amount, count: rows.length, validRange, doctor };
  }, [searchDoctorId, doctors, referrals, settleFilter, rateMap]);

  const settled = useMemo(() => settlements.filter((s) => s.doctor_id === searchDoctorId).reduce((sum, s) => sum + Number(s.amount || 0), 0), [settlements, searchDoctorId]);

  async function settleDoctor() {
    if (!settlementPreview.doctor) return;
    try {
      setBusy(true);
      const json = await authFetch("/api/admin/settle-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: settlementPreview.doctor.id, settled_by: profile.id, note: "تمت التصفية من قسم المحاسبة", scope: settleFilter.scope, year: settleFilter.year, month_from: settleFilter.month_from, month_to: settleFilter.month_to }),
      });
      setMessage(`تمت تصفية المستحقات بمبلغ ${formatMoney(Number(json.amount || 0))}.`);
      await loadData();
    } catch (error: any) {
      setMessage(error?.message || "تعذر تصفية المستحقات.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading text="جارٍ تحميل مستحقات الأطباء..." />;

  return (
    <div className="dashboard-card">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Wallet className="text-amber-400" size={20} />
          مستحقات الأطباء
        </h3>
        <select value={searchDoctorId} onChange={(e) => setSearchDoctorId(e.target.value)} className="min-w-[200px] rounded-xl border border-border bg-gray-800 px-4 py-2.5 text-sm text-gray-300 focus:border-amber-500 focus:outline-none">
          <option value="all">🔍 اختر طبيبًا للعرض</option>
          {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>)}
        </select>
      </div>

      {message && <div className="mb-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div>}

      {searchDoctorId === "all" ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-800">
            <Search className="text-gray-500" size={40} />
          </div>
          <p className="text-lg text-gray-400">اختر طبيبًا من القائمة أعلاه</p>
          <p className="mt-1 text-sm text-gray-600">لعرض مستحقاته الحالية وإجراء التصفية</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-gradient-to-r from-gray-800 to-gray-800/50 p-6">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-3xl font-bold text-white shadow-lg">
                    {settlementPreview.doctor?.full_name.slice(0, 1)}
                  </div>
                  <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
                    <CheckCircle2 className="text-white" size={16} />
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-bold text-white">{settlementPreview.doctor?.full_name}</h3>
                  <p className="mt-1 text-sm text-gray-400">{settlementPreview.doctor?.specialty || "طبيب"}</p>
                  {settlementPreview.doctor?.kareemy_account && <p className="mt-1 text-xs text-gray-500">حساب الكريمي: {settlementPreview.doctor.kareemy_account}</p>}
                </div>
              </div>

              <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
                <MiniStat title="الحالات المستقبلة" value={settlementPreview.count} />
                <MiniStat title="المستحق الحالي" value={formatMoney(settlementPreview.amount)} className="text-emerald-400" />
                <MiniStat title="المصروف سابقًا" value={formatMoney(settled)} className="text-blue-400" />
                <MiniStat title="آخر تحديث" value="الآن" className="text-gray-300 text-sm" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-gray-800/50 p-5">
            <h4 className="mb-4 flex items-center gap-2 font-semibold text-white">
              <Filter size={18} className="text-gray-400" />
              إعدادات التصفية
            </h4>

            <div className="grid gap-3 md:grid-cols-4">
              <Select label="نوع التصفية" value={settleFilter.scope} onChange={(v) => setSettleFilter({ ...settleFilter, scope: v })} options={[["all", "كل الأشهر"], ["range", "حسب فترة"]]} />
              <Select label="السنة" value={settleFilter.year} onChange={(v) => setSettleFilter({ ...settleFilter, year: v })} options={[["2026", "2026"], ["2027", "2027"]]} />
              <MonthSelect label="من شهر" value={settleFilter.month_from} disabled={settleFilter.scope === "all"} onChange={(v) => setSettleFilter({ ...settleFilter, month_from: v })} />
              <MonthSelect label="إلى شهر" value={settleFilter.month_to} disabled={settleFilter.scope === "all"} onChange={(v) => setSettleFilter({ ...settleFilter, month_to: v })} />
            </div>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-900/30 to-emerald-900/30 p-5">
            <p className="mb-3 text-sm font-bold text-blue-300">📊 ملخص التصفية الحالية</p>
            <div className="grid gap-3 md:grid-cols-3">
              <MiniStat title="عدد الحالات" value={settlementPreview.count} />
              <MiniStat title="المبلغ للتصفية" value={formatMoney(settlementPreview.amount)} className="text-emerald-400" />
              <MiniStat title="نطاق التصفية" value={settleFilter.scope === "all" ? `كل أشهر ${settleFilter.year}` : `${settleFilter.month_from} - ${settleFilter.month_to} / ${settleFilter.year}`} className="text-gray-300 text-sm" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              disabled={!settlementPreview.validRange || settlementPreview.count === 0 || settlementPreview.amount <= 0 || busy}
              onClick={settleDoctor}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard size={18} />
              تصفية المستحقات
            </button>
            <button disabled className="flex items-center gap-2 rounded-xl bg-gray-700 px-6 py-3 font-semibold text-white opacity-50">
              <Receipt size={18} />
              تصفير المصروف مسبقًا
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="dashboard-card py-12 text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      <p className="text-gray-400">{text}</p>
    </div>
  );
}

function MiniStat({ title, value, className = "text-white" }: { title: string; value: any; className?: string }) {
  return (
    <div className="rounded-xl bg-gray-700/30 p-3 text-center">
      <p className="mb-1 text-xs text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${className}`}>{value}</p>
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

function MonthSelect({ label, value, disabled, onChange }: { label: string; value: string; disabled?: boolean; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-400">{label}</label>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-gray-700 px-4 py-2.5 text-sm text-gray-300 disabled:opacity-50">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={String(m)}>{m}</option>)}
      </select>
    </div>
  );
}
