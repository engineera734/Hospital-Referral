"use client";

import { useRef, useState } from "react";

type ProfileDrawerProps = {
  open: boolean;
  name: string;
  email: string;
  roleLabel: string;
  phone?: string | null;
  nationalId?: string | null;
  avatarUrl?: string | null;
  onClose: () => void;
  onUploadAvatar?: (file: File) => Promise<void>;
  uploadMessage?: string;
};

export default function ProfileDrawer({
  open,
  name,
  email,
  roleLabel,
  phone,
  nationalId,
  avatarUrl,
  onClose,
  onUploadAvatar,
  uploadMessage,
}: ProfileDrawerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" dir="rtl">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md transform overflow-y-auto bg-white shadow-2xl transition-transform animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-md"
          >
            إغلاق
          </button>
          <div className="text-right">
            <p className="text-xs font-bold tracking-wider text-blue-600 uppercase">الملف الشخصي</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">بيانات الحساب</h2>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 p-5">
          {/* Avatar Section */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative flex flex-col items-center gap-4">
              <button
                type="button"
                className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-blue-600 text-3xl font-black text-white shadow-xl transition-all hover:scale-105"
                onClick={() => inputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <span>{name.slice(0, 1)}</span>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
              <div className="text-right">
                <p className="text-lg font-black text-slate-900">{name}</p>
                <p className="mt-1 text-sm text-slate-600">{email}</p>
                <p className="mt-1 text-sm font-semibold text-blue-600">{roleLabel}</p>
              </div>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (!file || !onUploadAvatar) return;
              setBusy(true);
              try {
                await onUploadAvatar(file);
              } finally {
                setBusy(false);
                input.value = "";
              }
            }}
          />

          {/* Info Cards */}
          <div className="grid gap-3">
            <InfoCard icon="👤" label="الاسم الكامل" value={name} />
            <InfoCard icon="📧" label="البريد الإلكتروني" value={email} />
            <InfoCard icon="📞" label="الهاتف" value={phone || "-"} />
            <InfoCard icon="🆔" label="الهوية" value={nationalId || "-"} />
          </div>

          {/* Upload Status */}
          <div className="rounded-xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 text-center">
            <p className="text-sm text-slate-600">
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  جارٍ رفع الصورة...
                </span>
              ) : (
                uploadMessage || "اضغط على الصورة الدائرية لاختيار صورة جديدة"
              )}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1 text-right">
          <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">{label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{value}</p>
        </div>
      </div>
    </div>
  );
}