import { createClient } from "../../lib/supabase/client";

export async function mobileAuthFetch(path: string, init: RequestInit = {}) {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    window.location.href = "/mobile/login";
    throw new Error("Unauthorized");
  }

  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text };
  }

  if (!res.ok) throw new Error(json?.error || json?.message || "تعذر تنفيذ الطلب.");
  return json;
}

export async function getMobileProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "/mobile/login";
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, role, phone, national_id, avatar_path, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    window.location.href = "/mobile/login";
    return null;
  }

  return data as any;
}

export async function mobileLogout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/mobile/login";
}

export async function signStorage(bucket: string, path?: string | null) {
  if (!path) return null;
  try {
    const res = await fetch("/api/storage/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ bucket, path }),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? String(json.url || "") : null;
  } catch {
    return null;
  }
}

export async function downloadStorageFile(bucket: string, path?: string | null, filename?: string | null) {
  if (!path) throw new Error("لا يوجد مرفق للتنزيل.");

  const signedUrl = await signStorage(bucket, path);
  if (!signedUrl) throw new Error("تعذر تجهيز رابط تنزيل المرفق.");

  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("تعذر تنزيل المرفق.");

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename || path.split("/").pop() || "attachment";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function uploadProfileAvatar(userId: string, file: File) {
  const form = new FormData();
  form.append("userId", userId);
  form.append("file", file);

  const res = await fetch("/api/profile/upload-avatar", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "تعذر تحديث الصورة.");
  return json;
}

export function safeDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("ar-YE", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return String(value).slice(0, 10);
  }
}

export function monthNumber(value?: string | null) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getMonth() + 1;
}

export function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    pending: "معلقة",
    arrived: "وصل",
    completed: "مكتملة",
    cancelled: "ملغاة",
  };
  return labels[String(status || "")] || status || "-";
}

export function priorityLabel(priority?: string | null) {
  const labels: Record<string, string> = {
    urgent: "طارئة",
    high: "مستعجلة",
    normal: "عادية",
    low: "منخفضة",
  };
  return labels[String(priority || "")] || priority || "عادية";
}

export function doctorByReferral(referral: any, doctors: any[] = []) {
  return doctors.find((d) => String(d.id) === String(referral?.doctors?.id || referral?.doctor_id));
}

export function getDoctorAvatarPath(doctor: any, people: any[] = []) {
  return people.find((p) => p.id === doctor?.user_id)?.avatar_path || null;
}
