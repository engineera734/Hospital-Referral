import { ensureActiveLicense } from "../../_shared/auth-role";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "../../../../src/lib/supabase/admin";

function createUserClient(authHeader: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userClient = createUserClient(authHeader);
    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const admin = createAdminClient();
    const licenseError = await ensureActiveLicense(admin);
if (licenseError) return licenseError;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, full_name, username, role, phone, national_id, avatar_path")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      String(profile.role).trim().toLowerCase() !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const [
      doctorRes,
      departmentRes,
      referralRes,
      staffRes,
      rateRes,
      settlementRes,
      peopleRes,
    ] = await Promise.all([
      admin
        .from("doctors")
        .select("id, full_name, card_no, kareemy_account, specialty, phone, user_id, is_active")
        .order("full_name"),

      admin
        .from("departments")
        .select("id, name, code")
        .order("name"),

      admin
        .from("referrals")
        .select(`
          id,
          patient_name,
          patient_age,
          diagnosis,
          priority,
          status,
          referral_code,
          created_at,
          referral_date,
          arrived_at,
          arrived_by,
          attachment_name,
          attachment_path,
          archived_by_doctor,
          doctors(id, full_name, kareemy_account),
          departments(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(300),

      admin
        .from("profiles")
        .select("id, full_name, username, role, phone, national_id, is_active, avatar_path")
        .in("role", ["reception", "accountant"])
        .order("full_name"),

      admin
        .from("doctor_department_rates")
        .select("doctor_id, department_id, amount"),

      admin
        .from("doctor_settlements")
        .select("doctor_id, amount, referrals_count, settled_at, settled_by, note")
        .order("settled_at", { ascending: false }),

      admin
        .from("profiles")
        .select("id, full_name, role, avatar_path")
        .in("role", ["admin", "doctor", "reception", "accountant"]),
    ]);

    return NextResponse.json({
      profile,
      doctors: doctorRes.data ?? [],
      departments: departmentRes.data ?? [],
      referrals: referralRes.data ?? [],
      staff: staffRes.data ?? [],
      rates: rateRes.data ?? [],
      settlements: settlementRes.data ?? [],
      people: peopleRes.data ?? [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}