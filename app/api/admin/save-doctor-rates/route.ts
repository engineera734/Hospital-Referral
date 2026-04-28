import { ensureActiveLicense } from "../../_shared/auth-role";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { doctor_id, rates } = body ?? {};
    if (!doctor_id || !Array.isArray(rates)) return NextResponse.json({ error: "بيانات غير مكتملة." }, { status: 400 });
    const supabase = createAdminClient();
    const licenseError = await ensureActiveLicense(supabase);
if (licenseError) return licenseError;
    const rows = rates.map((row: any) => ({ doctor_id, department_id: row.department_id, amount: Number(row.amount || 0) }));
    const { error } = await supabase.from("doctor_department_rates").upsert(rows, { onConflict: "doctor_id,department_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error" }, { status: 500 });
  }
}
