"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../src/lib/supabase/client";
import MobileShell, { MobileLoading, Notice } from "../../../src/components/mobile/mobile-shell";
import MobileProfile from "../../../src/components/mobile/mobile-profile";
import {
  MobileAvatar,
  MobileEmpty,
  MobileInfoCard,
  MobileInput,
  MobilePanel,
  MobileSelect,
  MobileStatCard,
  MobileStatus,
  MobileTextarea,
} from "../../../src/components/mobile/mobile-cards";
import { getMobileProfile, safeDate, signStorage } from "../../../src/components/mobile/mobile-api";
import { formatMoney } from "../../../src/lib/format";
import {
  CheckCircle2,
  Clock,
  Download,
  FilePlus2,
  FileText,
  Home,
  IdCard,
  Phone,
  Save,
  Stethoscope,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RelationOne<T> = T | T[] | null;

type Referral = {
  id: string;
  patient_name: string;
  patient_age: number | null;
  diagnosis: string | null;
  priority: string | null;
  status: string;
  referral_date: string | null;
  created_at: string | null;
  arrived_at: string | null;
  completed_at?: string | null;
  attachment_name: string | null;
  attachment_path: string | null;
  attachment_url?: string | null;
  doctor_id?: string | null;
  department_id?: string | null;
  departments: RelationOne<{ id: string; name: string }>;
  doctors?: RelationOne<{ id: string; full_name: string }>;
};

type DoctorRow = {
  id: string;
  full_name: string;
  card_no: string | null;
  specialty: string | null;
  phone: string | null;
  kareemy_account: string | null;
  user_id: string | null;
  is_active: boolean | null;
};

type DepartmentRow = {
  id: string;
  name: string;
};

function one<T>(value: RelationOne<T>): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function priorityLabel(value?: string | null) {
  const labels: Record<string, string> = {
    normal: "عادية",
    urgent: "عاجلة",
    high: "مهمة",
    low: "منخفضة",
  };
  return labels[String(value || "")] || value || "-";
}

function relationDepartmentId(referral: Referral) {
  return one(referral.departments)?.id || referral.department_id || "";
}

function relationDepartmentName(referral: Referral) {
  return one(referral.departments)?.name || "-";
}

function relationDoctorId(referral: Referral) {
  return one(referral.doctors)?.id || referral.doctor_id || "";
}

function relationDoctorName(referral: Referral) {
  return one(referral.doctors)?.full_name || "-";
}

const emptyForm = {
  patient_name: "",
  patient_age: "",
  diagnosis: "",
  priority: "normal",
  department_id: "",
  referral_date: "",
};

export default function DoctorMobilePage() {
  const [active, setActive] = useState("overview");
  const [profile, setProfile] = useState<any>(null);
  const [doctor, setDoctor] = useState<DoctorRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<any>(emptyForm);
  const [attachment, setAttachment] = useState<File | null>(null);

  useEffect(() => {
    boot();
  }, []);

  async function fetchDoctorByUserId(profileId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("doctors")
      .select("id, full_name, card_no, specialty, phone, kareemy_account, user_id, is_active")
      .eq("user_id", profileId)
      .maybeSingle();

    return (data || null) as DoctorRow | null;
  }

  async function fetchDoctorById(doctorId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("doctors")
      .select("id, full_name, card_no, specialty, phone, kareemy_account, user_id, is_active")
      .eq("id", doctorId)
      .maybeSingle();

    return (data || null) as DoctorRow | null;
  }

  async function fetchDoctorByName(name: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("doctors")
      .select("id, full_name, card_no, specialty, phone, kareemy_account, user_id, is_active")
      .ilike("full_name", name)
      .limit(1)
      .maybeSingle();

    return (data || null) as DoctorRow | null;
  }

  async function fetchReferralsForDoctor(doctorRow: DoctorRow | null, profileName: string) {
    const supabase = createClient();

    let query = supabase
      .from("referrals")
      .select(`
        id,
        patient_name,
        patient_age,
        diagnosis,
        priority,
        status,
        referral_date,
        created_at,
        arrived_at,
        completed_at,
        attachment_name,
        attachment_path,
        doctor_id,
        department_id,
        departments(id, name),
        doctors(id, full_name)
      `)
      .order("created_at", { ascending: false });

    if (doctorRow?.id) {
      query = query.eq("doctor_id", doctorRow.id);
    }

    const referralRes = await query;
    if (referralRes.error) throw referralRes.error;

    let rows = (referralRes.data || []) as unknown as Referral[];

    if (!doctorRow?.id && profileName) {
      rows = rows.filter((r) => relationDoctorName(r) === profileName);
    }

    const enriched = await Promise.all(
      rows.map(async (r) => {
        const url = await signStorage("referral-files", r.attachment_path);
        return { ...r, attachment_url: url };
      })
    );

    return enriched;
  }

  async function boot() {
    try {
      setLoading(true);
      setMessage("");

      const p = await getMobileProfile();
      if (!p) return;

      if (String(p.role).toLowerCase() !== "doctor") {
        window.location.href = "/mobile/dashboard";
        return;
      }

      setProfile(p);

      const signedAvatar = await signStorage("profile-images", p.avatar_path);
      setAvatarUrl(signedAvatar ? `${signedAvatar}${signedAvatar.includes("?") ? "&" : "?"}v=${Date.now()}` : null);

      const supabase = createClient();

      const deptRes = await supabase.from("departments").select("id, name").order("name");
      if (deptRes.error) throw deptRes.error;
      setDepartments((deptRes.data || []) as DepartmentRow[]);

      let doctorRow = await fetchDoctorByUserId(p.id);

      if (!doctorRow && p.full_name) {
        doctorRow = await fetchDoctorByName(p.full_name);
      }

      let referralRows = await fetchReferralsForDoctor(doctorRow, p.full_name || "");

      if (!doctorRow && referralRows.length > 0) {
        const referralDoctorId = relationDoctorId(referralRows[0]);
        if (referralDoctorId) {
          doctorRow = await fetchDoctorById(referralDoctorId);
          if (doctorRow) {
            referralRows = await fetchReferralsForDoctor(doctorRow, p.full_name || "");
          }
        }
      }

      setDoctor(doctorRow);
      setReferrals(referralRows);

      const rateRes = doctorRow?.id
        ? await supabase
            .from("doctor_department_rates")
            .select("doctor_id, department_id, amount")
            .eq("doctor_id", doctorRow.id)
        : { data: [], error: null };

      if (rateRes.error) throw rateRes.error;
      setRates(rateRes.data || []);

      if (deptRes.data?.length && !form.department_id) {
        setForm((old: any) => ({ ...old, department_id: deptRes.data?.[0]?.id || "" }));
      }

      // لا نوقف الصفحة إذا لم يظهر سجل الطبيب الكامل.
      // قد تكون الإحالات نفسها تحمل doctor_id الصحيح، وهذا يكفي للعرض والإضافة.
    } catch (error: any) {
      setMessage(error?.message || "تعذر تحميل صفحة الطبيب.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadAttachment(referralId: string) {
    if (!attachment) return { attachment_name: null, attachment_path: null };

    const supabase = createClient();
    const safeName = attachment.name.replace(/[^\w.\-\u0600-\u06FF]/g, "_");
    const path = `doctor-referrals/${referralId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from("referral-files").upload(path, attachment, {
      upsert: false,
      contentType: attachment.type || "application/octet-stream",
    });

    if (error) throw error;

    return { attachment_name: attachment.name, attachment_path: path };
  }

  async function createReferral() {
    const actionDoctorId = doctor?.id || referrals.map((r) => relationDoctorId(r)).find(Boolean);

    if (!actionDoctorId) {
      setMessage("لا يمكن إضافة إحالة الآن لأن رقم الطبيب غير موجود في بيانات الصفحة.");
      return;
    }

    if (!form.patient_name.trim()) {
      setMessage("اكتب اسم المريض.");
      return;
    }

    if (!form.department_id) {
      setMessage("اختر القسم.");
      return;
    }

    try {
      setBusy(true);
      setMessage("");

      const supabase = createClient();

      const insertPayload: any = {
        referral_code:"REF-" + Date.now(),
        patient_name: form.patient_name.trim(),
        patient_age: form.patient_age ? Number(form.patient_age) : null,
        diagnosis: form.diagnosis.trim() || null,
        priority: form.priority || "normal",
        status: "pending",
        referral_date: form.referral_date || new Date().toISOString(),
        doctor_id: actionDoctorId,
        department_id: form.department_id,
      };

      const { data: created, error: insertError } = await supabase
        .from("referrals")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertError) throw insertError;

      const uploaded = await uploadAttachment(created.id);

      if (uploaded.attachment_path) {
        const { error: updateError } = await supabase
          .from("referrals")
          .update(uploaded)
          .eq("id", created.id);

        if (updateError) throw updateError;
      }

      setMessage("تمت إضافة الإحالة بنجاح.");
      setForm(emptyForm);
      setAttachment(null);
      await boot();
      setActive("referrals");
    } catch (error: any) {
      setMessage(error?.message || "تعذر إضافة الإحالة.");
    } finally {
      setBusy(false);
    }
  }

  const rateMap = useMemo(() => {
    return new Map(rates.map((r: any) => [`${r.doctor_id}:${r.department_id}`, Number(r.amount || 0)]));
  }, [rates]);

  const visibleReferrals = useMemo(() => {
    return referrals.filter((r) => statusFilter === "all" || r.status === statusFilter);
  }, [referrals, statusFilter]);

  const pending = referrals.filter((r) => r.status === "pending");
  const arrived = referrals.filter((r) => r.status === "arrived");
  const completed = referrals.filter((r) => r.status === "completed");

  const activeDoctorId = doctor?.id || referrals.map((r) => relationDoctorId(r)).find(Boolean) || "";

  const totalDue = arrived.reduce((sum, r) => {
    if (!activeDoctorId) return sum;
    return sum + Number(rateMap.get(`${activeDoctorId}:${relationDepartmentId(r)}`) || 0);
  }, 0);

  const chartData = [
    { name: "معلقة", value: pending.length },
    { name: "وصلت", value: arrived.length },
    { name: "مكتملة", value: completed.length },
  ];

  if (loading || !profile) return <MobileLoading text="جاري تحميل صفحة الطبيب..." />;

  return (
    <MobileShell
      title="صفحة الطبيب"
      profile={profile}
      tabs={[
        { key: "overview", label: "الرئيسية", icon: <Home size={18} /> },
        { key: "referrals", label: "إحالاتي", icon: <FileText size={18} /> },
        { key: "add", label: "إضافة", icon: <FilePlus2 size={18} /> },
        { key: "profile", label: "البروفايل", icon: <UserRound size={18} /> },
      ]}
      active={active}
      onTabChange={setActive}
      avatarUrl={avatarUrl}
    >
      {message && <Notice message={message} danger={message.includes("تعذر") || message.includes("لا يمكن") || message.includes("اكتب") || message.includes("اختر")} />}

      {active === "overview" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <MobileStatCard label="كل الإحالات" value={referrals.length} icon={<FileText size={18} />} />
            <MobileStatCard label="لم تصل" value={pending.length} icon={<Clock size={18} />} tone="orange" />
            <MobileStatCard label="وصلت" value={arrived.length} icon={<CheckCircle2 size={18} />} tone="blue" />
            <MobileStatCard label="مستحقات وصلت" value={formatMoney(totalDue)} icon={<Wallet size={18} />} tone="purple" />
          </div>

          <DoctorProfileCard doctor={doctor} profile={profile} avatarUrl={avatarUrl} />

          <MobilePanel title="مخطط الإحالات" subtitle="توزيع الحالات حسب الحالة">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="عدد الحالات" fill="#0f8f7d" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </MobilePanel>

          <MobilePanel title="آخر الإحالات" subtitle="أحدث الحالات المحالة إلى الطبيب">
            {referrals.slice(0, 5).map((r) => (
              <ReferralCard key={r.id} referral={r} doctorAvatar={avatarUrl} />
            ))}
            {!referrals.length && <MobileEmpty text="لا توجد إحالات لهذا الطبيب." />}
          </MobilePanel>
        </>
      )}

      {active === "referrals" && (
        <MobilePanel title="إحالات الطبيب" subtitle="قائمة المرضى بتصميم هاتف">
          <div className="mb-3">
            <MobileSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="pending">معلقة</option>
              <option value="arrived">وصلت</option>
              <option value="completed">مكتملة</option>
              <option value="cancelled">ملغاة</option>
            </MobileSelect>
          </div>

          {visibleReferrals.map((r) => (
            <ReferralCard key={r.id} referral={r} doctorAvatar={avatarUrl} />
          ))}
          {!visibleReferrals.length && <MobileEmpty text="لا توجد إحالات مطابقة." />}
        </MobilePanel>
      )}

      {active === "add" && (
        <MobilePanel title="إضافة إحالة" subtitle="كل الحقول الأساسية بدون حذف من صفحة الطبيب">
          <div className="grid gap-3">
            <MobileInput
              placeholder="اسم المريض"
              value={form.patient_name}
              onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
            />

            <MobileInput
              type="number"
              placeholder="العمر"
              value={form.patient_age}
              onChange={(e) => setForm({ ...form, patient_age: e.target.value })}
            />

            <MobileSelect
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            >
              <option value="">اختر القسم</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </MobileSelect>

            <MobileSelect
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="normal">عادية</option>
              <option value="urgent">عاجلة</option>
            
              <option value="low">منخفضة</option>
            </MobileSelect>

            <MobileInput
              type="datetime-local"
              value={form.referral_date}
              onChange={(e) => setForm({ ...form, referral_date: e.target.value })}
            />

            <MobileTextarea
              placeholder="التشخيص الطبي"
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
            />

            <label className="rounded-2xl bg-slate-50 px-4 py-4 text-xs font-black text-slate-600">
              المرفق
              <input
                type="file"
                className="mt-2 block w-full text-xs"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
              {attachment && <span className="mt-2 block text-[#0f8f7d]">{attachment.name}</span>}
            </label>

            <button
              type="button"
              disabled={busy}
              onClick={createReferral}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0f8f7d] text-sm font-black text-white disabled:opacity-50"
            >
              <Save size={17} />
              {busy ? "جاري الحفظ..." : "حفظ الإحالة"}
            </button>
          </div>
        </MobilePanel>
      )}

      {active === "profile" && <MobileProfile profile={profile} onUpdated={boot} />}
    </MobileShell>
  );
}

function DoctorProfileCard({ doctor, profile, avatarUrl }: any) {
  return (
    <MobilePanel title="بيانات الطبيب" subtitle="بيانات الحساب الطبي وربط الكريمي">
      <div className="mb-4 flex items-center gap-3 rounded-[1.4rem] bg-slate-50 p-4">
        <MobileAvatar url={avatarUrl} name={doctor?.full_name || profile?.full_name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-900">{doctor?.full_name || profile?.full_name || "-"}</p>
          <p className="text-xs font-bold text-slate-400">{doctor?.specialty || "طبيب"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Info icon={<IdCard size={16} />} label="رقم الكرت" value={doctor?.card_no || "-"} />
        <Info icon={<Phone size={16} />} label="الهاتف" value={doctor?.phone || profile?.phone || "-"} />
        <Info icon={<Stethoscope size={16} />} label="التخصص" value={doctor?.specialty || "-"} />
        <Info label="الحالة" value={doctor?.is_active === false ? "غير نشط" : "نشط"} />
        <Info className="col-span-2" label="حساب الكريمي" value={doctor?.kareemy_account || "-"} />
      </div>
    </MobilePanel>
  );
}

function Info({ label, value, icon, className = "" }: any) {
  return (
    <div className={`rounded-2xl bg-slate-50 px-3 py-3 ${className}`}>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-black text-slate-400">
        {icon}
        {label}
      </div>
      <p className="break-words text-xs font-black text-slate-800">{value}</p>
    </div>
  );
}


function ReferralCard({ referral, doctorAvatar }: { referral: Referral; doctorAvatar?: string | null }) {
  return (
    <MobileInfoCard
      title={referral.patient_name}
      subtitle={referral.diagnosis || "لا يوجد تشخيص"}
      avatar={<MobileAvatar url={doctorAvatar} name={relationDoctorName(referral) || referral.patient_name} size="sm" />}
      status={<MobileStatus value={referral.status} />}
      meta={[
        { label: "القسم", value: relationDepartmentName(referral) },
        { label: "العمر", value: referral.patient_age ? `${referral.patient_age} سنة` : "-" },
        { label: "الأولوية", value: priorityLabel(referral.priority) },
        { label: "تاريخ الإرسال", value: safeDate(referral.referral_date || referral.created_at) },
        { label: "تاريخ الاستقبال", value: safeDate(referral.arrived_at) },
        { label: "الطبيب", value: relationDoctorName(referral) },
        { label: "التشخيص الطبي", value: referral.diagnosis || "-", wide: true },
      ]}
      footer={<AttachmentDownloadButton url={referral.attachment_url} name={referral.attachment_name} />}
    />
  );
}

function AttachmentDownloadButton({ url, name }: { url?: string | null; name?: string | null }) {
  async function download() {
    if (!url) return;
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name || "referral-attachment";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-100 px-3 py-3 text-xs font-black text-slate-400">
        لا يوجد مرفق
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={download}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f8f7d] px-3 py-3 text-xs font-black text-white"
    >
      <Download size={16} />
      تنزيل المرفق على الجهاز
    </button>
  );
}




