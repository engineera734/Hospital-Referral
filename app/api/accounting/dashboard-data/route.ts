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
      String(profile.role).trim().toLowerCase() !== "accountant"
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const [doctorRes, referralRes, rateRes, settlementRes, departmentRes, peopleRes, staffRes] =
      await Promise.all([
        admin
          .from("doctors")
          .select("id, full_name, specialty, kareemy_account, user_id")
          .order("full_name"),

        admin
          .from("referrals")
          .select(`
            id,
            patient_name,
            patient_age,
            status,
            referral_date,
            created_at,
            arrived_at,
            arrived_by,
            diagnosis,
            priority,
            doctors(id, full_name),
            departments(id, name)
          `)
          .order("created_at", { ascending: false })
          .limit(300),

        admin
          .from("doctor_department_rates")
          .select("doctor_id, department_id, amount"),

        admin
          .from("doctor_settlements")
          .select("doctor_id, amount, referrals_count, settled_at, settled_by, note")
          .order("settled_at", { ascending: false }),

        admin
          .from("departments")
          .select("id, name, code")
          .order("name"),

        admin
          .from("profiles")
          .select("id, full_name, role, avatar_path")
          .in("role", ["admin", "doctor", "reception", "accountant"]),

        admin
          .from("profiles")
          .select("id, full_name, username, role, phone, national_id, is_active, avatar_path")
          .in("role", ["reception", "accountant"])
          .order("full_name"),
      ]);

    return NextResponse.json({
      profile,
      doctors: doctorRes.data ?? [],
      referrals: referralRes.data ?? [],
      rates: rateRes.data ?? [],
      settlements: settlementRes.data ?? [],
      departments: departmentRes.data ?? [],
      people: peopleRes.data ?? [],
      staff: staffRes.data ?? [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}