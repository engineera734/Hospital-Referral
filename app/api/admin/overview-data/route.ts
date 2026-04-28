import { NextResponse } from "next/server";
import { requireRole } from "../../_shared/auth-role";

export async function GET(req: Request) {
  try {
    const result = await requireRole(req, ["admin"]);
    if ("error" in result) return result.error;
    const admin = result.admin;

    const [doctorRes, departmentRes, referralRes, settlementRes] = await Promise.all([
      admin.from("doctors").select("id", { count: "exact", head: true }),
      admin.from("departments").select("id", { count: "exact", head: true }),
      admin.from("referrals").select("id", { count: "exact", head: true }),
      admin.from("doctor_settlements").select("amount").limit(500),
    ]);

    const totalSettled = (settlementRes.data || []).reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);

    return NextResponse.json({
      doctorsCount: doctorRes.count || 0,
      departmentsCount: departmentRes.count || 0,
      referralsCount: referralRes.count || 0,
      totalSettled,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error." }, { status: 500 });
  }
}
