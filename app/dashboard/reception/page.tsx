// src/app/dashboard/reception/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../src/lib/supabase/client";
import StatusPill, { ReferralTone } from "../../../src/components/ui/status-pill";
import ProfileDrawer from "../../../src/components/ui/profile-drawer";
import { formatDate, formatDepartment } from "../../../src/lib/format";
import {
  Bell, Settings, ChevronDown, Activity, ClipboardList,
  Clock, CheckCircle2, AlertCircle, RefreshCw, Search,
  TrendingUp, Users, Zap, Phone, MapPin, Calendar
} from 'lucide-react';

// --- أنواع البيانات (نفسها بدون تغيير) ---
type Profile = { id: string; full_name: string; username: string; role: string; phone?: string | null; national_id?: string | null; avatar_path?: string | null };
type DoctorOption = { id: string; full_name: string };
type Referral = { id: string; patient_name: string; patient_age: number; diagnosis: string; priority?: string | null; status: ReferralTone; referral_date?: string | null; attachment_name?: string | null; attachment_path?: string | null; doctors: { id: string; full_name: string } | null; departments: { name: string } | null };

const navItems = [
  { key: 'overview', label: 'لوحة الاستقبال', icon: Activity },
  { key: 'queue', label: 'قائمة الاستقبال', icon: ClipboardList },
];

export default function ReceptionPage() {
  // --- جميع الحالات (نفسها بدون تغيير) ---
  const [active, setActive] = useState('overview');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { loadAll(); }, []);

  // --- جميع الدوال (نفسها بدون تغيير) ---
  async function getSignedUrl(bucket: string, path?: string | null) {
    if (!path) return null;
    const res = await fetch('/api/storage/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bucket, path }) });
    const json = await res.json();
    return res.ok ? json.url as string : null;
  }

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: profileData } = await supabase.from('profiles').select('id, full_name, username, role, phone, national_id, avatar_path').eq('id', user.id).maybeSingle();
    if (!profileData || String(profileData.role).trim().toLowerCase() !== 'reception') { window.location.href = '/dashboard'; return; }
    const { data: doctorData } = await supabase.from('doctors').select('id, full_name').order('full_name');
    const { data: referralData } = await supabase.from('referrals').select('id, patient_name, patient_age, diagnosis, priority, status, referral_date, attachment_name, attachment_path, doctors(id, full_name), departments(name)').order('referral_date', { ascending: false });
    setProfile(profileData as Profile);
    setAvatarUrl(await getSignedUrl('profile-images', (profileData as any)?.avatar_path || null));
    setDoctors(((doctorData ?? []) as any[]).map((d) => ({ id: String(d.id), full_name: String(d.full_name || '') })));
    setReferrals(((referralData ?? []) as any[]).map((row) => ({
      id: String(row.id), patient_name: String(row.patient_name || ''), patient_age: Number(row.patient_age || 0),
      diagnosis: String(row.diagnosis || ''), priority: row.priority || null,
      status: String(row.status || 'pending') as ReferralTone, referral_date: row.referral_date || null,
      attachment_name: row.attachment_name || null, attachment_path: row.attachment_path || null,
      doctors: Array.isArray(row.doctors) ? (row.doctors[0] || null) : row.doctors,
      departments: Array.isArray(row.departments) ? (row.departments[0] || null) : row.departments
    })));
    setLoading(false);
  }

  async function handleRefresh() { setIsRefreshing(true); await loadAll(); setTimeout(() => setIsRefreshing(false), 1000); }
  async function handleLogout() { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = '/login'; }

  async function uploadAvatar(file: File) {
    if (!profile) return;
    const form = new FormData(); form.append('file', file); form.append('userId', profile.id);
    const res = await fetch('/api/profile/upload-avatar', { method: 'POST', body: form });
    const json = await res.json();
    setUploadMessage(res.ok ? 'تم تحديث الصورة الشخصية.' : (json.error || 'تعذر رفع الصورة.'));
    if (res.ok) await loadAll();
  }

  async function openAttachment(path?: string | null, fileName?: string | null) {
    const signed = await getSignedUrl('referral-files', path);
    if (!signed) return;
    const response = await fetch(signed); const blob = await response.blob();
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = fileName || 'attachment'; a.click(); URL.revokeObjectURL(url);
  }

  async function confirmArrival(id: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc('confirm_referral_arrival', { p_referral_id: id });
    if (error) { setMessage(error.message || 'تعذر تأكيد الوصول.'); return; }
    setMessage('تم تأكيد وصول المريض.');
    await loadAll();
  }

  // --- البيانات المحسوبة ---
  const filtered = useMemo(() => selectedDoctor === 'all' ? referrals : referrals.filter((item) => item.doctors?.id === selectedDoctor), [referrals, selectedDoctor]);
  const pending = filtered.filter((item) => item.status === 'pending').length;
  const arrived = filtered.filter((item) => item.status === 'arrived').length;

  // --- شاشة التحميل ---
  if (loading || !profile) return (
    <div className="flex min-h-screen items-center justify-center bg-dark-bg">
      <div className="text-center">
        <div className="relative mx-auto mb-6 h-20 w-20">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping"></div>
          <div className="absolute inset-2 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="text-blue-400" size={32} />
          </div>
        </div>
        <p className="text-gray-400 text-lg">جارٍ تحميل لوحة الاستقبال...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* ========== شريط جانبي ========== */}
      <aside className="fixed right-0 top-0 h-screen w-72 bg-sidebar border-l border-border z-40 overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Bell className="text-white" size={28} />
              </div>
              {pending > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold animate-pulse ring-2 ring-sidebar">
                  {pending}
                </span>
              )}
            </div>
          </div>
          <h1 className="text-xl font-bold text-center bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            الاستقبال
          </h1>
          <p className="text-xs text-gray-500 mt-1 text-center">لوحة متابعة التحويلات</p>
        </div>

        <nav className="mt-6 px-3">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 ${
                active === item.key
                  ? 'bg-gray-800 text-white border-r-2 border-blue-500'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <item.icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
              {item.key === 'queue' && pending > 0 && (
                <span className="mr-auto bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full font-bold">
                  {pending}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-sidebar">
          <button onClick={handleLogout} className="w-full py-2.5 text-sm text-gray-500 hover:text-red-400 transition-colors text-center rounded-xl hover:bg-red-500/5">
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ========== المحتوى الرئيسي ========== */}
      <div className="flex-1 mr-72">
        <main className="p-6">
          {/* الهيدر */}
          <header className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <button onClick={handleRefresh} className="p-3 rounded-2xl bg-card-bg text-gray-400 hover:text-white hover:bg-gray-800 transition-all border border-border">
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex items-center gap-5">
              <button className="relative text-gray-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-800">
                <Bell size={20} />
                {pending > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}
              </button>
              <button className="text-gray-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-800">
                <Settings size={20} />
              </button>
              <div className="h-8 w-px bg-border"></div>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 p-2 rounded-2xl transition-all" onClick={() => setProfileOpen(true)}>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center overflow-hidden ring-2 ring-blue-500/30">
                  {avatarUrl ? <img src={avatarUrl} alt={profile.full_name} className="h-full w-full object-cover" /> : <span className="text-white font-bold">{profile.full_name.slice(0, 1)}</span>}
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm text-white font-semibold">{profile.full_name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>موظف استقبال
                  </p>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </div>
            </div>
          </header>

          {/* رسائل النظام */}
          {message && (
            <div className="mb-6 rounded-xl border-r-4 border-emerald-500 bg-emerald-500/10 px-5 py-4 text-right text-sm text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} />
                {message}
              </div>
            </div>
          )}

          {/* ================= لوحة الاستقبال (نظرة عامة) ================= */}
          {active === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <div className="dashboard-card bg-gradient-to-br from-blue-600 to-blue-800 border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="stat-label text-blue-200">كل التحويلات</p>
                      <p className="stat-number">{filtered.length}</p>
                    </div>
                    <ClipboardList className="text-white opacity-80" size={24} />
                  </div>
                </div>
                <div className="dashboard-card bg-gradient-to-br from-red-500 to-rose-600 border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="stat-label text-red-100">منتظرة</p>
                      <p className="stat-number">{pending}</p>
                    </div>
                    <Clock className="text-white opacity-80" size={24} />
                  </div>
                </div>
                <div className="dashboard-card bg-gradient-to-br from-emerald-500 to-emerald-700 border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="stat-label text-emerald-100">تم تأكيدها</p>
                      <p className="stat-number">{arrived}</p>
                    </div>
                    <CheckCircle2 className="text-white opacity-80" size={24} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================= قائمة الاستقبال ================= */}
          {active === 'queue' && (
            <div className="dashboard-card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <ClipboardList className="text-blue-400" size={20} />
                  قائمة تأكيد الوصول
                  <span className="text-sm text-gray-500 font-normal">({filtered.length})</span>
                </h3>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="bg-gray-800 border border-border rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">👨‍⚕️ كل الأطباء</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ClipboardList size={40} className="mx-auto mb-3 opacity-50" />
                    <p>لا توجد حالات</p>
                    <p className="text-sm mt-1">غيّر اختيار الطبيب أو انتظر حالات جديدة.</p>
                  </div>
                ) : (
                  filtered.map((referral) => (
                    <div key={referral.id} className="rounded-2xl border border-border bg-gray-800/30 p-5 hover:bg-gray-800/50 transition-all">
                      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3 text-right flex-1">
                          <div className="flex items-center gap-3 justify-end">
                            <h3 className="text-xl font-bold text-white">{referral.patient_name}</h3>
                            <StatusPill tone={referral.status} />
                            {referral.priority && referral.priority !== 'normal' && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                                referral.priority === 'emergency' ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-white'
                              }`}>
                                <Zap size={12} />
                                {referral.priority === 'emergency' ? 'طارئة' : 'مستعجلة'}
                              </span>
                            )}
                          </div>

                          <div className="grid gap-2 md:grid-cols-2">
                            <p className="text-sm text-gray-400">
                              <span className="font-bold text-gray-300">القسم:</span> {formatDepartment(referral.departments?.name)}
                            </p>
                            <p className="text-sm text-gray-400">
                              <span className="font-bold text-gray-300">العمر:</span> {referral.patient_age} سنة
                            </p>
                            <p className="text-sm text-gray-400">
                              <span className="font-bold text-gray-300">الطبيب:</span> {referral.doctors?.full_name || '-'}
                            </p>
                            <p className="text-sm text-gray-400">
                              <span className="font-bold text-gray-300">تاريخ الإرسال:</span> {formatDate(referral.referral_date)}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-border/50">
                            <p className="text-sm text-gray-300">
                              <span className="font-bold">التشخيص الطبي:</span> {referral.diagnosis}
                            </p>
                          </div>

                          {referral.attachment_name && (
                            <button
                              onClick={() => openAttachment(referral.attachment_path, referral.attachment_name)}
                              className="mt-3 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                            >
                              📎 {referral.attachment_name}
                            </button>
                          )}
                        </div>

                        <div className="flex md:flex-col items-end gap-3">
                          {referral.status === 'pending' && (
                            <button
                              onClick={() => confirmArrival(referral.id)}
                              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
                            >
                              <CheckCircle2 size={16} /> تأكيد الوصول
                            </button>
                          )}
                          {referral.status === 'arrived' && (
                            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl">
                              <CheckCircle2 size={16} />
                              <span className="text-sm font-semibold">تم التأكيد</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <ProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={profile.full_name}
        email={profile.username}
        roleLabel="استقبال"
        phone={profile.phone}
        nationalId={profile.national_id}
        avatarUrl={avatarUrl}
        onUploadAvatar={uploadAvatar}
        uploadMessage={uploadMessage}
      />
    </div>
  );
}