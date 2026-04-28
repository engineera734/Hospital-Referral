"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import ProfileDrawer from "../ui/profile-drawer";
import { signProfileImage } from "../lazy-dashboard/client";
import type { Profile } from "../lazy-dashboard/types";
import {
  TrendingUp, Users, Upload, Handshake, Building2, DollarSign,
  Search, Bell, Settings, ChevronDown, Star
} from "lucide-react";

const navItems = [
  { key: "overview", label: "نظرة عامة", icon: TrendingUp },
  { key: "patients", label: "التحويلات", icon: Users },
  { key: "reports", label: "التقارير", icon: Upload },
  { key: "doctors", label: "الأطباء", icon: Handshake },
  { key: "staff", label: "الموظفون", icon: Building2 },
  { key: "settlements", label: "تصفية المستحقات", icon: DollarSign },
];

export default function AdminShell({
  active,
  setActive,
  profile,
  message,
  children,
}: {
  active: string;
  setActive: (key: string) => void;
  profile: Profile;
  message?: string;
  children: React.ReactNode;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    signProfileImage(profile.avatar_path).then(setAvatarUrl);
  }, [profile.avatar_path]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function uploadAvatar(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("userId", profile.id);
    const res = await fetch("/api/profile/upload-avatar", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    setUploadMessage(res.ok ? "تم تحديث الصورة الشخصية." : (json.error || "تعذر رفع الصورة."));
    if (res.ok) setAvatarUrl(await signProfileImage(json.path || profile.avatar_path));
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <aside className="fixed right-0 top-0 z-50 h-full w-64 border-l border-border bg-sidebar">
        <div className="border-b border-border p-6">
          <div className="mb-1 flex items-center justify-center gap-2">
            <Star className="text-blue-400" size={28} />
          </div>
          <h1 className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-center text-xl font-bold text-transparent">
            الإدارة
          </h1>
          <p className="mt-1 text-center text-xs text-gray-500">لوحة التحكم الرئيسية</p>
        </div>

        <nav className="mt-4">
          {navItems.map((item) => (
            <a
              key={item.key}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActive(item.key);
              }}
              className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 ${
                active === item.key
                  ? "border-r-2 border-blue-500 bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
              }`}
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full border-t border-border p-4">
          <button onClick={handleLogout} className="w-full py-2 text-center text-sm text-gray-500 transition-colors hover:text-red-400">
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="mr-64 p-6">
        <header className="mb-8 flex items-center justify-between">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-500" size={18} />
            <input
              type="text"
              placeholder="بحث..."
              className="w-96 rounded-xl border border-border bg-card-bg py-2.5 pl-4 pr-10 text-right text-gray-300 transition-all focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-5">
            <button className="relative text-gray-400 transition-colors hover:text-white">
              <Bell size={20} />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <button className="text-gray-400 transition-colors hover:text-white">
              <Settings size={20} />
            </button>

            <div className="flex cursor-pointer items-center gap-2" onClick={() => setProfileOpen(true)}>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-emerald-600 ring-2 ring-blue-500/30">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile.full_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">{profile.full_name.slice(0, 1)}</span>
                )}
              </div>
              <div className="hidden text-right md:block">
                <p className="text-sm font-medium text-white">{profile.full_name}</p>
                <p className="text-xs text-gray-500">مدير</p>
              </div>
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>
        </header>

        {message && (
          <div className="mb-6 rounded-xl border-r-4 border-blue-500 bg-blue-500/10 px-5 py-4 text-right text-sm text-blue-300">
            <span className="font-semibold">ℹ️</span> {message}
          </div>
        )}

        {children}
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
    </div>
  );
}
