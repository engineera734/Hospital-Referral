import { NextResponse } from "next/server";
import { requireRole } from "../../_shared/auth-role";

export async function GET(req: Request) {
  try {
    const result = await requireRole(req, ["admin"]);
    if ("error" in result) return result.error;

    const { data, error } = await result.admin
      .from("referrals")
      .select("id, patient_name, patient_age, diagnosis, priority, status, referral_code, created_at, referral_date, arrived_at, doctors(id, full_name, kareemy_account), departments(id,name)")
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ referrals: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error." }, { status: 500 });
  }
}
