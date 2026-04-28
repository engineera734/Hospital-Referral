"use client";

const variants = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "منتظر",
  },
  arrived: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "تم الوصول",
  },
  completed: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
    label: "مكتمل",
  },
  archived: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    label: "مؤرشف",
  },
  urgent: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "طارئ",
  },
  normal: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    dot: "bg-slate-400",
    label: "عادي",
  },
};

type BadgeVariant = keyof typeof variants;

export function Badge({ variant, children }: { variant: BadgeVariant; children?: React.ReactNode }) {
  const style = variants[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {children || style.label}
    </span>
  );
}