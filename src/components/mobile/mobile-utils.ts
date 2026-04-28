import { createClient } from "../../lib/supabase/client";

export async function mobileAuthFetch(path: string, init: RequestInit = {}) {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) { window.location.href = "/mobile/login"; throw new Error("Unauthorized"); }
  const res = await fetch(path, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { message: text }; }
  if (!res.ok) throw new Error(json?.error || json?.message || "تعذر تنفيذ الطلب.");
  return json;
}
export async function getMobileProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { window.location.href = "/mobile/login"; return null; }
  const { data, error } = await supabase.from("profiles").select("id, full_name, username, role, phone, national_id, avatar_path, is_active").eq("id", user.id).maybeSingle();
  if (error || !data) { window.location.href = "/mobile/login"; return null; }
  return data as any;
}
export async function logoutMobile() { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = "/mobile/login"; }
export async function signStorageUrl(bucket: string, path?: string | null) {
  if (!path) return "";
  try { const json = await mobileAuthFetch("/api/storage/sign", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ bucket, path }) }); return String(json.url || ""); } catch { return ""; }
}
export async function uploadAvatar(userId: string, file: File) {
  const form = new FormData(); form.append("userId", userId); form.append("file", file);
  const res = await fetch("/api/profile/upload-avatar", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "تعذر تحديث صورة البروفايل.");
  return json;
}
export function money(value: any) { return `${Number(value || 0).toLocaleString("ar-YE")} ر.ي`; }
export function safeDate(value?: string | null) { if (!value) return "-"; const d = new Date(value); if (Number.isNaN(d.getTime())) return String(value).slice(0, 10); return d.toLocaleDateString("ar-YE", { year:"numeric", month:"2-digit", day:"2-digit" }); }
export function monthNo(value?: string | null) { if (!value) return 0; const d = new Date(value); return Number.isNaN(d.getTime()) ? 0 : d.getMonth() + 1; }
export function statusText(status?: string | null) { const map: Record<string,string> = { pending:"منتظر", arrived:"تم الاستقبال", completed:"مكتمل", cancelled:"ملغي" }; return map[String(status || "")] || status || "-"; }
export function cleanText(v: string, max = 180) { return String(v || "").replace(/[<>]/g, "").trim().slice(0, max); }
export function getPersonName(id: string | null | undefined, people: any[] = []) { if (!id) return "-"; return people.find((p) => String(p.id) === String(id))?.full_name || "-"; }
export function rateFor(rateMap: Map<string, number>, referral: any) { const doctorId = referral?.doctors?.id || referral?.doctor_id; const depId = referral?.departments?.id || referral?.department_id; return rateMap.get(`${doctorId}:${depId}`) || 0; }
export function getDoctorAvatarPath(doctor: any, people: any[] = []) { return people.find((p) => p.id === doctor?.user_id)?.avatar_path || null; }
export async function downloadUrlToDevice(url: string, filename = "download") {
  if (!url) return;
  try { const res = await fetch(url); const blob = await res.blob(); const objectUrl = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = objectUrl; a.download = filename || "download"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(objectUrl); }
  catch { const a = document.createElement("a"); a.href = url; a.download = filename || "download"; a.rel = "noopener"; a.click(); }
}
export function downloadTextToDevice(filename: string, text: string, type = "text/html;charset=utf-8") { const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
