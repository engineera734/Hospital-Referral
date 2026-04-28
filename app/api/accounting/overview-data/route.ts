import { NextResponse } from "next/server";
import { requireRole } from "../../_shared/auth-role";

export async function GET(req: Request) {
  try {
    const result = await requireRole(req, ["accountant", "admin"]);
    if ("error" in result) return result.error;
    const admin = result.admin;

    const [doctorRes, referralRes, rateRes, settlementRes] = await Promise.all([
      admin.from("doctors").select("id", { count: "exact", head: true }),
      admin.from("referrals").select("id, status, doctor_id, department_id", { count: "exact" }).eq("status", "arrived").limit(500),
      admin.from("doctor_department_rates").select("doctor_id, department_id, amount"),
      admin.from("doctor_settlements").select("amount"),
    ]);

    const rates = rateRes.data || [];
    const rateMap = new Map(rates.map((r: any) => [`${r.doctor_id}:${r.department_id}`, Number(r.amount || 0)]));
    const referrals = referralRes.data || [];
    const totalProfit = referrals.reduce((sum: number, r: any) => sum + (rateMap.get(`${r.doctor_id}:${r.department_id}`) || 0), 0);
    const totalSettled = (settlementRes.data || []).reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);

    return NextResponse.json({
      doctorsCount: doctorRes.count || 0,
      referralsCount: referralRes.count || 0,
      totalProfit,
      totalSettled,
      totalPendingProfit: Math.max(totalProfit - totalSettled, 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error." }, { status: 500 });
  }
}
