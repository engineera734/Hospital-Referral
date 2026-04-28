"use client";

import { ReactNode, useState } from "react";
import {
  BarChart3,
  FileText,
  Home,
  LogOut,
  Menu,
  Stethoscope,
  Users,
  Wallet,
  X,
  ClipboardList,
  UserRound,
} from "lucide-react";
import { logoutMobile } from "./mobile-utils";
import ProfilePanel from "./profile-panel";

export type MobileTab = { key: string; label: string; icon: ReactNode };

export function tabsForRole(role: string): MobileTab[] {
  const r = String(role || "").toLowerCase();

  if (r === "admin")
    return [
      { key: "overview", label: "الرئيسية", icon: <Home size={18} /> },
      { key: "referrals", label: "الإحالات", icon: <FileText size={18} /> },
      { key: "doctors", label: "الأطباء", icon: <Stethoscope size={18} /> },
      { key: "staff", label: "الموظفون", icon: <Users size={18} /> },
      { key: "settlements", label: "المستحقات", icon: <Wallet size={18} /> },
      { key: "reports", label: "التقارير", icon: <BarChart3 size={18} /> },
    ];

  if (r === "accountant")
    return [
      { key: "overview", label: "الرئيسية", icon: <BarChart3 size={18} /> },
      { key: "profits", label: "المستحقات", icon: <Wallet size={18} /> },
      { key: "reports", label: "التقارير", icon: <FileText size={18} /> },
    ];

  if (r === "doctor")
    return [
      { key: "overview", label: "الرئيسية", icon: <Home size={18} /> },
      { key: "create", label: "إحالة", icon: <Stethoscope size={18} /> },
      { key: "referrals", label: "إحالاتي", icon: <FileText size={18} /> },
    ];

  if (r === "reception")
    return [
      { key: "overview", label: "الرئيسية", icon: <Home size={18} /> },
      { key: "arrivals", label: "الوصول", icon: <ClipboardList size={18} /> },
      { key: "charts", label: "المخططات", icon: <BarChart3 size={18} /> },
    ];

  return [{ key: "overview", label: "الرئيسية", icon: <Home size={18} /> }];
}

const roleName: any = {
  admin: "مدير النظام",
  doctor: "طبيب",
  reception: "الاستقبال",
  accountant: "المحاسبة",
};

export default function MobileShell({
  title,
  profile,
  children,
  tabs,
  active,
  onTabChange,
  avatarUrl,
  onReload,
}: any) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = String(profile?.role || "").toLowerCase();

  function choose(key: string) {
    onTabChange(key);
    setOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7f8] text-slate-900" dir="rtl">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[430px] items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50"
          >
            <Menu size={20} />
          </button>

          <div className="text-center">
            <p className="text-[11px] font-bold text-[#0f8f7d]">
              إحالات مستشفى الرفاعي
            </p>
            <h1 className="text-base font-black">{title}</h1>
          </div>

          <button
            onClick={() => setProfileOpen(true)}
            className="h-10 w-10 overflow-hidden rounded-2xl bg-[#0f8f7d] text-white"
          >
            {avatarUrl ? (
              <img src={avatarUrl} className="h-full w-full object-cover" />
            ) : (
              String(profile?.full_name || "م").slice(0, 1)
            )}
          </button>
        </div>
      </header>

      {/* ✅ MODAL MENU بدل SIDEBAR */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <button
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-[92%] max-w-sm rounded-[2rem] bg-white p-5 shadow-2xl animate-[fadeIn_.25s_ease]">
            {/* HEADER */}
            <div className="mb-5 flex items-center justify-between">
              <button
                onClick={() => {
                  setOpen(false);
                  setProfileOpen(true);
                }}
                className="flex items-center gap-3"
              >
                <div className="h-12 w-12 overflow-hidden rounded-2xl bg-[#0f8f7d] text-white">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-black">
                      {String(profile?.full_name || "م").slice(0, 1)}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-black">
                    {profile?.full_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {roleName[role] || "مستخدم"}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-100 p-2"
              >
                <X size={18} />
              </button>
            </div>

            {/* TABS */}
            <nav className="space-y-2">
              {tabs.map((item: any) => (
                <button
                  key={item.key}
                  onClick={() => choose(item.key)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black ${
                    active === item.key
                      ? "bg-[#0f8f7d] text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}

              <button
                onClick={() => {
                  setOpen(false);
                  setProfileOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black"
              >
                <UserRound size={18} /> البروفايل
              </button>
            </nav>

            {/* LOGOUT */}
            <button
              onClick={logoutMobile}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-600"
            >
              <LogOut size={18} /> تسجيل الخروج
            </button>
          </div>
        </div>
      )}

      {/* PROFILE PANEL */}
      {profileOpen && (
        <div className="fixed inset-0 z-[70]">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setProfileOpen(false)}
          />
          <section className="absolute bottom-0 left-0 right-0 mx-auto max-h-[88vh] max-w-[430px] overflow-y-auto rounded-t-[2rem] bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200" />
            <ProfilePanel
              profile={profile}
              avatarUrl={avatarUrl}
              onUpdated={onReload}
            />
          </section>
        </div>
      )}

      {/* CONTENT */}
      <section className="mx-auto max-w-[430px] px-4 pb-28 pt-4">
        <div className="mb-4 rounded-[1.75rem] bg-gradient-to-br from-[#0f8f7d] to-[#0b6f62] p-5 text-white">
          <p className="text-xs">مرحبًا</p>
          <h2 className="text-xl font-black">
            {profile?.full_name || "مستخدم"}
          </h2>
          <p className="text-xs">{roleName[role]}</p>
        </div>

        {children}
      </section>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white px-2 py-2 border-t">
        <div className="mx-auto flex max-w-[430px] justify-around">
          {tabs.slice(0, 5).map((item: any) => (
            <button
              key={item.key}
              onClick={() => choose(item.key)}
              className={`flex flex-col items-center text-[10px] ${
                active === item.key
                  ? "text-[#0f8f7d]"
                  : "text-slate-400"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

/* LOADING */
export function MobileLoading({ text = "جاري تحميل البيانات..." }: any) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f8]" dir="rtl">
      <div className="rounded-[2rem] bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#0f8f7d] border-t-transparent" />
        <p className="text-sm font-bold text-slate-500">{text}</p>
      </div>
    </main>
  );
}

/* NOTICE */
export function Notice({ message, danger = false }: any) {
  return (
    <div
      className={`mb-4 rounded-2xl px-4 py-3 text-sm font-bold ${
        danger ? "bg-red-50 text-red-600" : "bg-teal-50 text-[#0f8f7d]"
      }`}
    >
      {message}
    </div>
  );
}