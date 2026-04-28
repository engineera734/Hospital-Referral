import { ensureActiveLicense } from "../../_shared/auth-role";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      full_name,
      email,
      password,
      card_no,
      specialty,
      phone,
      national_id,
      kareemy_account,
    } = body ?? {};

    if (!full_name || !email || !password || !card_no) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const licenseError = await ensureActiveLicense(supabase);
if (licenseError) return licenseError;

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      email_confirm: true,
      user_metadata: {
        full_name: String(full_name).trim(),
        role: "doctor",
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const userId = authUser.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User creation failed." },
        { status: 400 }
      );
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      username: String(email).trim().toLowerCase(),
      full_name: String(full_name).trim(),
      role: "doctor",
      phone:phone ? String(phone).trim() :null,
      national_id:national_id ? String(national_id).trim() :null,
      is_active: true,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    const { error: doctorError } = await supabase.from("doctors").insert({
      user_id: userId,
      full_name: String(full_name).trim(),
      card_no: String(card_no).trim(),
      specialty: specialty?.trim() || null,
      phone: phone?.trim() || null,
      kareemy_account: kareemy_account?.trim() || null,
      is_active: true,
    });

    if (doctorError) {
      await supabase.from("profiles").delete().match({ id: userId });
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: doctorError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}