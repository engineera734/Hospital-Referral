import { createClient } from "../../lib/supabase/client";

export async function authFetch(url: string, init?: RequestInit) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    window.location.href = "/login";
    throw new Error("انتهت الجلسة، سجل الدخول مرة أخرى.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const res = await fetch(url, { ...init, headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "تعذر تحميل البيانات.");
  }

  return json;
}

export async function signProfileImage(path?: string | null) {
  if (!path) return null;
  const res = await fetch("/api/storage/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket: "profile-images", path }),
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? (json.url as string) : null;
}
