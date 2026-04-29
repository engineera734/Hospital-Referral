"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AlertTriangle, CheckCircle2, Clock, FileText, Users, Wallet, Download, FileDown } from "lucide-react";
import MobileShell, { MobileLoading, Notice, tabsForRole } from "../../../src/components/mobile/mobile-shell";
import { MobileInfoCard, MobilePanel, MobileSelect, MobileStatCard } from "../../../src/components/mobile/mobile-cards";
import MobileProfile from "../../../src/components/mobile/mobile-profile";
import { getMobileProfile, mobileAuthFetch, safeDate, monthNumber, signStorage } from "../../../src/components/mobile/mobile-api";
import { formatMoney } from "../../../src/lib/format";
import {
  buildFinancialReportHtml,
  downloadMobileHtml,
  buildSettlementReceiptHtml,
  downloadMobilePdf,
} from "../../../src/components/mobile/mobile-reports";

export default function Page() {
  const [active, setActive] = useState("overview");
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [data, setData] = useState<any>({
    doctors: [],
    referrals: [],
    rates: [],
    settlements: [],
    departments: [],
    staff: [],
  });
  const [message, setMessage] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [mFrom, setMFrom] = useState("1");
  const [mTo, setMTo] = useState(String(new Date().getMonth() + 1));
  const [allMonths, setAllMonths] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    desc: string;
    onConfirm: () => void;
  }>({ open: false, title: "", desc: "", onConfirm: () => {} });

  useEffect(() => {
    boot();
  }, []);

  async function boot() {
    try {
      setLoading(true);
      const p = await getMobileProfile();
      if (!p) return;

      if (String(p.role).toLowerCase() !== "accountant") {
        window.location.href = "/mobile/dashboard";
        return;
      }

      setProfile(p);
      signStorage("profile-images", p.avatar_path).then(setAvatarUrl);

      const fetchedData = await mobileAuthFetch("/api/accounting/dashboard-data");

      setData({
        doctors: fetchedData?.doctors || [],
        referrals: fetchedData?.referrals || [],
        rates: fetchedData?.rates || [],
        settlements: fetchedData?.settlements || [],
        departments: fetchedData?.departments || [],
        staff: fetchedData?.staff || [],
      });
    } catch (e: any) {
      setMessage(e?.message || "تعذر تحميل صفحة المحاسبة.");
    } finally {
      setLoading(false);
    }
  }

  const rateMap = useMemo<Map<string,number>>(() => {
    return new Map(
      (data.rates || []).map((r: any) => [
        `${r.doctor_id}:${r.department_id}`,
        Number(r.amount || 0),
      ])
    );
  }, [data.rates]);

  const staffMap = useMemo(() => {
    const map: Record<string, string> = {};
    (data.staff || []).forEach((s: any) => {
      if (s.id && s.full_name) map[s.id] = s.full_name;
    });
    return map;
  }, [data.staff]);

  const allReferrals = useMemo(() => data.referrals || [], [data.referrals]);
  const allArrived = useMemo(() => allReferrals.filter((r: any) => r.status === "arrived"), [allReferrals]);
  const allPending = useMemo(() => allReferrals.filter((r: any) => r.status === "pending"), [allReferrals]);

  const overviewArrivedTotal = useMemo(() => {
    return allArrived.reduce(
      (s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0),
      0
    );
  }, [allArrived, rateMap]);

  const overviewPendingTotal = useMemo(() => {
    return allPending.reduce(
      (s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0),
      0
    );
  }, [allPending, rateMap]);

  const overviewSettledTotal = useMemo(() => {
    return (data.settlements || []).reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  }, [data.settlements]);

  const filtered = useMemo(() => {
    const from = Number(mFrom);
    const to = Number(mTo);
    const yr = Number(year);

    return (data.referrals || []).filter((r: any) => {
      const date = r.arrived_at || r.referral_date || r.created_at;
      const dt = new Date(date || "");
      const mn = monthNumber(date);

      return (
        (selectedDoctor === "all" || r.doctors?.id === selectedDoctor) &&
        (selectedDept === "all" || r.departments?.id === selectedDept) &&
        (!year || Number.isNaN(dt.getTime()) || dt.getFullYear() === yr) &&
        (allMonths || (mn >= from && mn <= to))
      );
    });
  }, [data.referrals, selectedDoctor, selectedDept, year, mFrom, mTo, allMonths]);

  const filteredArrived = useMemo(() => filtered.filter((r: any) => r.status === "arrived"), [filtered]);
  const filteredPending = useMemo(() => filtered.filter((r: any) => r.status === "pending"), [filtered]);

  const filteredArrivedTotal = useMemo(() => {
    return filteredArrived.reduce(
      (s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0),
      0
    );
  }, [filteredArrived, rateMap]);

  const filteredPendingTotal = useMemo(() => {
    return filteredPending.reduce(
      (s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0),
      0
    );
  }, [filteredPending, rateMap]);

  const filteredSettledTotal = useMemo(() => {
    if (selectedDoctor === "all") return 0;
    return (data.settlements || [])
      .filter((s: any) => s.doctor_id === selectedDoctor)
      .reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  }, [data.settlements, selectedDoctor]);

  const doctorChart = (data.doctors || [])
    .map((d: any) => {
      const rows = (data.referrals || []).filter((r: any) => r.doctors?.id === d.id);
      return {
        name: d.full_name,
        total: rows.length,
        arrived: rows.filter((r: any) => r.status === "arrived").length,
      };
    })
    .filter((x: any) => x.total > 0)
    .slice(0, 8);

  const deptChart = (data.departments || [])
    .map((d: any) => {
      const rows = (data.referrals || []).filter((r: any) => r.departments?.id === d.id);
      return {
        name: d.name,
        total: rows.length,
        arrived: rows.filter((r: any) => r.status === "arrived").length,
      };
    })
    .filter((x: any) => x.total > 0)
    .slice(0, 8);

  function validate(): boolean {
    if (!allMonths && Number(mFrom) > Number(mTo)) {
      setMessage("يجب أن يكون شهر البداية أصغر أو يساوي شهر النهاية.");
      return false;
    }
    return true;
  }

  function getRateMapObj(): Record<string, number> {
    const obj: Record<string, number> = {};
    rateMap.forEach((v, k) => {
      obj[String(k)] = Number(v);
    });
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

    const fileName =
      selectedDoctor === "all"
        ? `تقرير-محاسبة-عام-${year}.html`
        : `تقرير-محاسبة-${selectedDoctor}-${year}.html`;

    downloadMobileHtml(fileName, html);
    setMessage("تم تنزيل التقرير بنجاح ✅");
  }

  async function downloadReportPdf() {
    const html = report();
    if (!html) return;

    const fileName =
      selectedDoctor === "all"
        ? `تقرير-محاسبة-عام-${year}.pdf`
        : `تقرير-محاسبة-${selectedDoctor}-${year}.pdf`;

    await downloadMobilePdf(fileName, html);
    setMessage("تم فتح التقرير للطباعة أو الحفظ PDF ✅");
  }

  function createSettlementReceipt(settleAmount: number) {
    const doctor = (data.doctors || []).find((d: any) => d.id === selectedDoctor);
    if (!doctor) return;

    const scopeText = allMonths
      ? `كل الأشهر في سنة ${year}`
      : `من شهر ${mFrom} إلى شهر ${mTo} / سنة ${year}`;

    const receiptHtml = buildSettlementReceiptHtml({
      doctorName: doctor.full_name,
      doctorSpecialty: doctor.specialty,
      scope: scopeText,
      count: filteredArrived.length,
      amount: settleAmount,
      settledBy: profile?.full_name || "محاسب",
      date: new Date().toLocaleDateString("ar-SA"),
      rows: filteredArrived,
      rateMap: getRateMapObj(),
      staffMap,
    });

    downloadMobileHtml(`إيصال-تصفية-${doctor.full_name}-${year}.html`, receiptHtml);
  }

  async function settle() {
    if (selectedDoctor === "all") {
      setMessage("اختر طبيبًا محددًا قبل تصفية المستحقات.");
      return;
    }

    if (!validate()) return;

    const preReportHtml = report();
    if (preReportHtml) {
      downloadMobileHtml(`تقرير-قبل-التصفية-${selectedDoctor}-${year}.html`, preReportHtml);
    }

    setDialog({
      open: true,
      title: "تأكيد التصفية",
      desc: `سيتم تصفية مستحقات الطبيب:\n\nعدد الحالات: ${filteredArrived.length}\nالمبلغ: ${formatMoney(filteredArrivedTotal)}\n\nتم تنزيل تقرير ما قبل التصفية.\nهل تريد المتابعة؟`,
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
          setMessage(`✅ تمت التصفية بنجاح. المبلغ: ${formatMoney(settleAmount)}`);
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
      setMessage("لا يوجد مصروف سابق لتصفيره لهذا الطبيب.");
      return;
    }

    const doctor = (data.doctors || []).find((d: any) => d.id === selectedDoctor);

    setDialog({
      open: true,
      title: "تصفير المصروف مسبقًا",
      desc: `سيتم تصفير المصروف مسبقًا للطبيب:\n\n${doctor?.full_name || selectedDoctor}\nالمبلغ الحالي: ${formatMoney(filteredSettledTotal)}\n\nهل أنت متأكد؟`,
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

  const canSettle =
    selectedDoctor !== "all" &&
    filteredArrived.length > 0 &&
    filteredArrivedTotal > 0 &&
    (allMonths || Number(mFrom) <= Number(mTo));

  const canClearPaid = selectedDoctor !== "all" && filteredSettledTotal > 0;

  if (loading || !profile) {
    return <MobileLoading text="جاري تحميل المحاسبة..." />;
  }

  return (
    <MobileShell
      title="المحاسبة"
      profile={profile}
      tabs={tabsForRole("accountant")}
      active={active}
      onTabChange={setActive}
      avatarUrl={avatarUrl}
    >
      {message && (
        <Notice
          message={message}
          danger={message.includes("تعذر") || message.includes("يجب") || message.includes("اختر")}
        />
      )}

      {dialog.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDialog({ open: false, title: "", desc: "", onConfirm: () => {} })}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="text-amber-600" size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{dialog.title}</h3>
            </div>

            <p className="mb-6 whitespace-pre-line text-center text-sm leading-relaxed text-slate-600">
              {dialog.desc}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDialog({ open: false, title: "", desc: "", onConfirm: () => {} })}
                className="h-12 flex-1 rounded-xl bg-slate-100 text-sm font-bold text-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={dialog.onConfirm}
                className="h-12 flex-1 rounded-xl bg-[#0f8f7d] text-sm font-bold text-white"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {active === "overview" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <MobileStatCard label="مستحقات المستقبلين" value={formatMoney(overviewArrivedTotal)} icon={<Wallet size={18} />} />
            <MobileStatCard label="مصروف تراكمي" value={formatMoney(overviewSettledTotal)} icon={<CheckCircle2 size={18} />} tone="blue" />
            <MobileStatCard label="معلقة متوقعة" value={formatMoney(overviewPendingTotal)} icon={<Clock size={18} />} tone="orange" />
            <MobileStatCard label="الأطباء" value={(data.doctors || []).length} icon={<Users size={18} />} tone="purple" />
          </div>

          <ChartPanel title="إنجاز الدكاترة" data={doctorChart} />
          <ChartPanel title="حالات الأقسام" data={deptChart} />
        </>
      )}

      {["settlements", "profits", "reports"].includes(active) && (
        <MobilePanel
          title={["settlements", "profits"].includes(active) ? "تصفية المستحقات" : "التقارير المالية"}
          subtitle="عام أو محدد حسب الطبيب والفترة والقسم"
        >
          <Filters
            data={data}
            selectedDoctor={selectedDoctor}
            setSelectedDoctor={setSelectedDoctor}
            selectedDept={selectedDept}
            setSelectedDept={setSelectedDept}
            year={year}
            setYear={setYear}
            mFrom={mFrom}
            setMFrom={setMFrom}
            mTo={mTo}
            setMTo={setMTo}
            allMonths={allMonths}
            setAllMonths={setAllMonths}
          />

          <div className="my-3 grid grid-cols-2 gap-2">
            <MobileStatCard label="مستحق فعلي" value={formatMoney(filteredArrivedTotal)} />
            <MobileStatCard label="معلق متوقع" value={formatMoney(filteredPendingTotal)} tone="orange" />
            <MobileStatCard label="مصروف سابقًا" value={formatMoney(filteredSettledTotal)} tone="blue" />
            <MobileStatCard label="صافي" value={formatMoney(Math.max(filteredArrivedTotal - filteredSettledTotal, 0))} tone="purple" />
          </div>

          {active === "reports" && (
            <div className="mb-3 space-y-2">
              <button
                onClick={downloadReport}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-xs font-black text-white"
              >
                <Download size={16} />
                تنزيل التقرير HTML
              </button>

              <button
                onClick={downloadReportPdf}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 text-xs font-black text-white"
              >
                <FileDown size={16} />
                تنزيل التقرير PDF
              </button>
            </div>
          )}

          {["settlements", "profits"].includes(active) && (
            <div className="mb-3 space-y-2">
              <button
                disabled={!canSettle || busy}
                onClick={settle}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0f8f7d] text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <AlertTriangle size={16} />
                تصفية مستحقات الطبيب المحدد
              </button>

              <button
                disabled={!canClearPaid || busy}
                onClick={clearPaid}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-600 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileText size={16} />
                تصفير المصروف مسبقًا
              </button>
            </div>
          )}

          <ReferralList rows={filtered} rateMap={rateMap} staffMap={staffMap} />
        </MobilePanel>
      )}

      {["referrals", "cases"].includes(active) && (
        <MobilePanel title="الإحالات المرضية" subtitle="كل الإحالات الموجودة في النظام">
          <ReferralList rows={allReferrals} rateMap={rateMap} staffMap={staffMap} limit={30} />
        </MobilePanel>
      )}

      {active === "profile" && <MobileProfile profile={profile} onUpdated={boot} />}
    </MobileShell>
  );
}

function ReferralList({
  rows,
  rateMap,
  staffMap,
  limit = 15,
}: {
  rows: any[];
  rateMap: Map<string, number>;
  staffMap: Record<string, string>;
  limit?: number;
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        <p className="text-lg">لا توجد حالات</p>
        <p className="mt-1 text-sm">جرب تغيير الفلترة</p>
      </div>
    );
  }

  return (
    <>
      {rows.slice(0, limit).map((r: any) => {
        const profitKey = `${r.doctors?.id}:${r.departments?.id || ""}`;
        const profitValue = Number(rateMap.get(profitKey) || 0);

        return (
          <MobileInfoCard
            key={r.id}
            title={r.patient_name || "غير معروف"}
            subtitle={`👨‍⚕️ ${r.doctors?.full_name || "-"} | 🏥 ${r.departments?.name || "-"}`}
            meta={[
              { label: "الحالة", value: r.status === "arrived" ? "✅ مستقبلة" : "⏳ منتظرة" },
              { label: "موظف الاستقبال", value: staffMap[r.arrived_by || ""] || r.arrived_by || "-" },
              { label: "تاريخ الإرسال", value: safeDate(r.referral_date || r.created_at) },
              { label: "تاريخ الاستقبال", value: safeDate(r.arrived_at) || "لم يستقبل بعد" },
              { label: "الربح", value: formatMoney(profitValue) },
            ]}
          />
        );
      })}
    </>
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
  function handleMFromChange(val: string) {
    p.setMFrom(val);
    if (Number(val) > Number(p.mTo)) p.setMTo(val);
  }

  return (
    <div className="grid gap-2">
      <MobileSelect value={p.selectedDoctor} onChange={(e) => p.setSelectedDoctor(e.target.value)}>
        <option value="all">كل الأطباء</option>
        {(p.data.doctors || []).map((d: any) => (
          <option key={d.id} value={d.id}>
            {d.full_name}
          </option>
        ))}
      </MobileSelect>

      <MobileSelect value={p.selectedDept} onChange={(e) => p.setSelectedDept(e.target.value)}>
        <option value="all">كل الأقسام</option>
        {(p.data.departments || []).map((d: any) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </MobileSelect>

      <MobileSelect value={p.year} onChange={(e) => p.setYear(e.target.value)}>
        {[2026, 2025, 2024].map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </MobileSelect>

      <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-600">
        <input
          type="checkbox"
          checked={p.allMonths}
          onChange={(e) => p.setAllMonths(e.target.checked)}
        />
        كل الأشهر
      </label>

      {!p.allMonths && (
        <div className="grid grid-cols-2 gap-2">
          <MobileSelect value={p.mFrom} onChange={(e) => handleMFromChange(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={String(m)}>
                من {m}
              </option>
            ))}
          </MobileSelect>

          <MobileSelect value={p.mTo} onChange={(e) => p.setMTo(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1)
              .filter((m) => m >= Number(p.mFrom))
              .map((m) => (
                <option key={m} value={String(m)}>
                  إلى {m}
                </option>
              ))}
          </MobileSelect>
        </div>
      )}
    </div>
  );
}
