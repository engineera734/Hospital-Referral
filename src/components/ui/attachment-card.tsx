"use client";

type AttachmentCardProps = { fileName: string; onOpen?: () => void; compact?: boolean };

export default function AttachmentCard({ fileName, onOpen, compact = false }: AttachmentCardProps) {
  return (
    <div
      onClick={onOpen}
      className={`group cursor-pointer rounded-xl border border-slate-200 bg-white/90 shadow-md transition-all duration-200 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-white hover:shadow-lg ${
        compact ? "p-3" : "p-4"
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen?.();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 text-right">
          <p className="text-xs font-bold tracking-wider text-blue-600 uppercase">المرفق</p>
          <p className="mt-2 text-sm font-semibold text-slate-800 break-all group-hover:text-blue-700 transition-colors">
            {fileName}
          </p>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1 justify-end">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            اضغط لتنزيل الملف
          </p>
        </div>
        <div className="text-3xl text-slate-400 group-hover:text-blue-500 transition-colors">
          📎
        </div>
      </div>
    </div>
  );
}