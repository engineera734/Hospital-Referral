// src/app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../src/lib/supabase/client";
import { EmptyState, FieldLabel } from "../../../src/components/dashboard/helpers";
import StatusPill, { ReferralTone } from "../../../src/components/ui/status-pill";
import ConfirmDialog from "../../../src/components/ui/confirm-dialog";
import ProfileDrawer from "../../../src/components/ui/profile-drawer";
import AttachmentCard from "../../../src/components/ui/attachment-card";
import { formatDate, formatDepartment, formatMoney, monthNumber } from "../../../src/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, Users, Building2, Handshake, DollarSign,
  Search, Bell, Settings, ChevronDown, Star, Upload, Eye, MoreVertical
} from 'lucide-react';

// --- أنواع البيانات ---
type Profile = { id: string; full_name: string; username: string; role: string; phone?: string | null; national_id?: string | null; avatar_path?: string | null };
type Person = { id: string; full_name: string; role: string; avatar_path?: string | null };
type Doctor = { id: string; full_name: string; card_no: string; kareemy_account: string | null; specialty: string | null; phone: string | null; user_id: string | null };
type Department = { id: string; name: string; code?: string | null };
type StaffProfile = { id: string; full_name: string; username: string; role: string; phone?: string | null; national_id?: string | null; avatar_path?: string | null };
type Rate = { doctor_id: string; department_id: string; amount: number };
type Settlement = { doctor_id: string; amount: number; referrals_count: number; settled_at: string; settled_by?: string | null; note?: string | null };
type Referral = { id: string; patient_name: string; patient_age: number; diagnosis: string; priority?: string | null; status: ReferralTone; referral_code: string; created_at: string; referral_date?: string | null; arrived_at?: string | null; arrived_by?: string | null; attachment_name?: string | null; attachment_path?: string | null; doctors: { id: string; full_name: string; kareemy_account: string | null } | null; departments: { id?: string; name: string } | null };

const navItems = [
  { key: "overview", label: "نظرة عامة", icon: TrendingUp },
  { key: "patients", label: "التحويلات", icon: Users },
  { key: "reports", label: "التقارير", icon: Upload },
  { key: "doctors", label: "الأطباء", icon: Handshake },
  { key: "staff", label: "الموظفون", icon: Building2 },
  { key: "settlements", label: "تصفية المستحقات", icon: DollarSign },
];

// --- دوال مساعدة ---
function avatarLabel(name: string) { return (name || "-").trim().slice(0, 1); }
function downloadBlob(blob: Blob, fileName: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
function htmlToPrintWindow(html: string) { const win = window.open("", "_blank"); if (!win) return; win.document.open(); win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }

// --- مكون البطاقة الإحصائية ---
const DashboardCard = ({ title, value, icon: Icon, colorClass }: { title: string; value: string | number; icon: any; colorClass?: string }) => (
  <div className={`dashboard-card ${colorClass || ''}`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="stat-label">{title}</p>
        <p className="stat-number">{value}</p>
      </div>
      {Icon && <Icon className={`${colorClass ? 'text-white' : 'text-blue-500'}`} size={24} />}
    </div>
  </div>
);

export default function AdminPage() {
  // --- الحالة (State) ---
  const [active, setActive] = useState("overview");
  const [doctorMode, setDoctorMode] = useState<"create" | "rates" | "registry">("registry");
  const [staffMode, setStaffMode] = useState<"reception-create" | "accountant-create" | "registry">("registry");
  const [staffRegistryRole, setStaffRegistryRole] = useState<"reception" | "accountant">("reception");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleAvatarMap, setPeopleAvatarMap] = useState<Record<string, string>>({});
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [receptions, setReceptions] = useState<StaffProfile[]>([]);
  const [accountants, setAccountants] = useState<StaffProfile[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [doctorForm, setDoctorForm] = useState({ full_name: "", email: "", password: "", card_no: "", specialty: "", phone: "", kareemy_account: "" });
  const [staffForm, setStaffForm] = useState({ full_name: "", email: "", password: "", phone: "", national_id: "" });
  const [rateDoctorId, setRateDoctorId] = useState("");
  const [rateDraft, setRateDraft] = useState<Record<string, string>>({});
  const [settleDoctorId, setSettleDoctorId] = useState("");
  const [confirm, setConfirm] = useState<{ open: boolean; mode: "delete-doctor" | "delete-staff" | "settle" | "clear-paid"; id?: string; label?: string }>({ open: false, mode: "delete-doctor" });
  const [manualFilter, setManualFilter] = useState({ year: String(new Date().getFullYear()), doctor_id: "all", month_from: "1", month_to: String(new Date().getMonth() + 1), department_id: "all" });
  const [settleFilter, setSettleFilter] = useState({ scope: "all", year: String(new Date().getFullYear()), month_from: "1", month_to: String(new Date().getMonth() + 1) });

  // --- التأثيرات (Effects) ---
  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (!rateDoctorId && doctors[0]?.id) setRateDoctorId(doctors[0].id); }, [doctors, rateDoctorId]);
  useEffect(() => { if (!settleDoctorId && doctors[0]?.id) setSettleDoctorId(doctors[0].id); }, [doctors, settleDoctorId]);
  useEffect(() => {
    if (!rateDoctorId) return;
    const next: Record<string, string> = {};
    departments.forEach((dep) => { const row = rates.find((item) => item.doctor_id === rateDoctorId && item.department_id === dep.id); next[dep.id] = String(row?.amount ?? 0); });
    setRateDraft(next);
  }, [rateDoctorId, departments, rates]);

  // --- دوال API ---
  async function getSignedUrl(bucket: string, path?: string | null) {
    if (!path) return null;
    const res = await fetch("/api/storage/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bucket, path }) });
    const json = await res.json();
    return res.ok ? (json.url as string) : null;
  }

  async function buildAvatarMap(items: Person[]) {
    const entries = await Promise.all(items.map(async (item) => {
      const url = await getSignedUrl("profile-images", item.avatar_path || null);
      return [item.id, url || ""] as const;
    }));
    return Object.fromEntries(entries);
  }

  async function loadAll() {
    try{
    setLoading(true);
    }catch(error:any){
      setMessage(error?.message || "فشل تحميل البيانات");
    }finally{
      setLoading(false);
    }
    setMessage("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { window.location.href = "/login"; setLoading(false); return; }
    try {
      const res = await fetch("/api/admin/dashboard-data", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (!res.ok) { setMessage(json.error || "تعذر تحميل لوحة الإدارة."); setLoading(false); return; }
      const peopleRows = (json.people || []) as Person[];
      setPeople(peopleRows);
      setPeopleAvatarMap(await buildAvatarMap(peopleRows));
      setProfile(json.profile as Profile);
      setAvatarUrl(await getSignedUrl("profile-images", json.profile?.avatar_path || null));
      setDoctors((json.doctors || []) as Doctor[]);
      setDepartments(((json.departments || []) as Department[]).map((dep) => ({ ...dep, name: formatDepartment(dep.name) })));
      const staff = (json.staff || []) as StaffProfile[];
      setReceptions(staff.filter((item) => item.role === "reception"));
      setAccountants(staff.filter((item) => item.role === "accountant"));
      setRates(((json.rates || []) as any[]).map((row) => ({ doctor_id: String(row.doctor_id), department_id: String(row.department_id), amount: Number(row.amount || 0) })));
      setSettlements(((json.settlements || []) as any[]).map((row) => ({ doctor_id: String(row.doctor_id), amount: Number(row.amount || 0), referrals_count: Number(row.referrals_count || 0), settled_at: String(row.settled_at || ""), settled_by: row.settled_by || null, note: row.note || null })));
      setReferrals(((json.referrals || []) as any[]).map((row) => ({
        id: String(row.id), patient_name: String(row.patient_name || ""), patient_age: Number(row.patient_age || 0),
        diagnosis: String(row.diagnosis || ""), priority: row.priority || null,
        status: String(row.status || "pending") as ReferralTone, referral_code: String(row.referral_code || ""),
        created_at: String(row.created_at || ""), referral_date: row.referral_date || row.created_at || null,
        arrived_at: row.arrived_at || null, arrived_by: row.arrived_by || null,
        attachment_name: row.attachment_name || null, attachment_path: row.attachment_path || null,
        doctors: Array.isArray(row.doctors) ? (row.doctors[0] || null) : row.doctors,
        departments: Array.isArray(row.departments) ? (row.departments[0] || null) : row.departments,
      })));
      setLoading(false);
    } catch (error: any) { console.error("خطأ في تحميل البيانات:", error); setMessage("فشل الاتصال بالخادم."); setLoading(false); }
  }

  async function handleLogout() { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = "/login"; }

  async function uploadAvatar(file: File) {
    if (!profile) return;
    const form = new FormData(); form.append("file", file); form.append("userId", profile.id);
    const res = await fetch("/api/profile/upload-avatar", { method: "POST", body: form });
    const json = await res.json();
    setUploadMessage(res.ok ? "تم تحديث الصورة الشخصية." : (json.error || "تعذر رفع الصورة."));
    if (res.ok) await loadAll();
  }

  async function downloadAttachment(path?: string | null, fileName?: string | null) {
    const signed = await getSignedUrl("referral-files", path);
    if (!signed) return;
    const response = await fetch(signed); const blob = await response.blob();
    downloadBlob(blob, fileName || "attachment");
  }

  async function addDoctor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/create-doctor-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doctorForm) });
    const json = await res.json();
    if (!res.ok) { setMessage(json.error || "تعذر إنشاء حساب الطبيب."); return; }
    setDoctorForm({ full_name: "", email: "", password: "", card_no: "", specialty: "", phone: "", kareemy_account: "" });
    setMessage("تم إنشاء حساب الطبيب بنجاح."); await loadAll();
  }

  async function addStaff(role: "reception" | "accountant") {
    const res = await fetch("/api/admin/create-staff-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...staffForm, role }) });
    const json = await res.json();
    if (!res.ok) { setMessage(json.error || "تعذر إنشاء حساب الموظف."); return; }
    setStaffForm({ full_name: "", email: "", password: "", phone: "", national_id: "" });
    setMessage(role === "reception" ? "تم إنشاء موظف استقبال." : "تم إنشاء موظف محاسبة."); await loadAll();
  }

  async function saveRates() {
    if (!rateDoctorId) return;
    const payload = departments.map((dep) => ({ department_id: dep.id, amount: Number(rateDraft[dep.id] || 0) }));
    const res = await fetch("/api/admin/save-doctor-rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctor_id: rateDoctorId, rates: payload }) });
    const json = await res.json();
    if (!res.ok) { setMessage(json.error || "تعذر حفظ نسب الربح."); return; }
    setMessage("تم حفظ نسب ربح الطبيب حسب الأقسام."); await loadAll();
  }

  async function deleteDoctor(id: string) {
    const res = await fetch("/api/admin/delete-doctor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctor_id: id }) });
    const json = await res.json();
    if (!res.ok) { setMessage(json.error || "تعذر حذف الطبيب."); return; }
    setMessage("تم حذف الطبيب."); setConfirm({ open: false, mode: "delete-doctor" }); await loadAll();
  }

  async function deleteStaff(id: string) {
    const res = await fetch("/api/admin/delete-staff-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staff_id: id }) });
    const json = await res.json();
    if (!res.ok) { setMessage(json.error || "تعذر حذف الموظف."); return; }
    setMessage("تم حذف الموظف."); setConfirm({ open: false, mode: "delete-staff" }); await loadAll();
  }

  async function settleDoctor(id: string) {
    if (!profile) return;
    const res = await fetch("/api/admin/settle-doctor", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_id: id, settled_by: profile.id, note: "تمت التصفية من لوحة الإدارة", scope: settleFilter.scope, year: settleFilter.year, month_from: settleFilter.month_from, month_to: settleFilter.month_to })
    });
    const json = await res.json();
    if (!res.ok) { setMessage(json.error || "تعذر تصفية المستحقات."); return; }
    setMessage(`تمت تصفية مستحقات الطبيب بمبلغ ${formatMoney(Number(json.amount || 0))}.`);
    setConfirm({ open: false, mode: "settle" }); await loadAll();
  }

  async function clearPaidHistory(id: string) {
    if (!profile) return;
    const res = await fetch("/api/admin/settle-doctor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctor_id: id, settled_by: profile.id, mode: "clear_paid", note: "مسح المصروف سابقًا" }) });
    const json = await res.json();
    if (!res.ok) { setMessage(json.error || "تعذر تصفير المصروف سابقًا."); return; }
    setMessage("تمت تصفية المصروف سابقًا للطبيب المحدد."); setConfirm({ open: false, mode: "clear-paid" }); await loadAll();
  }

  // --- البيانات المحسوبة ---
  const peopleMap = useMemo(() => new Map(people.map((item) => [item.id, item])), [people]);
  const staffMap = useMemo(() => new Map([...receptions, ...accountants].map((item) => [item.id, item.full_name])), [receptions, accountants]);
  const rateMap = useMemo(() => new Map(rates.map((item) => [`${item.doctor_id}:${item.department_id}`, Number(item.amount || 0)])), [rates]);
  
  const doctorCards = useMemo(() => doctors.map((doctor) => {
    const mine = referrals.filter((row) => row.doctors?.id === doctor.id);
    const pending = mine.filter((row) => row.status === "pending").length;
    const arrivedRows = mine.filter((row) => row.status === "arrived");
    const totalProfit = arrivedRows.reduce((sum, row) => sum + (rateMap.get(`${doctor.id}:${row.departments?.id || ""}`) || 0), 0);
    const settledRows = settlements.filter((row) => row.doctor_id === doctor.id);
    const settled = settledRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const lastSettlement = settledRows[0] || null;
    const departmentRates = departments.map((dep) => ({ department: dep.name, amount: rateMap.get(`${doctor.id}:${dep.id}`) || 0 }));
    return { doctor, pending, arrived: arrivedRows.length, totalProfit, settled, lastSettlement, departmentRates };
  }), [doctors, referrals, settlements, departments, rateMap]);

  const filteredReferrals = useMemo(() => selectedDoctor === "all" ? referrals : referrals.filter((row) => row.doctors?.id === selectedDoctor), [referrals, selectedDoctor]);
  const overviewPending = referrals.filter((row) => row.status === "pending").length;
  const overviewArrived = referrals.filter((row) => row.status === "arrived").length;
  const currentRegistry = staffRegistryRole === "reception" ? receptions : accountants;
  const selectedSettlementCard = doctorCards.find((row) => row.doctor.id === settleDoctorId) || null;

  const settlementPreview = useMemo(() => {
    if (!selectedSettlementCard) return { rows: [] as Referral[], amount: 0, count: 0, validRange: true };
    const monthFrom = Number(settleFilter.month_from);
    const monthTo = Number(settleFilter.month_to);
    const validRange = settleFilter.scope === "all" ? true : monthFrom <= monthTo;
    if (!validRange) return { rows: [] as Referral[], amount: 0, count: 0, validRange: false };
    const year = Number(settleFilter.year);
    const filteredRows = referrals.filter((row) => {
      if (row.doctors?.id !== selectedSettlementCard.doctor.id || row.status !== "arrived") return false;
      const sourceDate = row.arrived_at || row.referral_date || row.created_at;
      const date = new Date(sourceDate || "");
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return false;
      if (settleFilter.scope === "all") return true;
      const month = monthNumber(sourceDate);
      return month >= monthFrom && month <= monthTo;
    });
    const amount = filteredRows.reduce((sum, row) => sum + (rateMap.get(`${row.doctors?.id}:${row.departments?.id || ""}`) || 0), 0);
    return { rows: filteredRows, amount, count: filteredRows.length, validRange: true };
  }, [selectedSettlementCard, referrals, settleFilter, rateMap]);

  const manualFiltered = useMemo(() => {
    const year = Number(manualFilter.year);
    const monthFrom = Number(manualFilter.month_from);
    const monthTo = Number(manualFilter.month_to);
    return referrals.filter((row) => {
      const sourceDate = row.referral_date || row.created_at;
      const date = new Date(sourceDate || "");
      if (Number.isNaN(date.getTime())) return false;
      const yearOk = date.getFullYear() === year;
      const month = monthNumber(sourceDate);
      const monthOk = month >= monthFrom && month <= monthTo;
      const doctorOk = manualFilter.doctor_id === "all" || row.doctors?.id === manualFilter.doctor_id;
      const depOk = manualFilter.department_id === "all" || row.departments?.id === manualFilter.department_id;
      return yearOk && monthOk && doctorOk && depOk;
    });
  }, [referrals, manualFilter]);

  // --- دوال التقارير ---
  function buildReportHtml(type: "general" | "manual") {
    const rows = type === "general" ? referrals : manualFiltered;
    const sourceCards = doctorCards.filter((row) => type === "general" || manualFilter.doctor_id === "all" || row.doctor.id === manualFilter.doctor_id);
    const filterText = type === "general" ? `السنة: ${manualFilter.year}` : `السنة: ${manualFilter.year} | من شهر: ${manualFilter.month_from} | إلى شهر: ${manualFilter.month_to}`;

    const doctorSections = sourceCards.map((card) => {
      const doctorRows = rows.filter((row) => row.doctors?.id === card.doctor.id);
      const settlementActor = card.lastSettlement?.settled_by ? (peopleMap.get(card.lastSettlement.settled_by)?.full_name || staffMap.get(card.lastSettlement.settled_by) || "-") : "-";
      return `
        <section class="section">
          <h2>تقرير عن الطبيب: ${card.doctor.full_name}</h2>
          <table><thead><tr><th>المريض</th><th>القسم</th><th>الحالة</th><th>تاريخ الإرسال</th><th>تاريخ الاستقبال</th><th>أكد الوصول</th><th>ربح الحالة</th></tr></thead>
          <tbody>
            ${doctorRows.map((row) => `
              <tr><td>${row.patient_name}</td><td>${formatDepartment(row.departments?.name)}</td><td>${row.status === "pending" ? "منتظرة" : "مستقبلة"}</td><td>${formatDate(row.referral_date || row.created_at)}</td><td>${formatDate(row.arrived_at)}</td><td>${staffMap.get(row.arrived_by || "") || "-"}</td><td>${formatMoney(rateMap.get(`${row.doctors?.id}:${row.departments?.id}`) || 0)}</td></tr>
            `).join("") || '<tr><td colspan="7">لا توجد بيانات</td></tr>'}
            <tr><td colspan="6"><strong>عدد الحالات المنتظرة</strong></td><td><strong>${card.pending}</strong></td></tr>
            <tr><td colspan="6"><strong>عدد الحالات المستقبلة</strong></td><td><strong>${card.arrived}</strong></td></tr>
            <tr><td colspan="6"><strong>الربح المتراكم</strong></td><td><strong>${formatMoney(type === "general" ? card.totalProfit : doctorRows.filter((row) => row.status === "arrived").reduce((sum, row) => sum + (rateMap.get(`${row.doctors?.id}:${row.departments?.id}`) || 0), 0))}</strong></td></tr>
            <tr><td colspan="6"><strong>المصروف سابقًا</strong></td><td><strong>${formatMoney(card.settled)}</strong></td></tr>
            <tr><td colspan="6"><strong>آخر من قام بالتصفية</strong></td><td><strong>${settlementActor}</strong></td></tr>
          </tbody></table>
        </section>
      `;
    }).join("");

    return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" /><title>تقرير مستشفى الرفاعي</title>
    <style>body{font-family:Arial;padding:24px;color:#0f172a;direction:rtl}h1,h2{margin:0 0 12px}.section{margin:24px 0}.meta,.note{padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;margin:12px 0}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{border:1px solid #cbd5e1;padding:8px;text-align:right;font-size:12px;vertical-align:top}th{background:#eff6ff}</style></head>
    <body><h1>${type === "general" ? "التقرير العام" : "التقرير المحدد"}</h1><div class="meta">${filterText}</div><div class="note">عدد الأطباء: ${doctors.length} | عدد موظفي الاستقبال: ${receptions.length} | عدد موظفي المحاسبة: ${accountants.length} | الحالات المنتظرة: ${rows.filter((row) => row.status === "pending").length} | الحالات المستقبلة: ${rows.filter((row) => row.status === "arrived").length}</div>${doctorSections}</body></html>`;
  }

  function downloadHtmlReport(type: "general" | "manual") { const html = buildReportHtml(type); downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), type === "general" ? "التقرير-العام.html" : "التقرير-المحدد.html"); }
  function downloadPdfReport(type: "general" | "manual") { const html = buildReportHtml(type); htmlToPrintWindow(html); }

  // --- عرض التحميل ---
  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // --- بيانات الرسم البياني ---
  const chartData = doctors.map(doc => {
    const docReferrals = referrals.filter(r => r.doctors?.id === doc.id);
    return { name: doc.full_name, تحويلات: docReferrals.length };
  });

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* القائمة الجانبية */}
      <aside className="fixed right-0 top-0 h-full w-64 bg-sidebar border-l border-border" style={{ left: 'auto', right: 0 }}>
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent text-center">المشفى</h1>
          <p className="text-xs text-gray-500 mt-1 text-center">لوحة تحكم المدير</p>
        </div>
        <nav className="mt-6">
          {navItems.map((item) => (
            <a key={item.key} href="#" onClick={(e) => { e.preventDefault(); setActive(item.key); }}
              className={`flex items-center gap-3 px-6 py-3 transition-colors ${active === item.key ? 'bg-gray-800 text-white border-r-2 border-primary' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-6 border-t border-border">
          <button onClick={handleLogout} className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors text-center">تسجيل الخروج</button>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="mr-64 p-6" style={{ marginRight: '16rem' }}>
        {/* الهيدر */}
        <header className="flex justify-between items-center mb-8">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <input type="text" placeholder="بحث..." className="bg-card-bg border border-border rounded-lg pr-10 pl-4 py-2 text-gray-300 w-80 focus:outline-none focus:border-primary text-right" />
          </div>
          <div className="flex items-center gap-4">
            <Bell className="text-gray-400 cursor-pointer hover:text-white" size={20} />
            <Settings className="text-gray-400 cursor-pointer hover:text-white" size={20} />
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setProfileOpen(true)}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt={profile.full_name} className="h-full w-full object-cover" /> : <span className="text-white text-sm font-bold">{profile.full_name.slice(0, 1)}</span>}
              </div>
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>
        </header>

        {/* رسالة النظام */}
        {message && (
          <div className="mb-6 rounded-lg border-r-4 border-blue-500 bg-blue-500/10 px-4 py-3 text-right text-sm text-blue-300">
            <span className="font-semibold">📌</span> {message}
          </div>
        )}

        {/* ================= نظرة عامة ================= */}
        {active === "overview" && (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Star size={20} className="text-yellow-500" /> ملخص المستشفى</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <DashboardCard title="إجمالي الأطباء" value={doctors.length} icon={Users} />
                <DashboardCard title="موظفو الاستقبال" value={receptions.length} icon={Building2} />
                <DashboardCard title="موظفو المحاسبة" value={accountants.length} icon={DollarSign} />
                <DashboardCard title="الحالات المنتظرة" value={overviewPending} icon={TrendingUp} />
                <DashboardCard title="الحالات المستقبلة" value={overviewArrived} icon={TrendingUp} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="dashboard-card">
                <h3 className="text-white font-semibold mb-4">تحويلات الأطباء</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', direction: 'rtl' }} labelStyle={{ color: 'white' }} />
                    <Legend />
                    <Bar dataKey="تحويلات" fill="#3b82f6" name="عدد التحويلات" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="dashboard-card">
                <h3 className="text-white font-semibold mb-4">آخر التحديثات</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-800/50 rounded-lg"><p className="text-green-400 text-sm font-medium">تم تحديث بيانات الأطباء</p><p className="text-gray-500 text-xs mt-1">اليوم الساعة 10:30 صباحاً</p></div>
                  <div className="p-3 bg-gray-800/50 rounded-lg"><p className="text-blue-400 text-sm font-medium">وصول تحويلة جديدة</p><p className="text-gray-500 text-xs mt-1">أمس الساعة 2:15 مساءً</p></div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ================= التحويلات ================= */}
        {active === "patients" && (
          <div className="dashboard-card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold text-lg">التحويلات</h3>
              <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className="bg-gray-800 border border-border rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary">
                <option value="all">كل الأطباء</option>
                {doctors.map((doctor) => (<option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>))}
              </select>
            </div>
            <div className="space-y-3">
              {filteredReferrals.length === 0 ? (
                <EmptyState title="لا توجد تحويلات" description="غيّر اختيار الطبيب أو أضف تحويلات جديدة." />
              ) : (
                filteredReferrals.map((row) => (
                  <div key={row.id} className="p-4 bg-gray-800/50 rounded-lg border border-border hover:border-gray-600 transition-colors">
                    <div className="flex flex-col gap-3 md:flex-row md:justify-between">
                      <div className="space-y-2 text-right">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{row.patient_name}</h3>
                          <StatusPill tone={row.status} />
                        </div>
                        <p className="text-sm text-gray-400"><span className="font-medium text-gray-300">القسم:</span> {formatDepartment(row.departments?.name)}</p>
                        <p className="text-sm text-gray-400"><span className="font-medium text-gray-300">العمر:</span> {row.patient_age}</p>
                        <div className="grid gap-1 text-sm text-gray-400 sm:grid-cols-2">
                          <p><span className="font-medium text-gray-300">تاريخ الإرسال:</span> {formatDate(row.referral_date || row.created_at)}</p>
                          <p><span className="font-medium text-gray-300">تاريخ الاستقبال:</span> {formatDate(row.arrived_at)}</p>
                          <p><span className="font-medium text-gray-300">أكد الوصول:</span> {staffMap.get(row.arrived_by || "") || "-"}</p>
                        </div>
                        <p className="text-sm text-gray-300"><span className="font-medium text-gray-300">التشخيص:</span> {row.diagnosis}</p>
                        {row.attachment_name && (
                          <AttachmentCard fileName={row.attachment_name} onOpen={() => downloadAttachment(row.attachment_path, row.attachment_name)} compact />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= التقارير ================= */}
        {active === "reports" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="dashboard-card">
              <h3 className="text-white font-semibold text-lg mb-4">التقرير العام</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => downloadHtmlReport("general")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700">📄 تنزيل HTML</button>
                <button onClick={() => downloadPdfReport("general")} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-600">🖨️ طباعة / PDF</button>
              </div>
            </div>

            <div className="dashboard-card">
              <h3 className="text-white font-semibold text-lg mb-4">التقرير المحدد</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">السنة</label>
                  <select value={manualFilter.year} onChange={(e) => setManualFilter({ ...manualFilter, year: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-sm text-gray-300">
                    <option value="2026">2026</option><option value="2027">2027</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">الطبيب</label>
                  <select value={manualFilter.doctor_id} onChange={(e) => setManualFilter({ ...manualFilter, doctor_id: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-sm text-gray-300">
                    <option value="all">كل الأطباء</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">من شهر</label>
                  <select value={manualFilter.month_from} onChange={(e) => setManualFilter({ ...manualFilter, month_from: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-sm text-gray-300">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={String(m)}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">إلى شهر</label>
                  <select value={manualFilter.month_to} onChange={(e) => setManualFilter({ ...manualFilter, month_to: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-sm text-gray-300">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={String(m)}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">القسم</label>
                  <select value={manualFilter.department_id} onChange={(e) => setManualFilter({ ...manualFilter, department_id: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-sm text-gray-300">
                    <option value="all">كل الأقسام</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                  <button disabled={Number(manualFilter.month_from) > Number(manualFilter.month_to)} onClick={() => downloadHtmlReport("manual")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">تنزيل HTML</button>
                  <button disabled={Number(manualFilter.month_from) > Number(manualFilter.month_to)} onClick={() => downloadPdfReport("manual")} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">طباعة / PDF</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= الأطباء ================= */}
        {active === "doctors" && (
          <div className="dashboard-card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold text-lg">الأطباء</h3>
              <select value={doctorMode} onChange={(e) => setDoctorMode(e.target.value as any)} className="bg-gray-800 border border-border rounded-lg px-4 py-2 text-sm text-gray-300">
                <option value="create">➕ إضافة دكتور</option>
                <option value="rates">💰 نسب الربح</option>
                <option value="registry">📋 عرض الأطباء</option>
              </select>
            </div>

            {/* إضافة طبيب */}
            {doctorMode === "create" && (
              <form onSubmit={addDoctor} className="grid gap-4 md:grid-cols-2">
                <div><label className="block text-sm text-gray-400 mb-1">اسم الطبيب</label><input value={doctorForm.full_name} onChange={(e) => setDoctorForm({ ...doctorForm, full_name: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" required /></div>
                <div><label className="block text-sm text-gray-400 mb-1">البريد الإلكتروني</label><input type="email" value={doctorForm.email} onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" required /></div>
                <div><label className="block text-sm text-gray-400 mb-1">كلمة المرور</label><input type="password" value={doctorForm.password} onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" required /></div>
                <div><label className="block text-sm text-gray-400 mb-1">رقم البطاقة</label><input value={doctorForm.card_no} onChange={(e) => setDoctorForm({ ...doctorForm, card_no: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">التخصص</label><input value={doctorForm.specialty} onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">الهاتف</label><input value={doctorForm.phone} onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" /></div>
                <div className="md:col-span-2"><label className="block text-sm text-gray-400 mb-1">حساب الكريمي</label><input value={doctorForm.kareemy_account} onChange={(e) => setDoctorForm({ ...doctorForm, kareemy_account: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" /></div>
                <div className="md:col-span-2"><button className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white shadow transition hover:bg-blue-700">إنشاء حساب الطبيب</button></div>
              </form>
            )}

            {/* نسب الربح */}
            {doctorMode === "rates" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">اختر الطبيب</label>
                  <select value={rateDoctorId} onChange={(e) => setRateDoctorId(e.target.value)} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300">
                    {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>)}
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {departments.map((dep) => (
                    <div key={dep.id} className="rounded-lg bg-gray-800/50 p-3 border border-border">
                      <p className="font-semibold text-gray-300">{dep.name}</p>
                      <input value={rateDraft[dep.id] || "0"} onChange={(e) => setRateDraft({ ...rateDraft, [dep.id]: e.target.value })} className="mt-2 w-full rounded-lg bg-gray-800 border border-border px-3 py-1.5 text-left font-mono text-sm text-gray-300" dir="ltr" />
                    </div>
                  ))}
                </div>
                <button onClick={saveRates} className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white shadow transition hover:bg-emerald-700">💾 حفظ نسب الربح</button>
              </div>
            )}

            {/* عرض الأطباء */}
            {doctorMode === "registry" && (
              <div className="space-y-3">
                {doctorCards.length === 0 ? <EmptyState title="لا يوجد أطباء" description="أضف طبيبًا جديدًا للبدء." /> : doctorCards.map((card) => {
                  const avatar = card.doctor.user_id ? peopleAvatarMap[card.doctor.user_id] : "";
                  const settlementActor = card.lastSettlement?.settled_by ? (peopleMap.get(card.lastSettlement.settled_by)?.full_name || staffMap.get(card.lastSettlement.settled_by) || "-") : "-";
                  return (
                    <div key={card.doctor.id} className="overflow-hidden rounded-lg border border-border bg-gray-800/50">
                      <div className="p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                          <div className="flex gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-base font-bold text-white shadow-inner">
                              {avatar ? <img src={avatar} alt={card.doctor.full_name} className="h-full w-full object-cover" /> : avatarLabel(card.doctor.full_name)}
                            </div>
                            <div className="space-y-0.5 text-right">
                              <h3 className="text-lg font-bold text-white">{card.doctor.full_name}</h3>
                              <div className="grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs text-gray-400 sm:grid-cols-2">
                                <p><span className="font-medium text-gray-300">رقم البطاقة:</span> {card.doctor.card_no}</p>
                                <p><span className="font-medium text-gray-300">التخصص:</span> {card.doctor.specialty || '-'}</p>
                                <p><span className="font-medium text-gray-300">الهاتف:</span> {card.doctor.phone || '-'}</p>
                                <p className="truncate"><span className="font-medium text-gray-300">حساب الكريمي:</span> {card.doctor.kareemy_account || '-'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-medium text-amber-400">⏳ {card.pending}</span>
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-medium text-emerald-400">✅ {card.arrived}</span>
                              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 font-medium text-blue-400">💰 {formatMoney(card.totalProfit)}</span>
                            </div>
                            <button onClick={() => setConfirm({ open: true, mode: "delete-doctor", id: card.doctor.id, label: card.doctor.full_name })} className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/30">حذف</button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3 text-xs">
                          {card.departmentRates.map((dep) => (
                            <div key={dep.department} className="rounded-full bg-gray-700 px-2 py-0.5">
                              <span className="text-gray-400">{dep.department}</span>
                              <span className="mr-1 font-mono font-bold text-gray-300">{formatMoney(dep.amount)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-right text-[11px] text-gray-500">آخر تصفية: {settlementActor} | المدفوع: {formatMoney(card.settled)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= الموظفون ================= */}
        {active === "staff" && (
          <div className="dashboard-card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold text-lg">الموظفون</h3>
              <select value={staffMode} onChange={(e) => setStaffMode(e.target.value as any)} className="bg-gray-800 border border-border rounded-lg px-4 py-2 text-sm text-gray-300">
                <option value="reception-create">👤 إضافة استقبال</option>
                <option value="accountant-create">🧮 إضافة محاسبة</option>
                <option value="registry">📋 عرض الموظفين</option>
              </select>
            </div>

            {staffMode !== "registry" && (
              <div className="space-y-4">
                <div className="rounded-lg border-r-4 border-blue-400 bg-blue-500/10 px-3 py-2 text-right text-sm text-blue-300">
                  💡 {staffMode === "reception-create" ? "إضافة موظف استقبال جديد" : "إضافة موظف محاسبة جديد"}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><label className="block text-sm text-gray-400 mb-1">الاسم الكامل</label><input value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" required /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">البريد الإلكتروني</label><input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" required /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">كلمة المرور</label><input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" required /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">الهاتف</label><input value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" /></div>
                  <div className="md:col-span-2"><label className="block text-sm text-gray-400 mb-1">رقم الهوية</label><input value={staffForm.national_id} onChange={(e) => setStaffForm({ ...staffForm, national_id: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-3 py-2 text-gray-300" /></div>
                  <div className="md:col-span-2"><button type="button" onClick={() => addStaff(staffMode === "reception-create" ? "reception" : "accountant")} className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white shadow transition hover:bg-blue-700">إنشاء حساب</button></div>
                </div>
              </div>
            )}

            {staffMode === "registry" && (
              <div className="space-y-3">
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setStaffRegistryRole("reception")} className={`px-4 py-1.5 rounded-lg text-sm transition ${staffRegistryRole === "reception" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}>الاستقبال</button>
                  <button onClick={() => setStaffRegistryRole("accountant")} className={`px-4 py-1.5 rounded-lg text-sm transition ${staffRegistryRole === "accountant" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}>المحاسبة</button>
                </div>
                <div className="space-y-2">
                  {currentRegistry.length === 0 ? <EmptyState title="لا يوجد موظفون" description="أضف موظفًا جديدًا للمتابعة." /> : currentRegistry.map((person) => {
                    const avatar = peopleAvatarMap[person.id] || "";
                    return (
                      <div key={person.id} className="flex flex-col items-start justify-between gap-3 rounded-lg border border-border bg-gray-800/50 p-3 sm:flex-row sm:items-center">
                        <div className="flex gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-slate-600 to-slate-700 text-sm font-bold text-white">
                            {avatar ? <img src={avatar} alt={person.full_name} className="h-full w-full object-cover" /> : avatarLabel(person.full_name)}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-white">{person.full_name}</p>
                            <p className="text-xs text-gray-400">{person.username}</p>
                            <p className="text-xs text-gray-500">📞 {person.phone || '-'} | 🆔 {person.national_id || '-'}</p>
                          </div>
                        </div>
                        <button onClick={() => setConfirm({ open: true, mode: "delete-staff", id: person.id, label: person.full_name })} className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/30">حذف</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= تصفية المستحقات ================= */}
        {active === "settlements" && (
          <div className="dashboard-card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold text-lg">تصفية المستحقات</h3>
              <select value={settleDoctorId} onChange={(e) => setSettleDoctorId(e.target.value)} className="bg-gray-800 border border-border rounded-lg px-4 py-2 text-sm text-gray-300">
                {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>)}
              </select>
            </div>

            {!selectedSettlementCard ? (
              <EmptyState title="لا توجد بيانات" description="اختر طبيبًا لعرض مستحقاته الحالية." />
            ) : (
              <div className="space-y-5 text-right">
                <div className="rounded-lg border-r-4 border-amber-400 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                  ⚠️ يُنصح بإنشاء تقرير شامل قبل وبعد التصفية للمقارنة المالية.
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-gray-800/50 p-3 text-center border border-border">
                    <p className="text-xs font-medium uppercase text-gray-500">الطبيب</p>
                    <p className="mt-0.5 font-bold text-white">{selectedSettlementCard.doctor.full_name}</p>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-3 text-center border border-border">
                    <p className="text-xs font-medium uppercase text-gray-500">حالات قابلة للتصفية</p>
                    <p className="mt-0.5 text-xl font-bold text-emerald-400">{settlementPreview.count}</p>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-3 text-center border border-border">
                    <p className="text-xs font-medium uppercase text-gray-500">الرصيد الحالي</p>
                    <p className="mt-0.5 text-xl font-bold text-blue-400">{formatMoney(selectedSettlementCard.totalProfit)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-3 text-center border border-border">
                    <p className="text-xs font-medium uppercase text-gray-500">المصروف مسبقًا</p>
                    <p className="mt-0.5 text-xl font-bold text-gray-400">{formatMoney(selectedSettlementCard.settled)}</p>
                  </div>
                </div>

                <div className="grid gap-3 rounded-lg bg-gray-800/50 p-4 border border-border md:grid-cols-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">نوع التصفية</label>
                    <select value={settleFilter.scope} onChange={(e) => setSettleFilter({ ...settleFilter, scope: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-2 py-1.5 text-sm text-gray-300">
                      <option value="all">كل الأشهر</option>
                      <option value="range">حسب فترة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">السنة</label>
                    <select value={settleFilter.year} onChange={(e) => setSettleFilter({ ...settleFilter, year: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-2 py-1.5 text-sm text-gray-300">
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">من شهر</label>
                    <select value={settleFilter.month_from} onChange={(e) => setSettleFilter({ ...settleFilter, month_from: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-2 py-1.5 text-sm text-gray-300" disabled={settleFilter.scope === "all"}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={String(m)}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">إلى شهر</label>
                    <select value={settleFilter.month_to} onChange={(e) => setSettleFilter({ ...settleFilter, month_to: e.target.value })} className="w-full rounded-lg bg-gray-800 border border-border px-2 py-1.5 text-sm text-gray-300" disabled={settleFilter.scope === "all"}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={String(m)}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-right">
                  <p className="text-sm font-bold text-blue-300">ملخص التصفية الحالية</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg bg-gray-800/70 px-3 py-2 text-sm text-gray-300">
                      <span className="font-semibold text-white">عدد الحالات المستقبلة:</span> {settlementPreview.count}
                    </div>
                    <div className="rounded-lg bg-gray-800/70 px-3 py-2 text-sm text-gray-300">
                      <span className="font-semibold text-white">المبلغ الذي سيتم تصفيته:</span> {formatMoney(settlementPreview.amount)}
                    </div>
                    <div className="rounded-lg bg-gray-800/70 px-3 py-2 text-sm text-gray-300">
                      <span className="font-semibold text-white">نطاق التصفية:</span>{" "}
                      {settleFilter.scope === "all" ? `كل الأشهر في سنة ${settleFilter.year}` : `من شهر ${settleFilter.month_from} إلى ${settleFilter.month_to} / ${settleFilter.year}`}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button disabled={!settlementPreview.validRange || settlementPreview.count === 0 || settlementPreview.amount <= 0} onClick={() => setConfirm({ open: true, mode: "settle", id: selectedSettlementCard.doctor.id, label: selectedSettlementCard.doctor.full_name })} className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50">💰 تصفية المستحقات</button>
                  <button disabled={selectedSettlementCard.settled <= 0} onClick={() => setConfirm({ open: true, mode: "clear-paid", id: selectedSettlementCard.doctor.id, label: selectedSettlementCard.doctor.full_name })} className="rounded-lg bg-slate-600 px-5 py-2 font-semibold text-white shadow transition hover:bg-slate-700 disabled:opacity-50">🧹 تصفير المصروف مسبقًا</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <ProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={profile.full_name}
        email={profile.username}
        roleLabel="مدير"
        phone={profile.phone}
        nationalId={profile.national_id}
        avatarUrl={avatarUrl}
        onUploadAvatar={uploadAvatar}
        uploadMessage={uploadMessage}
      />

      <ConfirmDialog
        open={confirm.open}
        title={confirm.mode === "delete-doctor" ? "حذف الطبيب" : confirm.mode === "delete-staff" ? "حذف الموظف" : confirm.mode === "clear-paid" ? "تصفية المصروف مسبقًا" : "تصفية مستحقات الطبيب"}
        description={confirm.mode === "delete-doctor" ? `سيتم حذف الطبيب ${confirm.label || ""} وكل بيانات الدخول المرتبطة به نهائيًا.` : confirm.mode === "delete-staff" ? `سيتم حذف الموظف ${confirm.label || ""} من النظام.` : confirm.mode === "clear-paid" ? `سيتم تصفير المصروف مسبقًا للطبيب ${confirm.label || ""}.` : `سيتم تصفية مستحقات الطبيب ${confirm.label || ""} وحذف الحالات المستقبلة الخاصة به من قاعدة البيانات.`}
        confirmText={confirm.mode === "settle" || confirm.mode === "clear-paid" ? "تأكيد التصفية" : "تأكيد الحذف"}
        cancelText="إلغاء"
        danger={confirm.mode !== "settle" && confirm.mode !== "clear-paid"}
        onCancel={() => setConfirm({ open: false, mode: confirm.mode })}
        onConfirm={() => {
          if (!confirm.id) return;
          if (confirm.mode === "delete-doctor") deleteDoctor(confirm.id);
          if (confirm.mode === "delete-staff") deleteStaff(confirm.id);
          if (confirm.mode === "settle") settleDoctor(confirm.id);
          if (confirm.mode === "clear-paid") clearPaidHistory(confirm.id);
        }}
      />
    </div>
  );
}