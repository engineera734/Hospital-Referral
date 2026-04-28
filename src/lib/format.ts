export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${formatDate(value)} ${hh}:${mm}`;
}

export function formatMoney(value?: number | null) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("en-US")} ريال`;
}

export function monthNumber(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getMonth() + 1;
}

const departmentMap: Record<string, string> = {
  "Internal Medicine": "الباطنية",
  "Surgery": "الجراحة",
  "Orthopedics": "العظام",
  "Neurology": "الأعصاب",
  "Pediatrics": "الأطفال",
  "Cardiology": "القلب",
  "Ultrasound": "الأشعة الصوتية",
  "Laboratory": "المختبرات",
  "Laboratories": "المختبرات",
  "باطنية": "الباطنية",
  "جراحة": "الجراحة",
  "عظام": "العظام",
  "أعصاب": "الأعصاب",
  "أطفال": "الأطفال",
  "قلب": "القلب",
  "الكشافة": "الكشافة",
  "مختبرات": "المختبرات",
  "الأشعة الصوتية": "الأشعة الصوتية"
};



export function formatDepartment(name?: string | null) {
  if (!name) return "غير محدد";
  return departmentMap[name] || name;
}
