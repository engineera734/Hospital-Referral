"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AlertTriangle, CheckCircle2, Clock, FileText, Users, Wallet, Download, Printer } from "lucide-react";
import MobileShell, { MobileLoading, Notice, tabsForRole } from "../../../src/components/mobile/mobile-shell";
import { MobileInfoCard, MobilePanel, MobileSelect, MobileStatCard } from "../../../src/components/mobile/mobile-cards";
import MobileProfile from "../../../src/components/mobile/mobile-profile";
import { getMobileProfile, mobileAuthFetch, safeDate, monthNumber, signStorage } from "../../../src/components/mobile/mobile-api";
import { formatMoney } from "../../../src/lib/format";
import {
  buildFinancialReportHtml,
  downloadMobileHtml,
  printMobileHtml,
  buildSettlementReceiptHtml
} from "../../../src/components/mobile/mobile-reports";

export default function Page() {
  const [active, setActive] = useState("overview");
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [data, setData] = useState<any>({ doctors: [], referrals: [], rates: [], settlements: [], departments: [], staff: [] });
  const [message, setMessage] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [mFrom, setMFrom] = useState("1");
  const [mTo, setMTo] = useState(String(new Date().getMonth() + 1));
  const [allMonths, setAllMonths] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  
  // نافذة تأكيد مخصصة
  const [dialog, setDialog] = useState<{ open: boolean; title: string; desc: string; onConfirm: () => void }>({ open: false, title: "", desc: "", onConfirm: () => {} });

  useEffect(() => { boot(); }, []);

  async function boot() {
    try {
      const p = await getMobileProfile();
      if (!p) return;
      if (String(p.role).toLowerCase() !== "accountant") return window.location.href = "/mobile/dashboard";
      setProfile(p);
      signStorage("profile-images", p.avatar_path).then(setAvatarUrl);
      setData(await mobileAuthFetch("/api/accounting/dashboard-data"));
    } catch (e: any) {
      setMessage(e?.message || "تعذر تحميل صفحة المحاسبة.");
    } finally {
      setLoading(false);
    }
  }

  const rateMap = useMemo(() => new Map((data.rates || []).map((r: any) => [`${r.doctor_id}:${r.department_id}`, Number(r.amount || 0)])), [data.rates]);

  // خريطة staff للوصول لاسم موظف الاستقبال
  const staffMap = useMemo(() => {
    const map: Record<string, string> = {};
    (data.staff || []).forEach((s: any) => { map[s.id] = s.full_name; });
    return map;
  }, [data.staff]);

  // بيانات البطاقات الرئيسية ثابتة من كامل البيانات
  const allReferrals = useMemo(() => (data.referrals || []), [data.referrals]);
  const allArrived = useMemo(() => allReferrals.filter((r: any) => r.status === "arrived"), [allReferrals]);
  const allPending = useMemo(() => allReferrals.filter((r: any) => r.status === "pending"), [allReferrals]);
  
  // هذه للبطاقات الرئيسية فقط (نظرة عامة)
  const overviewArrivedTotal = useMemo(() => allArrived.reduce((s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0), 0), [allArrived, rateMap]);
  const overviewPendingTotal = useMemo(() => allPending.reduce((s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0), 0), [allPending, rateMap]);
  const overviewSettledTotal = useMemo(() => (data.settlements || []).reduce((s: number, x: any) => s + Number(x.amount || 0), 0), [data.settlements]);

  // بيانات مفلترة حسب الاختيارات (لتقارير وتصفية)
  const filtered = useMemo(() => {
    const from = Number(mFrom), to = Number(mTo), yr = Number(year);
    return (data.referrals || []).filter((r: any) => {
      const date = r.arrived_at || r.referral_date || r.created_at;
      const dt = new Date(date || "");
      const mn = monthNumber(date);
      return (selectedDoctor === "all" || r.doctors?.id === selectedDoctor) &&
        (selectedDept === "all" || r.departments?.id === selectedDept) &&
        (!year || Number.isNaN(dt.getTime()) || dt.getFullYear() === yr) &&
        (allMonths || (mn >= from && mn <= to));
    });
  }, [data.referrals, selectedDoctor, selectedDept, year, mFrom, mTo, allMonths]);

  const filteredArrived = useMemo(() => filtered.filter((r: any) => r.status === "arrived"), [filtered]);
  const filteredPending = useMemo(() => filtered.filter((r: any) => r.status === "pending"), [filtered]);
  
  const filteredArrivedTotal = useMemo(() => filteredArrived.reduce((s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0), 0), [filteredArrived, rateMap]);
  const filteredPendingTotal = useMemo(() => filteredPending.reduce((s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0), 0), [filteredPending, rateMap]);
  
  // المستحقات المصروفة سابقاً للطبيب المحدد حسب الفلترة
  const filteredSettledTotal = useMemo(() => {
    if (selectedDoctor === "all") return 0;
    return (data.settlements || [])
      .filter((s: any) => s.doctor_id === selectedDoctor)
      .reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  }, [data.settlements, selectedDoctor]);

  const doctorChart = (data.doctors || []).map((d: any) => {
    const rows = (data.referrals || []).filter((r: any) => r.doctors?.id === d.id);
    return { name: d.full_name, total: rows.length, arrived: rows.filter((r: any) => r.status === "arrived").length };
  }).filter((x: any) => x.total > 0).slice(0, 8);

  const deptChart = (data.departments || []).map((d: any) => {
    const rows = (data.referrals || []).filter((r: any) => r.departments?.id === d.id);
    return { name: d.name, total: rows.length, arrived: rows.filter((r: any) => r.status === "arrived").length };
  }).filter((x: any) => x.total > 0).slice(0, 8);

  function validate(): boolean {
    if (!allMonths && Number(mFrom) > Number(mTo)) {
      setMessage("يجب أن يكون شهر البداية أصغر أو يساوي شهر النهاية.");
      return false;
    }
    return true;
  }

  // تحويل rateMap إلى plain object
  function getRateMapObj(): Record<string, number> {
    const obj: Record<string, number> = {};
    rateMap.forEach((v, k) => { obj[String(k)] = Number(v); });
    return obj;
  }

  function report(): string | null {
    if (!validate()) return null;
    const doctor = (data.doctors || []).find((d: any) => d.id === selectedDoctor);
    const department = (data.departments || []).find((d: any) => d.id === selectedDept);
    return buildFinancialReportHtml({
      title: selectedDoctor === "all" ? "تقرير مالي عام" : "تقرير مالي محدد",
      rows: filtered,
      doctor,
      department,
      year,
      monthFrom: allMonths ? null : mFrom,
      monthTo: allMonths ? null : mTo,
      rateMap: getRateMapObj(),
      settlements: data.settlements,
      staffMap,
    });
  }

  function downloadReport() {
    const html = report();
    if (!html) return;
    const fileName = selectedDoctor === "all" ? `تقرير-محاسبة-عام-${year}.html` : `تقرير-محاسبة-${selectedDoctor}-${year}.html`;
    downloadMobileHtml(fileName, html);
    setMessage("تم تنزيل التقرير بنجاح ✅");
  }

  function printReport() {
    const html = report();
    if (!html) return;
    printMobileHtml(html);
  }

  function createSettlementReceipt(settleAmount: number) {
    const doctor = (data.doctors || []).find((d: any) => d.id === selectedDoctor);
    if (!doctor) return;
    const scopeText = allMonths ? `كل الأشهر في سنة ${year}` : `من شهر ${mFrom} إلى شهر ${mTo} / سنة ${year}`;
    const receiptHtml = buildSettlementReceiptHtml({
      doctorName: doctor.full_name,
      doctorSpecialty: doctor.specialty,
      scope: scopeText,
      count: filteredArrived.length,
      amount: settleAmount,
      settledBy: profile?.full_name || "محاسب",
      date: new Date().toLocaleDateString('ar-SA'),
      rows: filteredArrived,
      rateMap: getRateMapObj(),
      staffMap,
    });
    const fileName = `إيصال-تصفية-${doctor.full_name}-${year}.html`;
    downloadMobileHtml(fileName, receiptHtml);
    printMobileHtml(receiptHtml);
  }

  async function settle() {
    if (selectedDoctor === "all") {
      setMessage("اختر طبيبًا محددًا قبل تصفية المستحقات.");
      return;
    }
    if (!validate()) return;
    
    // إنشاء تقرير قبل التصفية
    const preReportHtml = report();
    if (preReportHtml) downloadMobileHtml("تقرير-قبل-التصفية.html", preReportHtml);
    
    setDialog({
      open: true,
      title: "تأكيد التصفية",
      desc: `سيتم تصفية مستحقات الطبيب المحدد.\nعدد الحالات: ${filteredArrived.length}\nالمبلغ: ${formatMoney(filteredArrivedTotal)}\n\nتم تنزيل تقرير ما قبل التصفية. هل تريد المتابعة؟`,
      onConfirm: async () => {
        setDialog({ open: false, title: "", desc: "", onConfirm: () => {} });
        try {
          setBusy(true);
          const json = await mobileAuthFetch("/api/admin/settle-doctor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              doctor_id: selectedDoctor,
              settled_by: profile.id,
              note: "تصفية من تطبيق الهاتف",
              scope: allMonths ? "all" : "range",
              year,
              month_from: mFrom,
              month_to: mTo,
            }),
          });
          const settleAmount = Number(json.amount || 0);
          createSettlementReceipt(settleAmount);
          await boot();
          setMessage(`✅ تمت التصفية بنجاح! تم تنزيل الإيصال والتقرير.`);
        } catch (e: any) {
          setMessage(e?.message || "تعذر التصفية");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function clearPaid() {
    if (selectedDoctor === "all") {
      setMessage("اختر طبيبًا محددًا قبل تصفير المصروف.");
      return;
    }
    if (filteredSettledTotal <= 0) {
      setMessage("لا يوجد مصروف سابق لتصفيره.");
      return;
    }
    const doctor = (data.doctors || []).find((d: any) => d.id === selectedDoctor);
    setDialog({
      open: true,
      title: "تصفير المصروف مسبقًا",
      desc: `سيتم تصفير المصروف مسبقًا للطبيب: ${doctor?.full_name || selectedDoctor}\nالمبلغ الحالي: ${formatMoney(filteredSettledTotal)}\n\nهل أنت متأكد؟`,
      onConfirm: async () => {
        setDialog({ open: false, title: "", desc: "", onConfirm: () => {} });
        try {
          setBusy(true);
          await mobileAuthFetch("/api/admin/settle-doctor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              doctor_id: selectedDoctor,
              settled_by: profile.id,
              mode: "clear_paid",
              note: "مسح المصروف مسبقًا من تطبيق الهاتف",
            }),
          });
          setMessage("✅ تم تصفير المصروف مسبقًا بنجاح.");
          await boot();
        } catch (e: any) {
          setMessage(e?.message || "تعذر تصفير المصروف");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  // شروط تعطيل الأزرار
  const canSettle = selectedDoctor !== "all" && filteredArrived.length > 0 && filteredArrivedTotal > 0 && Number(mFrom) <= Number(mTo);
  const canClearPaid = selectedDoctor !== "all" && filteredSettledTotal > 0;

  if (loading || !profile) return <MobileLoading text="جاري تحميل المحاسبة..." />;

  const charts = <>
    <ChartPanel title="إنجاز الدكاترة" data={doctorChart} />
    <ChartPanel title="حالات الأقسام" data={deptChart} />
  </>;

  return (
    <MobileShell
      title="المحاسبة"
      profile={profile}
      tabs={tabsForRole("accountant")}
      active={active}
      onTabChange={setActive}
      avatarUrl={avatarUrl}
    >
      {message && <Notice message={message} danger={message.includes("تعذر") || message.includes("يجب")} />}

      {/* نافذة تأكيد مخصصة */}
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDialog({ open: false, title: "", desc: "", onConfirm: () => {} })}>
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-3">{dialog.title}</h3>
            <p className="text-sm text-slate-600 whitespace-pre-line mb-6">{dialog.desc}</p>
            <div className="flex gap-3">
              <button onClick={() => setDialog({ open: false, title: "", desc: "", onConfirm: () => {} })} className="flex-1 h-11 rounded-xl bg-slate-200 text-slate-700 font-bold text-sm">إلغاء</button>
              <button onClick={dialog.onConfirm} className="flex-1 h-11 rounded-xl bg-[#0f8f7d] text-white font-bold text-sm">تأكيد</button>
            </div>
          </div>
        </div>
      )}

      {active === "overview" && <>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <MobileStatCard label="مستحقات المستقبلين" value={formatMoney(overviewArrivedTotal)} icon={<Wallet size={18} />} />
          <MobileStatCard label="مصروف تراكمي" value={formatMoney(overviewSettledTotal)} icon={<CheckCircle2 size={18} />} tone="blue" />
          <MobileStatCard label="معلقة متوقعة" value={formatMoney(overviewPendingTotal)} icon={<Clock size={18} />} tone="orange" />
          <MobileStatCard label="الأطباء" value={(data.doctors || []).length} icon={<Users size={18} />} tone="purple" />
        </div>
        {charts}
      </>}

      {(active === "profits" || active === "reports") && (
        <MobilePanel
          title={active === "profits" ? "تصفية المستحقات" : "التقارير المالية"}
          subtitle="عام أو محدد حسب الطبيب والفترة والقسم"
        >
          <Filters
            data={data}
            selectedDoctor={selectedDoctor} setSelectedDoctor={setSelectedDoctor}
            selectedDept={selectedDept} setSelectedDept={setSelectedDept}
            year={year} setYear={setYear}
            mFrom={mFrom} setMFrom={setMFrom}
            mTo={mTo} setMTo={setMTo}
            allMonths={allMonths} setAllMonths={setAllMonths}
          />

          {/* بطاقات خاصة بالفلترة الحالية */}
          <div className="my-3 grid grid-cols-2 gap-2">
            <MobileStatCard label="مستحق فعلي" value={formatMoney(filteredArrivedTotal)} />
            <MobileStatCard label="معلق متوقع" value={formatMoney(filteredPendingTotal)} tone="orange" />
            <MobileStatCard label="مصروف سابقًا" value={formatMoney(filteredSettledTotal)} tone="blue" />
            <MobileStatCard label="صافي" value={formatMoney(Math.max(filteredArrivedTotal - filteredSettledTotal, 0))} tone="purple" />
          </div>

          {/* أزرار التقارير - تظهر فقط في قسم التقارير */}
          {active === "reports" && (
            <div className="flex gap-2 mb-2">
              <button onClick={downloadReport} className="flex-1 h-12 rounded-2xl bg-slate-900 text-xs font-black text-white flex items-center justify-center gap-2">
                <Download size={16} /> تنزيل التقرير
              </button>
              <button onClick={printReport} className="flex-1 h-12 rounded-2xl bg-slate-700 text-xs font-black text-white flex items-center justify-center gap-2">
                <Printer size={16} /> طباعة التقرير
              </button>
            </div>
          )}

          {/* أزرار التصفية - تظهر فقط في قسم المستحقات */}
          {active === "profits" && (
            <>
              <button
                disabled={!canSettle || busy}
                onClick={settle}
                className="mb-2 h-12 w-full rounded-2xl bg-[#0f8f7d] text-xs font-black text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <AlertTriangle size={16} /> تصفية مستحقات الطبيب المحدد
              </button>
              
              <button
                disabled={!canClearPaid || busy}
                onClick={clearPaid}
                className="mb-2 h-12 w-full rounded-2xl bg-slate-600 text-xs font-black text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText size={16} /> تصفير المصروف مسبقًا
              </button>
            </>
          )}

          {/* قائمة الحالات المفلترة */}
          {filtered.slice(0, 10).map((r: any) => (
            <MobileInfoCard
              key={r.id}
              title={r.patient_name}
              subtitle={r.doctors?.full_name}
              meta={[
                { label: "القسم", value: r.departments?.name },
                { label: "الحالة", value: r.status },
                { label: "موظف الاستقبال", value: staffMap[r.arrived_by || ""] || "-" },
                { label: "إرسال", value: safeDate(r.referral_date || r.created_at) },
                { label: "استقبال", value: safeDate(r.arrived_at) },
              ]}
            />
          ))}
        </MobilePanel>
      )}

      {active === "profile" && <MobileProfile profile={profile} onUpdated={boot} />}
    </MobileShell>
  );
}

function ChartPanel({ title, data }: any) {
  return (
    <MobilePanel title={title}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="total" fill="#0f8f7d" name="الإجمالي" />
            <Bar dataKey="arrived" fill="#2563eb" name="وصل" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </MobilePanel>
  );
}

function Filters(p: any) {
  // التأكد من صحة الشهور تلقائياً
  const handleMFromChange = (val: string) => {
    p.setMFrom(val);
    if (Number(val) > Number(p.mTo)) p.setMTo(val);
  };
  
  return (
    <div className="grid gap-2">
      <MobileSelect value={p.selectedDoctor} onChange={(e: any) => p.setSelectedDoctor(e.target.value)}>
        <option value="all">كل الأطباء</option>
        {(p.data.doctors || []).map((d: any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
      </MobileSelect>
      <MobileSelect value={p.selectedDept} onChange={(e: any) => p.setSelectedDept(e.target.value)}>
        <option value="all">كل الأقسام</option>
        {(p.data.departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </MobileSelect>
      <MobileSelect value={p.year} onChange={(e: any) => p.setYear(e.target.value)}>
        {[2026, 2025, 2024].map(y => <option key={y} value={String(y)}>{y}</option>)}
      </MobileSelect>
      <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-600">
        <input type="checkbox" checked={p.allMonths} onChange={(e) => p.setAllMonths(e.target.checked)} />
        كل الأشهر
      </label>
      {!p.allMonths && (
        <div className="grid grid-cols-2 gap-2">
          <MobileSelect value={p.mFrom} onChange={(e: any) => handleMFromChange(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={String(m)}>من شهر {m}</option>)}
          </MobileSelect>
          <MobileSelect value={p.mTo} onChange={(e: any) => p.setMTo(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).filter(m => m >= Number(p.mFrom)).map(m => <option key={m} value={String(m)}>إلى شهر {m}</option>)}
          </MobileSelect>
        </div>
      )}
    </div>
  );
}