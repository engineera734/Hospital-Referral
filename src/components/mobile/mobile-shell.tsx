"use client";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Home, LogOut, Menu, X } from "lucide-react";
import { createClient } from "../../../src/lib/supabase/client";

type TabItem = {
  key: string;
  label: string;
  icon?: ReactNode;
};

type MobileShellProps = {
  title: string;
  profile?: any;
  tabs: TabItem[];
  active: string;
  onTabChange: (key: string) => void;
  avatarUrl?: string | null;
  children: ReactNode;
};

function firstLetter(name?: string | null) {
  return String(name || "م").trim().slice(0, 1) || "م";
}

function uniqueTabs(tabs: TabItem[]) {
  const seen = new Set<string>();
  return tabs.filter((tab) => {
    if (!tab?.key || seen.has(tab.key)) return false;
    seen.add(tab.key);
    return true;
  });
}

export function MobileLoading({ text = "جاري التحميل..." }: { text?: string }) {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
        <div className="w-full rounded-[2rem] bg-white p-6 text-center shadow-[0_16px_45px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-[#0f8f7d]" />
          <p className="text-sm font-black text-slate-600">{text}</p>
        </div>
      </div>
    </main>
  );
}

export function Notice({ message, danger = false }: { message: string; danger?: boolean }) {
  return (
    <div
      className={`mb-4 rounded-[1.35rem] px-4 py-3 text-center text-xs font-black leading-6 ${
        danger ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {message}
    </div>
  );
}

export default function MobileShell({
  title,
  profile,
  tabs,
  active,
  onTabChange,
  avatarUrl,
  children,
}: MobileShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cleanTabs = useMemo(() => uniqueTabs(tabs), [tabs]);
  const activeTab = cleanTabs.find((tab) => tab.key === active) || cleanTabs[0];

  useEffect(() => {
    document.documentElement.dir = "rtl";
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/mobile/login";
  }

  function changeTab(key: string) {
    onTabChange(key);
    setMenuOpen(false);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 pb-24 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"
            aria-label="فتح القائمة"
          >
            <Menu size={21} />
          </button>

          <div className="min-w-0 text-center">
            <h1 className="truncate text-sm font-black text-slate-900">{title}</h1>
            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">{activeTab?.label || "الرئيسية"}</p>
          </div>

          <div className="h-11 w-11 overflow-hidden rounded-2xl bg-[#0f8f7d] text-white shadow-sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile?.full_name || "avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-black">
                {firstLetter(profile?.full_name)}
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 py-4">{children}</section>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 py-2">
          {cleanTabs.slice(0, 4).map((tab) => {
            const selected = tab.key === active;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeTab(tab.key)}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition ${
                  selected ? "bg-emerald-50 text-[#0f8f7d]" : "text-slate-400"
                }`}
              >
                {tab.icon || <Home size={18} />}
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm">
          <div className="w-full max-w-[330px] rounded-[2rem] bg-white p-4 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"
                aria-label="إغلاق"
              >
                <X size={21} />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-sm font-black text-slate-900">{profile?.full_name || "المستخدم"}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{profile?.role === "doctor" ? "طبيب" : profile?.role || "حساب"}</p>
              </div>

              <div className="h-12 w-12 overflow-hidden rounded-2xl bg-[#0f8f7d] text-white">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-black">
                    {firstLetter(profile?.full_name)}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {cleanTabs.map((tab) => {
                const selected = tab.key === active;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => changeTab(tab.key)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition ${
                      selected ? "bg-[#0f8f7d] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span>{tab.icon}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-600"
              >
                <span>تسجيل الخروج</span>
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
