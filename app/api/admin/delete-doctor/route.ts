import { ensureActiveLicense } from "../../_shared/auth-role";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { doctor_id } = body ?? {};

    if (!doctor_id) {
      return NextResponse.json({ error: "doctor_id is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const licenseError = await ensureActiveLicense(supabase);
if (licenseError) return licenseError;

    const { data: doctor, error: doctorReadError } = await supabase
      .from("doctors")
      .select("id, user_id")
      .eq("id", doctor_id)
      .maybeSingle();

    if (doctorReadError) {
      return NextResponse.json({ error: doctorReadError.message }, { status: 400 });
    }

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
    }

    await supabase.from("referrals").delete().match({ doctor_id});
    await supabase.from("doctors").delete().match({id: doctor_id});

    if (doctor.user_id) {
      await supabase.from("profiles").delete().match({id: doctor.user_id});
      await supabase.auth.admin.deleteUser(doctor.user_id);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}