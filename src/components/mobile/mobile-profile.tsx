"use client";

import { useEffect, useState } from "react";
import { Camera, Mail, Phone, Shield, UserRound } from "lucide-react";
import { MobilePanel, MobileAvatar } from "./mobile-cards";
import { signStorage, uploadProfileAvatar } from "./mobile-api";

export default function MobileProfile({ profile, onUpdated }: any) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    signStorage("profile-images", profile?.avatar_path).then((signedUrl) => {
      setUrl(signedUrl ? `${signedUrl}${signedUrl.includes("?") ? "&" : "?"}v=${Date.now()}` : null);
    });
  }, [profile?.avatar_path]);

  async function changeAvatar(file?: File | null) {
    if (!file || !profile?.id) return;
    setBusy(true);
    setMessage("");

    const localPreview = URL.createObjectURL(file);
    setUrl(localPreview);

    try {
      const result = await uploadProfileAvatar(profile.id, file);
      const newPath = result?.avatar_path || result?.path || profile?.avatar_path;
      const signedUrl = await signStorage("profile-images", newPath);
      if (signedUrl) setUrl(`${signedUrl}${signedUrl.includes("?") ? "&" : "?"}v=${Date.now()}`);
      setMessage("تم تحديث الصورة.");
      await onUpdated?.();
    } catch (e: any) {
      setMessage(e?.message || "تعذر تحديث الصورة.");
    } finally {
      setBusy(false);
      setTimeout(() => URL.revokeObjectURL(localPreview), 2000);
    }
  }

  return (
    <MobilePanel title="البروفايل" subtitle="اضغط على الصورة لتحديثها من الهاتف">
      <div className="mb-4 flex items-center gap-3 rounded-[1.5rem] bg-slate-50 p-4">
        <label className="relative cursor-pointer">
          <MobileAvatar url={url} name={profile?.full_name} size="lg" />
          <span className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0f8f7d] shadow">
            <Camera size={15} />
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => changeAvatar(e.target.files?.[0])} />
        </label>
        <div>
          <p className="text-base font-black text-slate-900">{profile?.full_name || "-"}</p>
          <p className="text-xs font-bold text-slate-400">{profile?.role || "-"}</p>
          {busy && <p className="mt-1 text-[11px] font-bold text-[#0f8f7d]">جاري الرفع...</p>}
        </div>
      </div>

      {message && <p className="mb-3 rounded-2xl bg-teal-50 px-4 py-3 text-xs font-black text-[#0f8f7d]">{message}</p>}

      <div className="space-y-2">
        <Row icon={<Mail size={18} />} label="البريد" value={profile?.username || "-"} />
        <Row icon={<Phone size={18} />} label="الهاتف" value={profile?.phone || "-"} />
        <Row icon={<Shield size={18} />} label="الهوية" value={profile?.national_id || "-"} />
        <Row icon={<UserRound size={18} />} label="الحالة" value={profile?.is_active === false ? "غير نشط" : "نشط"} />
      </div>
    </MobilePanel>
  );
}

function Row({ icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-black">{label}</span>
      </div>
      <span className="max-w-[170px] truncate text-left text-xs font-black text-slate-800" dir="ltr">
        {value}
      </span>
    </div>
  );
}
