"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../src/lib/supabase/client";
import MobileShell, { MobileLoading, Notice } from "../../../src/components/mobile/mobile-shell";
import MobileProfile from "../../../src/components/mobile/mobile-profile";
import {
  MobileAttachmentButton,
  MobileAvatar,
  MobileEmpty,
  MobileInfoCard,
  MobilePanel,
  MobileSelect,
  MobileStatCard,
  MobileStatus,
} from "../../../src/components/mobile/mobile-cards";
import { getMobileProfile, getDoctorAvatarPath, priorityLabel, safeDate, signStorage } from "../../../src/components/mobile/mobile-api";
import { CheckCircle2, ClipboardList, Clock, FileText, Home, Stethoscope, UserCheck, UserRound } from "lucide-react";

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
  attachment_name: string | null;
  attachment_path: string | null;
  departments: { id: string; name: string } | null;
  doctors: { id: string; full_name: string; specialty?: string | null; phone?: string | null; card_no?: string | null; user_id?: string | null } | null;
  doctor_avatar?: string | null;
};

export default function ReceptionMobilePage() {
  const [active, setActive] = useState("overview");
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    boot();
  }, []);

  async function boot() {
    try {
      setLoading(true);
      setMessage("");

      const p = await getMobileProfile();
      if (!p) return;
      if (String(p.role).toLowerCase() !== "reception") {
        window.location.href = "/mobile/dashboard";
        return;
      }

      setProfile(p);
      const signedAvatar = await signStorage("profile-images", p.avatar_path);
      setAvatarUrl(signedAvatar ? `${signedAvatar}${signedAvatar.includes("?") ? "&" : "?"}v=${Date.now()}` : null);

      const supabase = createClient();
      const [referralRes, doctorRes, peopleRes] = await Promise.all([
        supabase
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
            attachment_name,
            attachment_path,
            departments(id, name),
            doctors(id, full_name, specialty, phone, card_no, user_id)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("doctors")
          .select("id, full_name, specialty, phone, card_no, user_id, is_active")
          .order("full_name"),
        supabase
          .from("profiles")
          .select("id, full_name, role, avatar_path")
          .in("role", ["doctor", "admin", "reception", "accountant"]),
      ]);

      if (referralRes.error) throw referralRes.error;
      if (doctorRes.error) throw doctorRes.error;
      if (peopleRes.error) throw peopleRes.error;

      const doctorRows = doctorRes.data || [];
      const peopleRows = peopleRes.data || [];
      setDoctors(doctorRows);
      setPeople(peopleRows);

      const enriched = await Promise.all(
        ((referralRes.data || []) as Referral[]).map(async (r) => {
          const doctor = doctorRows.find((d: any) => String(d.id) === String(r.doctors?.id));
          const avatarPath = getDoctorAvatarPath(doctor, peopleRows);
          const doctorAvatar = await signStorage("profile-images", avatarPath);
          return { ...r, doctor_avatar: doctorAvatar };
        })
      );

      setReferrals(enriched);
    } catch (error: any) {
      setMessage(error?.message || "تعذر تحميل صفحة الاستقبال.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmArrival(referralId: string) {
    try {
      setBusyId(referralId);
      setMessage("");
      const supabase = createClient();

      const { error } = await supabase.rpc("confirm_referral_arrival", { p_referral_id: referralId });
      if (error) throw error;

      setMessage("تم تأكيد وصول المريض بنجاح.");
      await boot();
    } catch (error: any) {
      setMessage(error?.message || "تعذر تأكيد وصول المريض.");
    } finally {
      setBusyId(null);
    }
  }

  const visibleReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const doctorOk = selectedDoctor === "all" || String(r.doctors?.id) === String(selectedDoctor);
      const statusOk = statusFilter === "all" || r.status === statusFilter;
      return doctorOk && statusOk;
    });
  }, [referrals, selectedDoctor, statusFilter]);

  const pendingCount = referrals.filter((r) => r.status === "pending").length;
  const arrivedCount = referrals.filter((r) => r.status === "arrived").length;
  const todayCount = referrals.filter((r) => {
    const d = new Date(r.referral_date || r.created_at || "");
    if (Number.isNaN(d.getTime())) return false;
    return d.toDateString() === new Date().toDateString();
  }).length;

  if (loading || !profile) return <MobileLoading text="جاري تحميل صفحة الاستقبال..." />;

  return (
    <MobileShell
      title="الاستقبال"
      profile={profile}
      tabs={[
        { key: "overview", label: "الرئيسية", icon: <Home size={18} /> },
        { key: "queue", label: "قائمة الاستقبال", icon: <ClipboardList size={18} /> },
        { key: "profile", label: "البروفايل", icon: <UserRound size={18} /> },
      ]}
      active={active}
      onTabChange={setActive}
      avatarUrl={avatarUrl}
    >
      {message && <Notice message={message} danger={message.includes("تعذر")} />}

      {active === "overview" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <MobileStatCard label="كل الإحالات" value={referrals.length} icon={<FileText size={18} />} />
            <MobileStatCard label="معلقة" value={pendingCount} icon={<Clock size={18} />} tone="orange" />
            <MobileStatCard label="وصلت" value={arrivedCount} icon={<CheckCircle2 size={18} />} tone="blue" />
            <MobileStatCard label="اليوم" value={todayCount} icon={<UserCheck size={18} />} tone="purple" />
          </div>

          <MobilePanel title="آخر الإحالات" subtitle="بدون مخططات مكررة، فقط الحالات المهمة للاستقبال">
            {referrals.slice(0, 6).map((r) => (
              <ReceptionReferralCard key={r.id} referral={r} busy={busyId === r.id} onConfirm={confirmArrival} />
            ))}
            {!referrals.length && <MobileEmpty text="لا توجد إحالات." />}
          </MobilePanel>
        </>
      )}

      {active === "queue" && (
        <MobilePanel title="قائمة الاستقبال" subtitle="تصفية حسب الطبيب والحالة مع عرض بروفايل الطبيب داخل كل إحالة">
          <div className="mb-3 grid gap-2">
            <MobileSelect value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
              <option value="all">كل الأطباء</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </MobileSelect>

            <MobileSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="pending">معلقة</option>
              <option value="arrived">وصلت</option>
              <option value="completed">مكتملة</option>
              <option value="cancelled">ملغاة</option>
            </MobileSelect>
          </div>

          {visibleReferrals.map((r) => (
            <ReceptionReferralCard key={r.id} referral={r} busy={busyId === r.id} onConfirm={confirmArrival} />
          ))}
          {!visibleReferrals.length && <MobileEmpty text="لا توجد إحالات مطابقة." />}
        </MobilePanel>
      )}

      {active === "profile" && <MobileProfile profile={profile} onUpdated={boot} />}
    </MobileShell>
  );
}

function ReceptionReferralCard({ referral, busy, onConfirm }: { referral: Referral; busy: boolean; onConfirm: (id: string) => void }) {
  const doctorName = referral.doctors?.full_name || "طبيب غير محدد";

  return (
    <MobileInfoCard
      title={referral.patient_name}
      subtitle={referral.diagnosis || "لا يوجد تشخيص"}
      avatar={<MobileAvatar url={referral.doctor_avatar} name={doctorName} size="sm" />}
      status={<MobileStatus value={referral.status} />}
      meta={[
        { label: "القسم", value: referral.departments?.name },
        { label: "العمر", value: referral.patient_age ? `${referral.patient_age} سنة` : "-" },
        { label: "الأولوية", value: priorityLabel(referral.priority) },
        { label: "تاريخ الإرسال", value: safeDate(referral.referral_date || referral.created_at) },
        { label: "تاريخ الاستقبال", value: safeDate(referral.arrived_at) },
        { label: "التشخيص", value: referral.diagnosis || "-", wide: true },
      ]}
      footer={
        <div className="space-y-3">
          <DoctorMiniProfile referral={referral} />
          <MobileAttachmentButton path={referral.attachment_path} name={referral.attachment_name} />
          {referral.status === "pending" ? (
            <button
              type="button"
              onClick={() => onConfirm(referral.id)}
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0f8f7d] text-xs font-black text-white disabled:opacity-60"
            >
              <CheckCircle2 size={16} /> {busy ? "جاري التأكيد..." : "تأكيد وصول المريض"}
            </button>
          ) : (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-xs font-black text-emerald-700">تم التعامل مع الحالة</div>
          )}
        </div>
      }
    />
  );
}

function DoctorMiniProfile({ referral }: { referral: Referral }) {
  const d = referral.doctors;
  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-800">
        <Stethoscope size={15} className="text-[#0f8f7d]" /> بروفايل الطبيب
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500">
        <span>الاسم: <b className="text-slate-800">{d?.full_name || "-"}</b></span>
        <span>التخصص: <b className="text-slate-800">{d?.specialty || "-"}</b></span>
        <span>الهاتف: <b className="text-slate-800">{d?.phone || "-"}</b></span>
        <span>رقم الكرت: <b className="text-slate-800">{d?.card_no || "-"}</b></span>
      </div>
    </div>
  );
}
