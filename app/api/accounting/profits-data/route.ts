import { NextResponse } from "next/server";
import { requireRole } from "../../_shared/auth-role";

export async function GET(req: Request) {
  try {
    const result = await requireRole(req, ["accountant", "admin"]);
    if ("error" in result) return result.error;
    const admin = result.admin;

    const [doctorRes, referralRes, rateRes, settlementRes] = await Promise.all([
      admin.from("doctors").select("id, full_name, specialty, kareemy_account, user_id").order("full_name"),
      admin.from("referrals").select("id, patient_name, status, referral_date, created_at, arrived_at, doctors(id, full_name), departments(id,name)").eq("status", "arrived").order("created_at", { ascending: false }).limit(300),
      admin.from("doctor_department_rates").select("doctor_id, department_id, amount"),
      admin.from("doctor_settlements").select("doctor_id, amount, referrals_count, settled_at, settled_by, note").order("settled_at", { ascending: false }).limit(300),
    ]);

    return NextResponse.json({
      doctors: doctorRes.data ?? [],
      referrals: referralRes.data ?? [],
      rates: rateRes.data ?? [],
      settlements: settlementRes.data ?? [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error." }, { status: 500 });
  }
}
