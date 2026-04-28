"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { FileText, Stethoscope, Users, Wallet, Trash2, Plus, AlertTriangle, Download, Printer, FileDown, UserX } from "lucide-react";
import MobileShell, { MobileLoading, Notice, tabsForRole } from "../../../src/components/mobile/mobile-shell";
import { MobileAvatar, MobileInfoCard, MobilePanel, MobileSelect, MobileStatCard, MobileInput } from "../../../src/components/mobile/mobile-cards";
import MobileProfile from "../../../src/components/mobile/mobile-profile";
import { getMobileProfile, mobileAuthFetch, safeDate, signStorage, getDoctorAvatarPath, doctorByReferral, monthNumber } from "../../../src/components/mobile/mobile-api";
import { formatMoney, formatDate, formatDepartment } from "../../../src/lib/format";
import { buildFinancialReportHtml, downloadMobileHtml, printMobileHtml, buildSettlementReceiptHtml, downloadMobilePdf } from "../../../src/components/mobile/mobile-reports";

export default function Page() {
  const [active, setActive] = useState("overview");
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [data, setData] = useState<any>({ doctors: [], departments: [], referrals: [], staff: [], rates: [], settlements: [], people: [] });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  
  // الأقسام الفرعية
  const [doctorSub, setDoctorSub] = useState("list");
  const [staffSub, setStaffSub] = useState("list");
  const [staffFilterRole, setStaffFilterRole] = useState<"all" | "reception" | "accountant">("all");
  
  // الفلاتر
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [rateDoctor, setRateDoctor] = useState("");
  const [settleDoctorId, setSettleDoctorId] = useState("");
  const [settleScope, setSettleScope] = useState("all");
  const [settleYear, setSettleYear] = useState(String(new Date().getFullYear()));
  const [settleMFrom, setSettleMFrom] = useState("1");
  const [settleMTo, setSettleMTo] = useState(String(new Date().getMonth() + 1));
  
  // تقارير
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [reportDoctor, setReportDoctor] = useState("all");
  const [reportDept, setReportDept] = useState("all");
  const [reportAllMonths, setReportAllMonths] = useState(true);
  const [reportMFrom, setReportMFrom] = useState("1");
  const [reportMTo, setReportMTo] = useState(String(new Date().getMonth() + 1));
  
  // النماذج
  const [doctorForm, setDoctorForm] = useState<any>({ full_name: "", email: "", password: "", card_no: "", specialty: "", phone: "", national_id: "", kareemy_account: "" });
  const [staffForm, setStaffForm] = useState<any>({ full_name: "", email: "", password: "", phone: "", national_id: "", role: "reception" });
  const [rateDraft, setRateDraft] = useState<any>({});
  
  // نافذة تأكيد
  const [dialog, setDialog] = useState<{ open: boolean; title: string; desc: string; onConfirm: () => void }>({ open: false, title: "", desc: "", onConfirm: () => {} });

  useEffect(() => { boot(); }, []);

  async function boot() {
    try {
      const p = await getMobileProfile();
      if (!p) return;
      if (String(p.role).toLowerCase() !== "admin") return window.location.href = "/mobile/dashboard";
      setProfile(p);
      signStorage("profile-images", p.avatar_path).then(setAvatarUrl);
      const json = await mobileAuthFetch("/api/admin/dashboard-data");
      
      // إثراء بيانات الإحالات بالصور
      const enriched = await Promise.all((json.referrals || []).map(async (r: any) => {
        const d = doctorByReferral(r, json.doctors || []);
        return {
          ...r,
          doctor_avatar: await signStorage("profile-images", getDoctorAvatarPath(d, json.people || [])),
          attachment_url: await signStorage("referral-files", r.attachment_path),
        };
      }));
      
      setData({ ...json, referrals: enriched });
      
      // تعيين الطبيب الافتراضي للنسب والتصفية
      if (json.doctors?.[0]?.id) {
        if (!rateDoctor) setRateDoctor(json.doctors[0].id);
        if (!settleDoctorId) setSettleDoctorId(json.doctors[0].id);
      }
    } catch (e: any) {
      setMessage(e?.message || "تعذر تحميل لوحة الإدارة.");
    } finally {
      setLoading(false);
    }
  }

  // خرائط البيانات
  const rateMap = useMemo(() => new Map((data.rates || []).map((r: any) => [`${r.doctor_id}:${r.department_id}`, Number(r.amount || 0)])), [data.rates]);
  
  const peopleMap = useMemo(() => {
    const map: Record<string, string> = {};
    (data.people || []).forEach((p: any) => { if (p.avatar_path) map[p.id] = p.avatar_path; });
    return map;
  }, [data.people]);

  const staffNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (data.staff || []).forEach((s: any) => { map[s.id] = s.full_name; });
    return map;
  }, [data.staff]);

  // إحصائيات
  const allReferrals = data.referrals || [];
  const pendingExpected = allReferrals.filter((r: any) => r.status === "pending").reduce((s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0), 0);
  const arrivedAmount = allReferrals.filter((r: any) => r.status === "arrived").reduce((s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0), 0);
  const settledTotal = (data.settlements || []).reduce((s: number, x: any) => s + Number(x.amount || 0), 0);

  // بيانات الطبيب المحدد للتصفية
  const settleDoctor = (data.doctors || []).find((d: any) => d.id === settleDoctorId);
  const settlementPreview = useMemo(() => {
    if (!settleDoctor) return { rows: [], amount: 0, count: 0, valid: true };
    const mf = Number(settleMFrom), mt = Number(settleMTo), yr = Number(settleYear);
    const valid = settleScope === "all" || mf <= mt;
    if (!valid) return { rows: [], amount: 0, count: 0, valid: false };
    
    const rows = allReferrals.filter((r: any) => {
      if (r.doctors?.id !== settleDoctorId || r.status !== "arrived") return false;
      const date = r.arrived_at || r.referral_date || r.created_at;
      const dt = new Date(date || "");
      if (Number.isNaN(dt.getTime()) || dt.getFullYear() !== yr) return false;
      if (settleScope === "all") return true;
      const mn = monthNumber(date);
      return mn >= mf && mn <= mt;
    });
    
    const amount = rows.reduce((s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0), 0);
    return { rows, amount, count: rows.length, valid: true };
  }, [settleDoctor, settleDoctorId, allReferrals, settleScope, settleYear, settleMFrom, settleMTo, rateMap]);

  // بيانات الدكتور للتصفية
  const settleDoctorCard = useMemo(() => {
    if (!settleDoctor) return null;
    const rows = allReferrals.filter((r: any) => r.doctors?.id === settleDoctor.id);
    const settled = (data.settlements || []).filter((s: any) => s.doctor_id === settleDoctor.id).reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
    return { doctor: settleDoctor, total: rows.length, arrived: rows.filter((r: any) => r.status === "arrived").length, settled };
  }, [settleDoctor, allReferrals, data.settlements]);

  // الرسم البياني
  const chartData = (data.doctors || []).map((d: any) => {
    const rows = allReferrals.filter((r: any) => r.doctors?.id === d.id);
    return { name: d.full_name, total: rows.length, arrived: rows.filter((r: any) => r.status === "arrived").length };
  }).filter((x: any) => x.total > 0).slice(0, 10);

  // دوال API
  async function addDoctor() {
    try {
      setBusy(true);
      await mobileAuthFetch("/api/admin/create-doctor-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doctorForm) });
      setMessage("تم إضافة الطبيب بنجاح ✅");
      setDoctorForm({ full_name: "", email: "", password: "", card_no: "", specialty: "", phone: "", national_id: "", kareemy_account: "" });
      await boot();
    } catch (e: any) {
      setMessage(e?.message || "تعذر إضافة الطبيب.");
    } finally {
      setBusy(false);
    }
  }

  async function addStaff() {
    try {
      setBusy(true);
      await mobileAuthFetch("/api/admin/create-staff-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(staffForm) });
      setMessage("تم إضافة الموظف بنجاح ✅");
      setStaffForm({ full_name: "", email: "", password: "", phone: "", national_id: "", role: "reception" });
      await boot();
    } catch (e: any) {
      setMessage(e?.message || "تعذر إضافة الموظف.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDoctor(id: string, name: string) {
    setDialog({
      open: true,
      title: "حذف الطبيب",
      desc: `سيتم حذف الطبيب: ${name}\nوكل بياناته ومرضاه المرتبطين به نهائياً.\n\nهل أنت متأكد؟`,
      onConfirm: async () => {
        setDialog({ open: false, title: "", desc: "", onConfirm: () => {} });
        try {
          setBusy(true);
          await mobileAuthFetch("/api/admin/delete-doctor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctor_id: id }) });
          setMessage("تم حذف الطبيب ✅");
          await boot();
        } catch (e: any) {
          setMessage(e?.message || "تعذر حذف الطبيب.");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function deleteStaff(id: string, name: string) {
    setDialog({
      open: true,
      title: "حذف الموظف",
      desc: `سيتم حذف الموظف: ${name}\nمن النظام نهائياً.\n\nهل أنت متأكد؟`,
      onConfirm: async () => {
        setDialog({ open: false, title: "", desc: "", onConfirm: () => {} });
        try {
          setBusy(true);
          await mobileAuthFetch("/api/admin/delete-staff-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staff_id: id }) });
          setMessage("تم حذف الموظف ✅");
          await boot();
        } catch (e: any) {
          setMessage(e?.message || "تعذر حذف الموظف.");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function saveRates() {
    if (!rateDoctor) { setMessage("اختر الطبيب أولاً."); return; }
    try {
      setBusy(true);
      const rates = (data.departments || []).map((d: any) => ({ department_id: d.id, amount: Number(rateDraft[d.id] || 0) }));
      await mobileAuthFetch("/api/admin/save-doctor-rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctor_id: rateDoctor, rates }) });
      setMessage("تم حفظ نسب الطبيب ✅");
      await boot();
    } catch (e: any) {
      setMessage(e?.message || "تعذر حفظ النسب.");
    } finally {
      setBusy(false);
    }
  }

  async function settleDoctorAction() {
    if (!settleDoctorId) { setMessage("اختر طبيباً."); return; }
    if (settlementPreview.count === 0 || settlementPreview.amount <= 0) { setMessage("لا توجد مستحقات للتصفية."); return; }
    if (!settlementPreview.valid) { setMessage("النطاق الزمني غير صالح."); return; }
    
    // تنزيل تقرير قبل التصفية
    const preHtml = buildSettlementReport();
    if (preHtml) downloadMobileHtml(`تقرير-قبل-التصفية-${settleDoctor?.full_name}.html`, preHtml);
    
    setDialog({
      open: true,
      title: "تأكيد التصفية",
      desc: `سيتم تصفية مستحقات:\n👨‍⚕️ ${settleDoctor?.full_name}\n📋 عدد الحالات: ${settlementPreview.count}\n💰 المبلغ: ${formatMoney(settlementPreview.amount)}\n\nتم تنزيل تقرير ما قبل التصفية.`,
      onConfirm: async () => {
        setDialog({ open: false, title: "", desc: "", onConfirm: () => {} });
        try {
          setBusy(true);
          const json = await mobileAuthFetch("/api/admin/settle-doctor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              doctor_id: settleDoctorId,
              settled_by: profile.id,
              note: "تصفية من لوحة الإدارة - تطبيق الهاتف",
              scope: settleScope,
              year: settleYear,
              month_from: settleMFrom,
              month_to: settleMTo,
            }),
          });
          const amount = Number(json.amount || 0);
          
          // إنشاء إيصال التصفية
          const receiptHtml = buildSettlementReceiptHtml({
            doctorName: settleDoctor?.full_name || "",
            doctorSpecialty: settleDoctor?.specialty,
            scope: settleScope === "all" ? `كل أشهر ${settleYear}` : `من شهر ${settleMFrom} إلى ${settleMTo} / ${settleYear}`,
            count: settlementPreview.count,
            amount,
            settledBy: profile?.full_name || "مدير",
            date: new Date().toLocaleDateString('ar-SA'),
            rows: settlementPreview.rows,
            rateMap: getRateMapObj(),
            staffMap: staffNameMap,
          });
          downloadMobileHtml(`إيصال-تصفية-${settleDoctor?.full_name}.html`, receiptHtml);
          
          setMessage(`✅ تمت التصفية بمبلغ ${formatMoney(amount)}`);
          await boot();
        } catch (e: any) {
          setMessage(e?.message || "تعذر التصفية");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function clearPaidAction() {
    if (!settleDoctorId || !settleDoctorCard || settleDoctorCard.settled <= 0) {
      setMessage("لا يوجد مصروف سابق لتصفيره.");
      return;
    }
    setDialog({
      open: true,
      title: "تصفير المصروف مسبقاً",
      desc: `سيتم تصفير المصروف للطبيب:\n👨‍⚕️ ${settleDoctor?.full_name}\n💵 المبلغ: ${formatMoney(settleDoctorCard.settled)}`,
      onConfirm: async () => {
        setDialog({ open: false, title: "", desc: "", onConfirm: () => {} });
        try {
          setBusy(true);
          await mobileAuthFetch("/api/admin/settle-doctor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doctor_id: settleDoctorId, settled_by: profile.id, mode: "clear_paid", note: "مسح المصروف - تطبيق الهاتف" }),
          });
          setMessage("✅ تم تصفير المصروف");
          await boot();
        } catch (e: any) {
          setMessage(e?.message || "تعذر تصفير المصروف");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  function getRateMapObj(): Record<string, number> {
    const obj: Record<string, number> = {};
    rateMap.forEach((v, k) => { obj[String(k)] = Number(v); });
    return obj;
  }

  // تقارير
  function buildFullReport(): string | null {
    const filtered = allReferrals.filter((r: any) => {
      const date = r.referral_date || r.created_at;
      const dt = new Date(date || "");
      if (Number.isNaN(dt.getTime())) return false;
      if (dt.getFullYear() !== Number(reportYear)) return false;
      if (!reportAllMonths) {
        const mn = monthNumber(date);
        if (mn < Number(reportMFrom) || mn > Number(reportMTo)) return false;
      }
      if (reportDoctor !== "all" && r.doctors?.id !== reportDoctor) return false;
      if (reportDept !== "all" && r.departments?.id !== reportDept) return false;
      return true;
    });
    
    const doctor = (data.doctors || []).find((d: any) => d.id === reportDoctor);
    const department = (data.departments || []).find((d: any) => d.id === reportDept);
    
    return buildFinancialReportHtml({
      title: "تقرير الإدارة الشامل",
      rows: filtered,
      doctor,
      department,
      year: reportYear,
      monthFrom: reportAllMonths ? null : reportMFrom,
      monthTo: reportAllMonths ? null : reportMTo,
      rateMap: getRateMapObj(),
      settlements: data.settlements,
      staffMap: staffNameMap,
    });
  }

  function buildStaffReport(): string {
    const receptions = (data.staff || []).filter((s: any) => s.role === "reception");
    const accountants = (data.staff || []).filter((s: any) => s.role === "accountant");
    
    const receptionRows = receptions.map((s: any) => {
      const confirmed = allReferrals.filter((r: any) => r.arrived_by === s.id).length;
      return `<tr><td>${s.full_name}</td><td>${s.username}</td><td>${s.phone || "-"}</td><td>${s.national_id || "-"}</td><td>${confirmed}</td></tr>`;
    }).join("") || `<tr><td colspan="5">لا يوجد</td></tr>`;
    
    const accountantRows = accountants.map((s: any) => {
      return `<tr><td>${s.full_name}</td><td>${s.username}</td><td>${s.phone || "-"}</td><td>${s.national_id || "-"}</td><td>-</td></tr>`;
    }).join("") || `<tr><td colspan="5">لا يوجد</td></tr>`;
    
    const doctorRows = (data.doctors || []).map((d: any) => {
      const rows = allReferrals.filter((r: any) => r.doctors?.id === d.id);
      const arrived = rows.filter((r: any) => r.status === "arrived").length;
      const profit = rows.filter((r: any) => r.status === "arrived").reduce((s: number, r: any) => s + Number(rateMap.get(`${r.doctors?.id}:${r.departments?.id || ""}`) || 0), 0);
      return `<tr><td>${d.full_name}</td><td>${d.specialty || "-"}</td><td>${d.card_no || "-"}</td><td>${d.phone || "-"}</td><td>${d.kareemy_account || "-"}</td><td>${rows.length}</td><td>${arrived}</td><td>${formatMoney(profit)}</td></tr>`;
    }).join("") || `<tr><td colspan="8">لا يوجد</td></tr>`;
    
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير الموظفين والأطباء</title>
<style>body{font-family:Arial;padding:16px;direction:rtl;background:#f8fafc}h1{color:#1e293b;border-bottom:3px solid #3b82f6;padding-bottom:8px}h2{color:#3b82f6;margin-top:20px}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:11px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:right}th{background:#eff6ff;color:#1e40af}.footer{text-align:center;margin-top:16px;color:#94a3b8;font-size:11px}</style></head><body>
<h1>📊 تقرير شامل - الموظفون والأطباء</h1>
<p style="color:#64748b">تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA')}</p>
<h2>👤 موظفو الاستقبال (${receptions.length})</h2>
<table><thead><tr><th>الاسم</th><th>البريد</th><th>الهاتف</th><th>الهوية</th><th>تأكيدات الوصول</th></tr></thead><tbody>${receptionRows}</tbody></table>
<h2>🧮 موظفو المحاسبة (${accountants.length})</h2>
<table><thead><tr><th>الاسم</th><th>البريد</th><th>الهاتف</th><th>الهوية</th><th>ملاحظات</th></tr></thead><tbody>${accountantRows}</tbody></table>
<h2>👨‍⚕️ الأطباء (${(data.doctors || []).length})</h2>
<table><thead><tr><th>الاسم</th><th>التخصص</th><th>البطاقة</th><th>الهاتف</th><th>الكريمي</th><th>التحويلات</th><th>وصل</th><th>الأرباح</th></tr></thead><tbody>${doctorRows}</tbody></table>
<div class="footer">تم إنشاء هذا التقرير تلقائياً من نظام المشفى</div></body></html>`;
  }

  function buildSettlementReport(): string | null {
    if (!settleDoctor) return null;
    return buildFinancialReportHtml({
      title: `تقرير ما قبل التصفية - ${settleDoctor.full_name}`,
      rows: settlementPreview.rows,
      doctor: settleDoctor,
      department: null,
      year: settleYear,
      monthFrom: settleScope === "all" ? null : settleMFrom,
      monthTo: settleScope === "all" ? null : settleMTo,
      rateMap: getRateMapObj(),
      settlements: data.settlements,
      staffMap: staffNameMap,
    });
  }

  function exportReport() {
    const html = buildFullReport();
    if (html) {
      downloadMobileHtml(`تقرير-الإدارة-${reportYear}.html`, html);
      setMessage("تم تنزيل التقرير ✅");
    }
  }

  function exportStaffReport() {
    const html = buildStaffReport();
    downloadMobileHtml("تقرير-الموظفين-والأطباء.html", html);
    setMessage("تم تنزيل تقرير الموظفين ✅");
  }

  // معالجة تغيير شهر البداية في التصفية
  function handleSettleMFromChange(val: string) {
    setSettleMFrom(val);
    if (Number(val) > Number(settleMTo)) setSettleMTo(val);
  }

  if (loading || !profile) return <MobileLoading text="جاري تحميل لوحة الإدارة..." />;

  const canSettle = settlementPreview.valid && settlementPreview.count > 0 && settlementPreview.amount > 0;
  const canClearPaid = settleDoctorCard && settleDoctorCard.settled > 0;

  return (
    <MobileShell title="لوحة الإدارة" profile={profile} tabs={tabsForRole("admin")} active={active} onTabChange={setActive} avatarUrl={avatarUrl}>
      {message && <Notice message={message} danger={message.includes("تعذر") || message.includes("يجب")} />}

      {/* نافذة تأكيد */}
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDialog({ open: false, title: "", desc: "", onConfirm: () => {} })}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="text-red-600" size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{dialog.title}</h3>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-line mb-6 text-center">{dialog.desc}</p>
            <div className="flex gap-3">
              <button onClick={() => setDialog({ open: false, title: "", desc: "", onConfirm: () => {} })} className="flex-1 h-12 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">إلغاء</button>
              <button onClick={dialog.onConfirm} className="flex-1 h-12 rounded-xl bg-red-600 text-white font-bold text-sm">تأكيد</button>
            </div>
          </div>
        </div>
      )}

      {/* نظرة عامة */}
      {active === "overview" && <>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <MobileStatCard label="الأطباء" value={(data.doctors || []).length} icon={<Stethoscope size={18} />} />
          <MobileStatCard label="الموظفون" value={(data.staff || []).length} icon={<Users size={18} />} tone="blue" />
          <MobileStatCard label="مستحق فعلي" value={formatMoney(arrivedAmount)} icon={<Wallet size={18} />} tone="purple" />
          <MobileStatCard label="معلق متوقع" value={formatMoney(pendingExpected)} icon={<FileText size={18} />} tone="orange" />
        </div>
        <MobilePanel title="مخطط الدكاترة">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#0f8f7d" name="الإجمالي" />
                <Bar dataKey="arrived" fill="#2563eb" name="وصل" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MobilePanel>
      </>}

      {/* الأطباء */}
      {active === "doctors" && (
        <MobilePanel title="الأطباء" subtitle="إضافة / عرض / نسب الأقسام">
          <MobileSelect value={doctorSub} onChange={e => setDoctorSub(e.target.value)} className="mb-3">
            <option value="list">📋 عرض الأطباء</option>
            <option value="add">➕ إضافة طبيب</option>
            <option value="rates">💰 نسب الأقسام</option>
          </MobileSelect>

          {doctorSub === "add" && (
            <div className="space-y-2">
              {[
                { key: "full_name", placeholder: "الاسم الكامل" },
                { key: "email", placeholder: "البريد الإلكتروني" },
                { key: "password", placeholder: "كلمة المرور", type: "password" },
                { key: "card_no", placeholder: "رقم البطاقة" },
                { key: "specialty", placeholder: "التخصص" },
                { key: "phone", placeholder: "الهاتف" },
                { key: "national_id", placeholder: "رقم الهوية" },
                { key: "kareemy_account", placeholder: "حساب الكريمي" },
              ].map(f => (
                <MobileInput
                  key={f.key}
                  placeholder={f.placeholder}
                  value={doctorForm[f.key] || ""}
                  onChange={e => setDoctorForm({ ...doctorForm, [f.key]: e.target.value })}
                  type={f.type || "text"}
                />
              ))}
              <button disabled={busy} onClick={addDoctor} className="h-12 w-full rounded-2xl bg-[#0f8f7d] text-xs font-black text-white disabled:opacity-50">
                <Plus className="inline" size={16} /> إضافة الطبيب
              </button>
            </div>
          )}

          {doctorSub === "list" && (
            <>
              <MobileSelect value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)} className="mb-3">
                <option value="all">كل الأطباء</option>
                {(data.doctors || []).map((d: any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </MobileSelect>
              {(data.doctors || []).filter((d: any) => selectedDoctor === "all" || d.id === selectedDoctor).map((d: any) => (
                <MobileInfoCard
                  key={d.id}
                  title={d.full_name}
                  subtitle={d.specialty || "طبيب"}
                  avatar={<DoctorAvatar path={getDoctorAvatarPath(d, data.people || [])} />}
                  meta={[
                    { label: "الهاتف", value: d.phone || "-" },
                    { label: "البطاقة", value: d.card_no || "-" },
                    { label: "الكريمي", value: d.kareemy_account || "-" },
                  ]}
                  footer={
                    <button onClick={() => deleteDoctor(d.id, d.full_name)} className="h-10 w-full rounded-2xl bg-red-50 text-xs font-black text-red-600 flex items-center justify-center gap-1">
                      <Trash2 size={15} /> حذف الطبيب
                    </button>
                  }
                />
              ))}
            </>
          )}

          {doctorSub === "rates" && (
            <div className="space-y-2">
              <MobileSelect value={rateDoctor} onChange={e => setRateDoctor(e.target.value)}>
                <option value="">اختر الطبيب</option>
                {(data.doctors || []).map((d: any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </MobileSelect>
              {(data.departments || []).map((dep: any) => (
                <MobileInput
                  key={dep.id}
                  placeholder={`نسبة/مبلغ ${formatDepartment(dep.name)}`}
                  value={rateDraft[dep.id] || String(rateMap.get(`${rateDoctor}:${dep.id}`) || "")}
                  onChange={e => setRateDraft({ ...rateDraft, [dep.id]: e.target.value })}
                />
              ))}
              <button disabled={busy || !rateDoctor} onClick={saveRates} className="h-12 w-full rounded-2xl bg-[#0f8f7d] text-xs font-black text-white disabled:opacity-50">
                حفظ نسب الطبيب
              </button>
            </div>
          )}
        </MobilePanel>
      )}

      {/* الموظفون */}
      {active === "staff" && (
        <MobilePanel title="الموظفون" subtitle="إضافة / عرض">
          <MobileSelect value={staffSub} onChange={e => setStaffSub(e.target.value)} className="mb-3">
            <option value="list">📋 عرض الموظفين</option>
            <option value="add">➕ إضافة موظف</option>
          </MobileSelect>

          {staffSub === "add" && (
            <div className="space-y-2">
              <MobileSelect value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}>
                <option value="reception">👤 استقبال</option>
                <option value="accountant">🧮 محاسبة</option>
              </MobileSelect>
              {[
                { key: "full_name", placeholder: "الاسم الكامل" },
                { key: "email", placeholder: "البريد الإلكتروني" },
                { key: "password", placeholder: "كلمة المرور", type: "password" },
                { key: "phone", placeholder: "الهاتف" },
                { key: "national_id", placeholder: "رقم الهوية" },
              ].map(f => (
                <MobileInput
                  key={f.key}
                  placeholder={f.placeholder}
                  value={staffForm[f.key] || ""}
                  onChange={e => setStaffForm({ ...staffForm, [f.key]: e.target.value })}
                  type={f.type || "text"}
                />
              ))}
              <button disabled={busy} onClick={addStaff} className="h-12 w-full rounded-2xl bg-blue-600 text-xs font-black text-white disabled:opacity-50">
                <Plus className="inline" size={16} /> إضافة الموظف
              </button>
            </div>
          )}

          {staffSub === "list" && (
            <>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setStaffFilterRole("all")} className={`flex-1 h-10 rounded-xl text-xs font-bold ${staffFilterRole === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>الكل</button>
                <button onClick={() => setStaffFilterRole("reception")} className={`flex-1 h-10 rounded-xl text-xs font-bold ${staffFilterRole === "reception" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>استقبال</button>
                <button onClick={() => setStaffFilterRole("accountant")} className={`flex-1 h-10 rounded-xl text-xs font-bold ${staffFilterRole === "accountant" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>محاسبة</button>
              </div>
              {(data.staff || [])
                .filter((s: any) => staffFilterRole === "all" || s.role === staffFilterRole)
                .map((s: any) => (
                  <MobileInfoCard
                    key={s.id}
                    title={s.full_name}
                    subtitle={s.role === "accountant" ? "🧮 محاسب" : "👤 استقبال"}
                    avatar={<DoctorAvatar path={s.avatar_path} />}
                    meta={[
                      { label: "البريد", value: s.username || "-" },
                      { label: "الهاتف", value: s.phone || "-" },
                      { label: "الهوية", value: s.national_id || "-" },
                    ]}
                    footer={
                      <button onClick={() => deleteStaff(s.id, s.full_name)} className="h-10 w-full rounded-2xl bg-red-50 text-xs font-black text-red-600 flex items-center justify-center gap-1">
                        <UserX size={15} /> حذف الموظف
                      </button>
                    }
                  />
                ))}
            </>
          )}
        </MobilePanel>
      )}

      {/* تصفية المستحقات */}
      {active === "settlements" && (
        <MobilePanel title="تصفية المستحقات" subtitle="اختر طبيباً ونطاق التصفية">
          <MobileSelect value={settleDoctorId} onChange={e => setSettleDoctorId(e.target.value)} className="mb-3">
            <option value="">اختر الطبيب</option>
            {(data.doctors || []).map((d: any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </MobileSelect>

          {settleDoctorCard && (
            <div className="space-y-3">
              {/* بطاقة الطبيب */}
              <div className="grid grid-cols-2 gap-2">
                <MobileStatCard label="الحالات" value={settleDoctorCard.total} tone="blue" />
                <MobileStatCard label="وصل" value={settleDoctorCard.arrived} tone="teal" />
                <MobileStatCard label="مستحق" value={formatMoney(settlementPreview.amount)} tone="purple" />
                <MobileStatCard label="مصروف" value={formatMoney(settleDoctorCard.settled)} tone="orange" />
              </div>

              {/* إعدادات التصفية */}
              <div className="grid gap-2">
                <MobileSelect value={settleScope} onChange={e => setSettleScope(e.target.value)}>
                  <option value="all">كل الأشهر</option>
                  <option value="range">حسب فترة</option>
                </MobileSelect>
                <MobileSelect value={settleYear} onChange={e => setSettleYear(e.target.value)}>
                  {[2026, 2025, 2024].map(y => <option key={y} value={String(y)}>{y}</option>)}
                </MobileSelect>
                {settleScope === "range" && (
                  <div className="grid grid-cols-2 gap-2">
                    <MobileSelect value={settleMFrom} onChange={e => handleSettleMFromChange(e.target.value)}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={String(m)}>من {m}</option>)}
                    </MobileSelect>
                    <MobileSelect value={settleMTo} onChange={e => setSettleMTo(e.target.value)}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).filter(m => m >= Number(settleMFrom)).map(m => <option key={m} value={String(m)}>إلى {m}</option>)}
                    </MobileSelect>
                  </div>
                )}
              </div>

              {/* ملخص */}
              <div className="bg-blue-50 rounded-xl p-3 text-xs">
                <p className="font-bold text-blue-800">📊 ملخص التصفية</p>
                <p>الحالات: <strong>{settlementPreview.count}</strong> | المبلغ: <strong>{formatMoney(settlementPreview.amount)}</strong></p>
                <p>النطاق: {settleScope === "all" ? `كل ${settleYear}` : `${settleMFrom}-${settleMTo} / ${settleYear}`}</p>
              </div>

              {/* أزرار */}
              <button disabled={!canSettle || busy} onClick={settleDoctorAction} className="w-full h-12 rounded-2xl bg-emerald-600 text-xs font-black text-white disabled:opacity-40 flex items-center justify-center gap-2">
                <Wallet size={16} /> تصفية المستحقات
              </button>
              <button disabled={!canClearPaid || busy} onClick={clearPaidAction} className="w-full h-12 rounded-2xl bg-slate-600 text-xs font-black text-white disabled:opacity-40 flex items-center justify-center gap-2">
                <Trash2 size={16} /> تصفير المصروف مسبقاً
              </button>
            </div>
          )}

          {!settleDoctorCard && (
            <div className="text-center py-8 text-slate-400">
              <p>اختر طبيباً لعرض مستحقاته</p>
            </div>
          )}
        </MobilePanel>
      )}

      {/* التقارير */}
      {active === "reports" && (
        <MobilePanel title="تقارير الإدارة" subtitle="تقارير شاملة ومخصصة">
          {/* تقرير مالي */}
          <div className="mb-4 p-3 bg-slate-50 rounded-xl">
            <p className="font-bold text-slate-700 text-sm mb-2">📊 التقرير المالي</p>
            <div className="grid gap-2">
              <MobileSelect value={reportYear} onChange={e => setReportYear(e.target.value)}>
                {[2026, 2025, 2024].map(y => <option key={y} value={String(y)}>{y}</option>)}
              </MobileSelect>
              <MobileSelect value={reportDoctor} onChange={e => setReportDoctor(e.target.value)}>
                <option value="all">كل الأطباء</option>
                {(data.doctors || []).map((d: any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </MobileSelect>
              <MobileSelect value={reportDept} onChange={e => setReportDept(e.target.value)}>
                <option value="all">كل الأقسام</option>
                {(data.departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </MobileSelect>
              <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl text-xs">
                <input type="checkbox" checked={reportAllMonths} onChange={e => setReportAllMonths(e.target.checked)} />
                كل الأشهر
              </label>
              {!reportAllMonths && (
                <div className="grid grid-cols-2 gap-2">
                  <MobileSelect value={reportMFrom} onChange={e => setReportMFrom(e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={String(m)}>من {m}</option>)}
                  </MobileSelect>
                  <MobileSelect value={reportMTo} onChange={e => setReportMTo(e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).filter(m => m >= Number(reportMFrom)).map(m => <option key={m} value={String(m)}>إلى {m}</option>)}
                  </MobileSelect>
                </div>
              )}
              <button onClick={exportReport} className="w-full h-12 rounded-2xl bg-[#0f8f7d] text-xs font-black text-white flex items-center justify-center gap-2">
                <Download size={16} /> تنزيل التقرير المالي
              </button>
            </div>
          </div>

          {/* تقرير الموظفين والأطباء */}
          <div className="p-3 bg-blue-50 rounded-xl">
            <p className="font-bold text-blue-800 text-sm mb-2">👥 تقرير الموظفين والأطباء</p>
            <p className="text-xs text-blue-600 mb-3">يشمل: موظفي الاستقبال، المحاسبة، والأطباء مع إحصائياتهم</p>
            <button onClick={exportStaffReport} className="w-full h-12 rounded-2xl bg-blue-600 text-xs font-black text-white flex items-center justify-center gap-2">
              <FileText size={16} /> تنزيل تقرير الموظفين والأطباء
            </button>
          </div>
        </MobilePanel>
      )}

      {/* الإحالات */}
      {active === "referrals" && (
        <MobilePanel title="الإحالات">
          {(data.referrals || []).slice(0, 20).map((r: any) => (
            <MobileInfoCard
              key={r.id}
              title={r.patient_name}
              subtitle={`👨‍⚕️ ${r.doctors?.full_name || "-"} | 🏥 ${r.departments?.name || "-"}`}
              avatar={<MobileAvatar url={r.doctor_avatar} name={r.doctors?.full_name} size="sm" />}
              meta={[
                { label: "الحالة", value: r.status === "arrived" ? "✅ مستقبلة" : "⏳ منتظرة" },
                { label: "موظف الاستقبال", value: staffNameMap[r.arrived_by] || "-" },
                { label: "إرسال", value: safeDate(r.referral_date || r.created_at) },
                { label: "استقبال", value: safeDate(r.arrived_at) || "-" },
              ]}
            />
          ))}
        </MobilePanel>
      )}

     {active === "profile" && (
  <AdminProfile profile={profile} avatarUrl={avatarUrl} onUpdated={boot} />
)}
    </MobileShell>
  );
}

function DoctorAvatar({ path }: any) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { signStorage("profile-images", path).then(setUrl); }, [path]);
  return <MobileAvatar url={url} name="ص" size="sm" />;
}

// مكون بروفايل المدير المخصص - يظهر معلومات المدير كاملة
function AdminProfile({ profile, avatarUrl, onUpdated }: { profile: any; avatarUrl: string | null; onUpdated: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      form.append("userId", profile.id);
      const res = await fetch("/api/profile/upload-avatar", { method: "POST", body: form });
      const json = await res.json();
      if (res.ok) {
        setUploadMsg("تم تحديث الصورة ✅");
        onUpdated();
      } else {
        setUploadMsg(json.error || "فشل التحديث");
      }
    } catch (e: any) {
      setUploadMsg("تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <MobilePanel title="الملف الشخصي" subtitle="بيانات المدير">
      <div className="flex flex-col items-center gap-4 py-4">
        {/* الصورة الرمزية */}
        <div className="relative">
          <label className="cursor-pointer">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center overflow-hidden ring-4 ring-blue-100">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.full_name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-bold">{profile.full_name?.slice(0, 1) || "م"}</span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Plus size={16} className="text-white" />
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        {uploadMsg && <p className={`text-xs font-bold ${uploadMsg.includes("✅") ? "text-emerald-600" : "text-red-500"}`}>{uploadMsg}</p>}
        {uploading && <p className="text-xs text-blue-500">جاري الرفع...</p>}

        {/* اسم المدير */}
        <h3 className="text-xl font-bold text-slate-800">{profile.full_name || "-"}</h3>
        <span className="px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">👑 مدير النظام</span>

        {/* معلومات المدير */}
        <div className="w-full space-y-3 mt-4">
          <InfoRow label="البريد الإلكتروني" value={profile.username || "-"} icon="📧" />
          <InfoRow label="رقم الهاتف" value={profile.phone || "غير مضاف"} icon="📞" />
          <InfoRow label="رقم الهوية" value={profile.national_id || "غير مضاف"} icon="🆔" />
          <InfoRow label="الدور" value="مدير (Admin)" icon="👑" />
        </div>
      </div>
    </MobilePanel>
  );
}

// صف معلومات بسيط
function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-bold text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-700 text-left dir-ltr">{value}</span>
    </div>
  );
}