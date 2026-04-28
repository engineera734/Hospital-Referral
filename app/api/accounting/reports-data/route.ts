import { NextResponse } from "next/server";
import { requireRole } from "../../_shared/auth-role";

export async function GET(req: Request) {
  try {
    const result = await requireRole(req, ["accountant", "admin"]);
    if ("error" in result) return result.error;

    const [doctorRes, departmentRes] = await Promise.all([
      result.admin.from("doctors").select("id, full_name").order("full_name"),
      result.admin.from("departments").select("id, name, code").order("name"),
    ]);

    return NextResponse.json({
      doctors: doctorRes.data ?? [],
      departments: departmentRes.data ?? [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = await requireRole(req, ["accountant", "admin"]);
    if ("error" in result) return result.error;

    const filter = await req.json().catch(() => ({}));
    const { data, error } = await result.admin
      .from("referrals")
      .select("patient_name, status, referral_date, created_at, arrived_at, doctors(id, full_name), departments(id,name)")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = (data || []).map((row: any) => `
      <tr>
        <td>${row.patient_name || "-"}</td>
        <td>${row.doctors?.full_name || "-"}</td>
        <td>${row.departments?.name || "-"}</td>
        <td>${row.status || "-"}</td>
        <td>${row.referral_date || row.created_at || "-"}</td>
      </tr>
    `).join("");

    const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>تقرير المحاسبة</title>
<style>
body{font-family:Arial;padding:24px;color:#0f172a;direction:rtl}
table{width:100%;border-collapse:collapse;margin:18px 0}
th,td{border:1px solid #cbd5e1;padding:8px;text-align:right;font-size:12px}
th{background:#eff6ff}
</style>
</head>
<body>
<h1>تقرير المحاسبة</h1>
<p>السنة: ${filter.year || "-"}</p>
<table>
<thead><tr><th>المريض</th><th>الطبيب</th><th>القسم</th><th>الحالة</th><th>التاريخ</th></tr></thead>
<tbody>${rows || `<tr><td colspan="5">لا توجد بيانات</td></tr>`}</tbody>
</table>
</body>
</html>`;

    return NextResponse.json({ html });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error." }, { status: 500 });
  }
}
