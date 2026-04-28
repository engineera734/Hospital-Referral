// src/app/dashboard/doctor/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createClient } from "../../../src/lib/supabase/client";
import StatusPill, { ReferralTone } from "../../../src/components/ui/status-pill";
import ProfileDrawer from "../../../src/components/ui/profile-drawer";
import { formatDate, formatDepartment, formatMoney } from "../../../src/lib/format";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Legend
} from 'recharts';
import {
  TrendingUp, ClipboardList, Archive, PlusCircle,
  Bell, Settings, ChevronDown, Activity, Stethoscope,
  AlertCircle, CheckCircle2, Clock, DollarSign,
  Send, RefreshCw, Zap, ArrowUpRight
} from 'lucide-react';

// --- دوال مساعدة للأمان ---
const sanitizeInput = (input: string): string => {
  if (!input) return '';
  // إزالة HTML tags و JavaScript events
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const validateAge = (age: number): boolean => {
  return !isNaN(age) && age >= 0 && age <= 150;
};

const validatePatientName = (name: string): boolean => {
  const nameRegex = /^[\u0600-\u06FF\s\u00C0-\u00FFa-zA-Z\s0-9\-]{2,100}$/;
  return nameRegex.test(name.trim());
};

const validateDiagnosis = (diagnosis: string): boolean => {
  return diagnosis.trim().length >= 3 && diagnosis.trim().length <= 1000;
};

// قبول جميع الملفات المعروفة
const validateFile = (file: File | null): { valid: boolean; error?: string } => {
  if (!file) return { valid: true };
  
  // قائمة بجميع الامتدادات المسموحة
  const allowedExtensions = [
    // الصور
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif',
    // المستندات
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp',
    // الفيديو والصوت
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.mp3', '.wav', '.ogg', '.m4a',
    // الملفات المضغوطة
    '.zip', '.rar', '.7z', '.tar', '.gz',
    // ملفات أخرى
    '.xml', '.json', '.csv', '.psd', '.ai', '.eps', '.dwg', '.dxf'
  ];
  
  const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
  const maxSize = 20 * 1024 * 1024; // 20MB
  
  if (!allowedExtensions.includes(fileExt)) {
    return { valid: false, error: `نوع الملف غير مسموح. الامتدادات المسموحة: ${allowedExtensions.join(', ')}` };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'حجم الملف يتجاوز 20 ميجابايت' };
  }
  
  // التحقق من الملفات الضارة
  const dangerousPatterns = /\.(php|exe|sh|bat|cmd|js|vbs|ps1|dll|so|dylib)$/i;
  if (dangerousPatterns.test(file.name)) {
    return { valid: false, error: 'نوع الملف غير آمن' };
  }
  
  return { valid: true };
};

// --- أنواع البيانات ---
type Profile = { id: string; full_name: string; username: string; role: string; phone?: string | null; national_id?: string | null; avatar_path?: string | null; };
type Department = { id: string; name: string };
type DoctorRow = { id: string; full_name: string; kareemy_account: string | null; user_id: string | null };
type Rate = { department_id: string; amount: number };
type Referral = { id: string; patient_name: string; patient_age: number; diagnosis: string; priority: string; status: ReferralTone | 'archived'; referral_code: string; archived_by_doctor: boolean; attachment_name: string | null; attachment_path?: string | null; created_at: string; referral_date?: string | null; departments: { id?: string; name: string } | null; };

const navItems = [
  { key: 'overview', label: 'الواجهة الرئيسية', icon: Activity },
  { key: 'new', label: 'إضافة إحالة', icon: PlusCircle },
  { key: 'active', label: 'الحالات الحالية', icon: ClipboardList },
  { key: 'archive', label: 'أرشيف الطبيب', icon: Archive },
];

export default function DoctorPage() {
  // --- جميع الحالات ---
  const [active, setActive] = useState('overview');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doctor, setDoctor] = useState<DoctorRow | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rateLimit, setRateLimit] = useState({ count: 0, timestamp: Date.now() });
  
  const [form, setForm] = useState({ patient_name: '', patient_age: '', diagnosis: '', department_id: '', priority: 'normal' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { 
    loadAll();
  }, []);

  // --- دالة التحقق من Rate Limit ---
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    if (now - rateLimit.timestamp > 60000) {
      setRateLimit({ count: 0, timestamp: now });
      return true;
    }
    if (rateLimit.count >= 20) {
      setError('لقد تجاوزت الحد الأقصى للمحاولات. يرجى الانتظار دقيقة.');
      return false;
    }
    setRateLimit(prev => ({ ...prev, count: prev.count + 1 }));
    return true;
  }, [rateLimit]);

  // --- دالة الحصول على URL موقّع ---
  async function getSignedUrl(bucket: string, path?: string | null) {
    if (!path) return null;
    
    const validPaths = ['profile-images/', 'referral-files/'];
    const isValidPath = validPaths.some(vp => path.includes(vp));
    if (!isValidPath && bucket !== 'profile-images' && bucket !== 'referral-files') {
      console.error('Invalid path access attempt');
      return null;
    }
    
    try {
      const res = await fetch('/api/storage/sign', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }, 
        body: JSON.stringify({ bucket, path }) 
      });
      
      if (!res.ok) return null;
      const json = await res.json();
      return res.ok ? json.url as string : null;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  }

  // --- التحقق من صحة الجلسة ---
  async function validateSession(supabase: any) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return false;
      }
      
      const expiresAt = new Date(session.expires_at * 1000);
      if (expiresAt < new Date()) {
        const { data: { session: newSession } } = await supabase.auth.refreshSession();
        if (!newSession) {
          window.location.href = '/login';
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  // --- تحميل البيانات ---
  async function loadAll() {
    setLoading(true); 
    setError('');
    
    const supabase = createClient();
    
    if (!await validateSession(supabase)) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
      window.location.href = '/login'; 
      return; 
    }
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, username, role, phone, national_id, avatar_path')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError || !profileData) {
      setError('حدث خطأ في تحميل البيانات');
      setLoading(false);
      return;
    }
    
    if (!profileData || String(profileData.role).trim().toLowerCase() !== 'doctor') { 
      window.location.href = '/dashboard'; 
      return; 
    }
    
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('id, full_name, kareemy_account, user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const { data: departmentData } = await supabase
      .from('departments')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    let referralData: Referral[] = [];
    let doctorRates: Rate[] = [];
    
    if (doctorData?.id) {
      const { data } = await supabase
        .from('referrals')
        .select('id, patient_name, patient_age, diagnosis, priority, status, referral_code, archived_by_doctor, attachment_name, attachment_path, created_at, referral_date, departments(id,name)')
        .eq('doctor_id', doctorData.id)
        .order('created_at', { ascending: false });
      
      referralData = ((data ?? []) as any[]).map((row) => ({
        id: String(row.id), 
        patient_name: sanitizeInput(String(row.patient_name || '')), 
        patient_age: Number(row.patient_age || 0),
        diagnosis: sanitizeInput(String(row.diagnosis || '')), 
        priority: String(row.priority || 'normal'),
        status: String(row.status || 'pending') as any, 
        referral_code: String(row.referral_code || ''),
        archived_by_doctor: Boolean(row.archived_by_doctor), 
        attachment_name: row.attachment_name ? sanitizeInput(String(row.attachment_name)) : null,
        attachment_path: row.attachment_path ?? null, 
        created_at: String(row.created_at || ''),
        referral_date: row.referral_date || row.created_at || null,
        departments: Array.isArray(row.departments) ? (row.departments[0] || null) : row.departments
      }));
      
      const { data: rateData } = await supabase
        .from('doctor_department_rates')
        .select('department_id, amount')
        .eq('doctor_id', doctorData.id);
      
      doctorRates = ((rateData ?? []) as any[]).map((r) => ({ 
        department_id: String(r.department_id), 
        amount: Number(r.amount || 0) 
      }));
    }
    
    setProfile(profileData as Profile);
    setAvatarUrl(await getSignedUrl('profile-images', (profileData as any)?.avatar_path || null));
    setDoctor((doctorData as any) || null);
    setDepartments(((departmentData ?? []) as any[]).map((d) => ({ 
      id: String(d.id), 
      name: sanitizeInput(formatDepartment(String(d.name || ''))) 
    })));
    setRates(doctorRates);
    setReferrals(referralData);
    setLoading(false);
  }

  // --- التحقق من صحة النموذج ---
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!form.patient_name.trim()) {
      errors.patient_name = 'اسم المريض مطلوب';
    } else if (!validatePatientName(form.patient_name)) {
      errors.patient_name = 'اسم المريض يجب أن يكون بين 2-100 حرف';
    }
    
    const age = Number(form.patient_age);
    if (!form.patient_age) {
      errors.patient_age = 'العمر مطلوب';
    } else if (!validateAge(age)) {
      errors.patient_age = 'العمر يجب أن يكون بين 0 و 150 سنة';
    }
    
    if (!form.diagnosis.trim()) {
      errors.diagnosis = 'التشخيص مطلوب';
    } else if (!validateDiagnosis(form.diagnosis)) {
      errors.diagnosis = 'التشخيص يجب أن يكون بين 3 و 1000 حرف';
    }
    
    if (!form.department_id) {
      errors.department_id = 'القسم مطلوب';
    }
    
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      errors.file = fileValidation.error || 'الملف غير صالح';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- رفع ملف الصورة الشخصية ---
  async function uploadAvatar(file: File) {
    if (!profile) return;
    
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      setUploadMessage(fileValidation.error || 'الملف غير صالح');
      return;
    }
    
    const safeFileName = Date.now() + '_' + Math.random().toString(36).substring(2) + '.' + file.name.split('.').pop();
    const formData = new FormData(); 
    formData.append('file', file); 
    formData.append('userId', profile.id);
    formData.append('fileName', safeFileName);
    
    const res = await fetch('/api/profile/upload-avatar', { 
      method: 'POST', 
      body: formData
    });
    
    const json = await res.json();
    setUploadMessage(res.ok ? 'تم تحديث الصورة الشخصية.' : (json.error || 'تعذر رفع الصورة.'));
    if (res.ok) await loadAll();
  }

  // --- فتح المرفقات ---
  async function openAttachment(path?: string | null, fileName?: string | null) {
    if (!path || !path.startsWith('referral-files/')) {
      setError('مسار غير صالح');
      return;
    }
    
    const signed = await getSignedUrl('referral-files', path);
    if (!signed) {
      setError('لا يمكن الوصول إلى الملف');
      return;
    }
    
    try {
      const response = await fetch(signed);
      if (!response.ok) {
        setError('لا يمكن تحميل الملف');
        return;
      }
      
      const blob = await response.blob();
      const safeFileName = fileName ? sanitizeInput(fileName) : 'attachment';
      const url = URL.createObjectURL(blob); 
      const a = document.createElement('a');
      a.href = url; 
      a.download = safeFileName; 
      a.click(); 
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error opening attachment:', error);
      setError('حدث خطأ في فتح الملف');
    }
  }

  // --- إرسال البيانات ---
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!checkRateLimit()) return;
    
    if (!validateForm()) {
      setError('يرجى تصحيح الأخطاء في النموذج');
      return;
    }
    
    if (!doctor?.id) { 
      setError('لا يوجد سجل طبيب مرتبط بهذا الحساب.'); 
      return; 
    }
    
    setSaving(true); 
    setError(''); 
    setMessage('');
    
    const supabase = createClient();
    
    // التحقق من الجلسة قبل الإرسال
    if (!await validateSession(supabase)) {
      setSaving(false);
      return;
    }
    
    const cleanPatientName = sanitizeInput(form.patient_name.trim());
    const cleanDiagnosis = sanitizeInput(form.diagnosis.trim());
    const patientAge = Number(form.patient_age);
    
    let attachment_name: string | null = null; 
    let attachment_path: string | null = null;
    
    // رفع الملف بشكل آمن
    if (file) {
      const fileValidation = validateFile(file);
      if (!fileValidation.valid) {
        setError(fileValidation.error);
        setSaving(false);
        return;
      }
      
      const safeExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${safeExt}`;
      const path = `${doctor.id}/${safeFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('referral-files')
        .upload(path, file, { 
          upsert: false,
          cacheControl: '3600'
        });
      
      if (uploadError) { 
        setSaving(false); 
        setError('تعذر رفع المرفق: ' + uploadError.message); 
        return; 
      }
      
      attachment_name = sanitizeInput(file.name); 
      attachment_path = path;
    }
    
    // استدعاء الإجراء المخزن
    const { error: insertError } = await supabase.rpc('create_referral_by_doctor', {
      p_patient_name: cleanPatientName,
      p_patient_age: patientAge,
      p_diagnosis: cleanDiagnosis,
      p_department_id: form.department_id,
      p_priority: form.priority,
      p_attachment_name: attachment_name,
      p_attachment_path: attachment_path
    });
    
    if (insertError) { 
      setSaving(false); 
      setError(insertError.message || 'تعذر حفظ الإحالة.'); 
      return; 
    }
    
    // تنظيف النموذج بعد الإرسال
    setForm({ patient_name: '', patient_age: '', diagnosis: '', department_id: '', priority: 'normal' });
    setFile(null); 
    setFormErrors({});
    setMessage('تم إنشاء الإحالة بنجاح.'); 
    setSaving(false); 
    setActive('active'); 
    await loadAll();
  }

  // --- أرشفة آمنة ---
  async function archiveReferral(id: string) {
    if (!checkRateLimit()) return;
    
    const supabase = createClient();
    const { error } = await supabase.rpc('archive_doctor_referral', { p_referral_id: id });
    if (error) { 
      setError('تعذر أرشفة السجل.'); 
      return; 
    }
    await loadAll(); 
    setActive('archive');
  }

  async function handleRefresh() { 
    if (!checkRateLimit()) return;
    setIsRefreshing(true); 
    await loadAll(); 
    setTimeout(() => setIsRefreshing(false), 1000); 
  }
  
  async function handleLogout() { 
    const supabase = createClient(); 
    await supabase.auth.signOut(); 
    window.location.href = '/login'; 
  }

  // --- البيانات المحسوبة ---
  const activeReferrals = useMemo(() => referrals.filter((i) => !i.archived_by_doctor), [referrals]);
  const archivedReferrals = useMemo(() => referrals.filter((i) => i.archived_by_doctor), [referrals]);
  const totalProfit = useMemo(() => activeReferrals.filter((r) => r.status === 'arrived').reduce((sum, r) => sum + (rates.find((rate) => rate.department_id === ((r.departments as any)?.id || ''))?.amount || 0), 0), [activeReferrals, rates]);
  const pendingCount = activeReferrals.filter(r => r.status === 'pending').length;
  const arrivedCount = activeReferrals.filter(r => r.status === 'arrived').length;

  const monthlyStats = useMemo(() => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months.map((month, i) => ({
      month,
      referrals: referrals.filter(r => new Date(r.created_at).getMonth() === i).length,
    }));
  }, [referrals]);

  const radialData = [
    { name: 'منتظرة', value: pendingCount, fill: '#f59e0b' },
    { name: 'مستقبلة', value: arrivedCount, fill: '#10b981' },
    { name: 'مؤرشفة', value: archivedReferrals.length, fill: '#6b7280' },
  ];

  // --- شاشة التحميل ---
  if (loading || !profile) return (
    <div className="flex min-h-screen items-center justify-center bg-dark-bg">
      <div className="text-center">
        <div className="relative mx-auto mb-6 h-20 w-20">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping"></div>
          <div className="absolute inset-2 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Stethoscope className="text-blue-400" size={32} />
          </div>
        </div>
        <p className="text-gray-400 text-lg">جارٍ تجهيز لوحة الطبيب...</p>
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Stethoscope className="text-white" size={28} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-sidebar">
                <CheckCircle2 className="text-white" size={12} />
              </div>
            </div>
          </div>
          <h1 className="text-xl font-bold text-center bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            د. {doctor?.full_name || profile.full_name}
          </h1>
          <p className="text-xs text-gray-500 mt-1 text-center">لوحة تحكم الطبيب</p>
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
              {item.key === 'active' && pendingCount > 0 && (
                <span className="mr-auto bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-20 left-3 right-3">
          <div className="bg-card-bg rounded-2xl p-4 border border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">إجمالي المستحقات</span>
              <DollarSign size={14} className="text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400 text-center">{formatMoney(totalProfit)}</p>
          </div>
        </div>

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
                {pendingCount > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}
              </button>
              <button className="text-gray-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-800">
                <Settings size={20} />
              </button>
              <div className="h-8 w-px bg-border"></div>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 p-2 rounded-2xl transition-all" onClick={() => setProfileOpen(true)}>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden ring-2 ring-blue-500/30">
                  {avatarUrl ? <img src={avatarUrl} alt={profile.full_name} className="h-full w-full object-cover" /> : <span className="text-white font-bold">{profile.full_name.slice(0, 1)}</span>}
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm text-white font-semibold">{profile.full_name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>طبيب
                  </p>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </div>
            </div>
          </header>

          {/* رسائل النظام */}
          {(message || error) && (
            <div className={`mb-6 rounded-xl border-r-4 px-5 py-4 text-right text-sm ${
              error ? 'border-red-500 bg-red-500/10 text-red-300' : 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                <span>{error || message}</span>
              </div>
            </div>
          )}

          {/* ================= الواجهة الرئيسية ================= */}
          {active === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="dashboard-card bg-gradient-to-br from-blue-600 to-blue-800 border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="stat-label text-blue-200">الحالات الحالية</p>
                      <p className="stat-number">{activeReferrals.length}</p>
                    </div>
                    <ClipboardList className="text-white opacity-80" size={24} />
                  </div>
                </div>
                <div className="dashboard-card bg-gradient-to-br from-amber-500 to-orange-600 border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="stat-label text-amber-100">قيد الانتظار</p>
                      <p className="stat-number">{pendingCount}</p>
                    </div>
                    <Clock className="text-white opacity-80" size={24} />
                  </div>
                </div>
                <div className="dashboard-card bg-gradient-to-br from-emerald-500 to-emerald-700 border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="stat-label text-emerald-100">تم الاستقبال</p>
                      <p className="stat-number">{arrivedCount}</p>
                    </div>
                    <CheckCircle2 className="text-white opacity-80" size={24} />
                  </div>
                </div>
                <div className="dashboard-card bg-gradient-to-br from-violet-600 to-purple-800 border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="stat-label text-violet-200">إجمالي المستحقات</p>
                      <p className="stat-number text-2xl">{formatMoney(totalProfit)}</p>
                    </div>
                    <DollarSign className="text-white opacity-80" size={24} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="dashboard-card lg:col-span-1 text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg mb-4">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover rounded-2xl" /> : profile.full_name.slice(0, 1)}
                  </div>
                  <h3 className="text-white font-bold text-lg">{doctor?.full_name || profile.full_name}</h3>
                  <p className="text-gray-400 text-sm mb-4">طبيب</p>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-800/50 rounded-xl">
                      <p className="text-xs text-gray-500">حساب الكريمي</p>
                      <p className="text-white font-mono font-bold mt-1">{doctor?.kareemy_account || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-xl">
                      <p className="text-xs text-gray-500">عدد الأقسام</p>
                      <p className="text-white font-bold mt-1">{departments.length} أقسام</p>
                    </div>
                  </div>
                </div>

                <div className="dashboard-card lg:col-span-2">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <DollarSign className="text-emerald-400" size={20} />
                    نسب الربح حسب الأقسام
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {departments.map((dep) => {
                      const amount = rates.find((r) => r.department_id === dep.id)?.amount || 0;
                      return (
                        <div key={dep.id} className="p-4 bg-gray-800/50 rounded-xl border border-border/30 hover:border-emerald-500/30 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-white font-semibold">{dep.name}</p>
                            <ArrowUpRight size={16} className="text-emerald-400" />
                          </div>
                          <p className="text-2xl font-bold text-emerald-400">{formatMoney(amount)}</p>
                          <p className="text-xs text-gray-500 mt-1">ربح التحويل لهذا القسم</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="dashboard-card">
                  <h3 className="text-white font-semibold text-lg mb-4">توزيع الحالات</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
                      <RadialBar dataKey="value" cornerRadius={10} />
                      <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="dashboard-card">
                  <h3 className="text-white font-semibold text-lg mb-4">الإحالات الشهرية</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px' }} />
                      <Line type="monotone" dataKey="referrals" stroke="#3b82f6" strokeWidth={2} name="الإحالات" dot={{ fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ================= إضافة إحالة ================= */}
          {active === 'new' && (
            <div className="dashboard-card max-w-3xl mx-auto">
              <h3 className="text-white font-semibold text-lg mb-6 flex items-center gap-2">
                <Send className="text-blue-400" size={20} />
                إضافة إحالة جديدة
              </h3>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">اسم المريض *</label>
                    <input 
                      value={form.patient_name} 
                      onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                      onBlur={() => validateForm()}
                      className={`w-full rounded-xl bg-gray-800 border ${formErrors.patient_name ? 'border-red-500' : 'border-border'} px-4 py-3 text-gray-300 focus:outline-none focus:border-blue-500 text-right`} 
                      placeholder="أدخل اسم المريض"
                      maxLength={100}
                    />
                    {formErrors.patient_name && <p className="text-red-400 text-xs mt-1">{formErrors.patient_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">العمر *</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="150"
                      value={form.patient_age} 
                      onChange={(e) => setForm({ ...form, patient_age: e.target.value })}
                      onBlur={() => validateForm()}
                      className={`w-full rounded-xl bg-gray-800 border ${formErrors.patient_age ? 'border-red-500' : 'border-border'} px-4 py-3 text-gray-300 focus:outline-none focus:border-blue-500 text-right`} 
                      placeholder="العمر بالسنوات" 
                    />
                    {formErrors.patient_age && <p className="text-red-400 text-xs mt-1">{formErrors.patient_age}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-2">التشخيص الطبي *</label>
                    <textarea 
                      value={form.diagnosis} 
                      onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                      onBlur={() => validateForm()}
                      rows={4}
                      maxLength={1000}
                      className={`w-full rounded-xl bg-gray-800 border ${formErrors.diagnosis ? 'border-red-500' : 'border-border'} px-4 py-3 text-gray-300 focus:outline-none focus:border-blue-500 text-right`} 
                      placeholder="وصف الحالة والتشخيص" 
                    />
                    {formErrors.diagnosis && <p className="text-red-400 text-xs mt-1">{formErrors.diagnosis}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">القسم *</label>
                    <select 
                      value={form.department_id} 
                      onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                      onBlur={() => validateForm()}
                      className={`w-full rounded-xl bg-gray-800 border ${formErrors.department_id ? 'border-red-500' : 'border-border'} px-4 py-3 text-gray-300 focus:outline-none focus:border-blue-500 text-right`}
                    >
                      <option value="">اختر القسم</option>
                      {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </select>
                    {formErrors.department_id && <p className="text-red-400 text-xs mt-1">{formErrors.department_id}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">طبيعة الحالة *</label>
                    <select 
                      value={form.priority} 
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full rounded-xl bg-gray-800 border border-border px-4 py-3 text-gray-300 focus:outline-none focus:border-blue-500 text-right"
                    >
                      <option value="normal">عادية</option>
                      <option value="urgent">مستعجلة</option>
                      <option value="emergency">طارئة</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-2">المرفق (اختياري)</label>
                    <input 
                      type="file" 
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0] || null;
                        setFile(selectedFile);
                        validateForm();
                      }}
                      className="w-full rounded-xl bg-gray-800 border border-border px-4 py-3 text-gray-300 file:ml-3 file:rounded-lg file:bg-blue-600 file:text-white file:border-0 file:px-3 file:py-1" 
                    />
                    {formErrors.file && <p className="text-red-400 text-xs mt-1">{formErrors.file}</p>}
                    <p className="text-gray-500 text-xs mt-1">الملفات المسموحة: جميع أنواع الملفات المعروفة (صور، مستندات، فيديو، صوت، مضغوطات) - الحد الأقصى 20 ميجابايت</p>
                  </div>
                  <div className="md:col-span-2 flex justify-start">
                    <button 
                      type="submit"
                      disabled={saving} 
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 font-bold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all"
                    >
                      <Send size={18} />
                      {saving ? 'جارٍ الحفظ...' : 'إنشاء الإحالة'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ================= الحالات الحالية ================= */}
          {active === 'active' && (
            <div className="dashboard-card">
              <h3 className="text-white font-semibold text-lg mb-6 flex items-center gap-2">
                <ClipboardList className="text-blue-400" size={20} />
                الحالات الحالية
                <span className="text-sm text-gray-500 font-normal">({activeReferrals.length})</span>
              </h3>
              <div className="space-y-4">
                {activeReferrals.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">لا توجد حالات حالية</div>
                ) : (
                  activeReferrals.map((referral) => (
                    <div key={referral.id} className="rounded-2xl border border-border bg-gray-800/30 p-5 hover:bg-gray-800/50 transition-all">
                      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3 text-right flex-1">
                          <div className="flex items-center gap-3 justify-end">
                            <h3 className="text-xl font-bold text-white">{referral.patient_name}</h3>
                            <StatusPill tone={referral.status as any} />
                            {referral.priority !== 'normal' && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                                referral.priority === 'emergency' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                              }`}>
                                <Zap size={12} />
                                {referral.priority === 'emergency' ? 'طارئة' : 'مستعجلة'}
                              </span>
                            )}
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <p className="text-sm text-gray-400"><span className="font-bold text-gray-300">القسم:</span> {formatDepartment((referral.departments as any)?.name)}</p>
                            <p className="text-sm text-gray-400"><span className="font-bold text-gray-300">العمر:</span> {referral.patient_age} سنة</p>
                            <p className="text-sm text-gray-400"><span className="font-bold text-gray-300">تاريخ الإرسال:</span> {formatDate(referral.referral_date || referral.created_at)}</p>
                            <p className="text-sm text-gray-400"><span className="font-bold text-gray-300">كود التحويلة:</span> <span className="font-mono text-blue-400">{referral.referral_code}</span></p>
                          </div>
                          <div className="pt-3 border-t border-border/50">
                            <p className="text-sm text-gray-300"><span className="font-bold">التشخيص:</span> {referral.diagnosis}</p>
                          </div>
                          {referral.attachment_name && (
                            <button onClick={() => openAttachment(referral.attachment_path, referral.attachment_name)} className="mt-3 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
                              📎 {referral.attachment_name}
                            </button>
                          )}
                        </div>
                        <div className="flex md:flex-col items-end gap-3">
                          <button onClick={() => archiveReferral(referral.id)} className="flex items-center gap-2 rounded-xl bg-gray-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-600 transition-all">
                            <Archive size={16} /> نقل إلى الأرشيف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================= الأرشيف ================= */}
          {active === 'archive' && (
            <div className="dashboard-card">
              <h3 className="text-white font-semibold text-lg mb-6 flex items-center gap-2">
                <Archive className="text-gray-400" size={20} />
                أرشيف الطبيب
                <span className="text-sm text-gray-500 font-normal">({archivedReferrals.length})</span>
              </h3>
              <div className="space-y-3">
                {archivedReferrals.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">الأرشيف فارغ</div>
                ) : (
                  archivedReferrals.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-border/30 hover:bg-gray-800/50 transition-all">
                      <div className="text-right">
                        <p className="text-white font-bold">{referral.patient_name}</p>
                        <p className="text-sm text-gray-400 mt-1">القسم: {formatDepartment((referral.departments as any)?.name)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{formatDate(referral.created_at)}</span>
                        <StatusPill tone="archived" />
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
        roleLabel="طبيب" 
        phone={profile.phone} 
        nationalId={profile.national_id} 
        avatarUrl={avatarUrl} 
        onUploadAvatar={uploadAvatar} 
        uploadMessage={uploadMessage} 
      />
    </div>
  );
}