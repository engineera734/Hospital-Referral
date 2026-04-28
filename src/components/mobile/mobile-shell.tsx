"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Download, Image as ImageIcon, MoreVertical } from "lucide-react";
import { downloadStorageFile } from "./mobile-api";

export function MobileStatCard({ label, value, icon, tone = "teal", sub }: any) {
  const tones: any = {
    teal: "from-[#0f8f7d] to-[#0b6f62]",
    blue: "from-blue-600 to-blue-800",
    orange: "from-amber-500 to-orange-600",
    purple: "from-purple-600 to-purple-800",
    slate: "from-slate-700 to-slate-900",
    rose: "from-rose-500 to-red-700",
    emerald: "from-emerald-600 to-emerald-800",
  };

  return (
    <div className={`relative overflow-hidden rounded-[1.55rem] bg-gradient-to-br ${tones[tone] || tones.teal} p-4 text-white shadow-lg`}>
      <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white/75">{label}</p>
          <div className="mt-1 break-words text-2xl font-black">{value}</div>
          {sub && <div className="mt-1 text-[10px] font-bold text-white/70">{sub}</div>}
        </div>
        {icon && <div className="shrink-0 rounded-2xl bg-white/15 p-2">{icon}</div>}
      </div>
    </div>
  );
}

export function MobilePanel({ title, subtitle, children, action }: any) {
  return (
    <section className="mb-4 rounded-[1.75rem] bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          {subtitle && <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MobileAvatar({ url, name, size = "md" }: any) {
  const cls = size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-10 w-10 text-sm" : "h-12 w-12 text-base";
  return (
    <div className={`${cls} shrink-0 overflow-hidden rounded-2xl bg-[#0f8f7d] text-white shadow-sm`}>
      {url ? (
        <img src={url} alt={name || "avatar"} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-black">{String(name || "م").slice(0, 1)}</div>
      )}
    </div>
  );
}

export function MobileInfoCard({ title, subtitle, meta, status, footer, avatar, children, actions }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  useEffect(() => {
    function handleScroll() {
      setMenuOpen(false);
    }
    if (menuOpen) {
      window.addEventListener("scroll", handleScroll, true);
      return () => window.removeEventListener("scroll", handleScroll, true);
    }
  }, [menuOpen]);

  return (
    <article className="mb-3 rounded-[1.35rem] border border-slate-100 bg-slate-50 p-4 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {avatar}
          <div className="min-w-0">
            <h4 className="truncate text-sm font-black text-slate-900">{title}</h4>
            {subtitle && <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {status}
          {actions && actions.length > 0 && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-slate-200 transition-colors shadow-sm"
                aria-label="خيارات"
              >
                <MoreVertical size={14} className="text-slate-500" />
              </button>

              {menuOpen && (
                <>
                  {/* طبقة داكنة شفافة تغطي الشاشة - تظهر القائمة بالمنتصف */}
                  <div
                    className="fixed inset-0 z-[9998] bg-black/30 flex items-center justify-center p-6"
                    onClick={() => setMenuOpen(false)}
                  >
                    {/* القائمة تظهر في المنتصف */}
                    <div
                      className="relative z-[9999] w-full max-w-[280px] rounded-2xl bg-white shadow-2xl border border-slate-200 py-2 overflow-hidden animate-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                      }}
                    >
                      {/* رأس القائمة */}
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-black text-slate-400">خيارات</p>
                      </div>

                      {/* خيارات القائمة */}
                      {actions.map((action: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            action.onClick?.();
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-bold transition-colors text-right ${
                            action.danger
                              ? "text-red-600 hover:bg-red-50"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {action.icon && <span className="shrink-0">{action.icon}</span>}
                          <span>{action.label}</span>
                        </button>
                      ))}

                      {/* زر إلغاء */}
                      <div className="px-3 pt-1 pb-2">
                        <button
                          type="button"
                          onClick={() => setMenuOpen(false)}
                          className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {meta?.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {meta.map((m: any) => (
            <div key={m.label} className={`rounded-2xl bg-white px-3 py-2 ${m.wide ? "col-span-2" : ""}`}>
              <p className="text-[10px] font-black text-slate-400">{m.label}</p>
              <p className="mt-1 break-words text-xs font-black text-slate-700">{m.value || "-"}</p>
            </div>
          ))}
        </div>
      ) : null}

      {children}
      {footer && <div className="mt-3">{footer}</div>}
    </article>
  );
}

export function MobileAttachmentButton({ bucket = "referral-files", path, name, url }: any) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!path && !url) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 py-3 text-xs font-black text-slate-400">
        <ImageIcon size={16} /> لا يوجد مرفق
      </div>
    );
  }

  async function handleDownload() {
    try {
      setBusy(true);
      setMessage("");

      if (path) {
        await downloadStorageFile(bucket, path, name);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("تعذر تنزيل المرفق.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name || "attachment";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      setMessage(error?.message || "تعذر تنزيل المرفق.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f8f7d] px-3 py-3 text-xs font-black text-white disabled:opacity-60"
      >
        <Download size={16} /> {busy ? "جاري التنزيل..." : `تنزيل المرفق${name ? ` (${name})` : ""}`}
      </button>
      {message && <p className="rounded-2xl bg-red-50 px-3 py-2 text-center text-[11px] font-black text-red-600">{message}</p>}
    </div>
  );
}

export function MobileStatus({ value }: { value: string }) {
  const styles: any = {
    pending: "bg-amber-50 text-amber-700",
    arrived: "bg-emerald-50 text-emerald-700",
    completed: "bg-blue-50 text-blue-700",
    cancelled: "bg-red-50 text-red-700",
  };
  const labels: any = { pending: "معلقة", arrived: "وصل", completed: "مكتملة", cancelled: "ملغاة" };
  return <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${styles[value] || "bg-slate-100 text-slate-600"}`}>{labels[value] || value || "-"}</span>;
}

export const MobileEmpty = ({ text = "لا توجد بيانات." }: any) => (
  <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-400">{text}</p>
);

export function MobileInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-12 w-full rounded-2xl bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none ${props.className || ""}`} />;
}

export function MobileSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-12 w-full rounded-2xl bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none ${props.className || ""}`} />;
}

export function MobileTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-24 w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none ${props.className || ""}`} />;
}