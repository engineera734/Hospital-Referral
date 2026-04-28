import { ensureActiveLicense } from "../../_shared/auth-role";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { full_name, email, password, phone, national_id, role } = body ?? {};

    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (!["reception", "accountant"].includes(String(role))) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const licenseError = await ensureActiveLicense(supabase);
if (licenseError) return licenseError;
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      email_confirm: true,
      user_metadata: { full_name: String(full_name).trim(), role },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authUser.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User creation failed." }, { status: 400 });
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      username: String(email).trim().toLowerCase(),
      full_name: String(full_name).trim(),
      role,
      phone: phone?.trim() || null,
      national_id: national_id?.trim() || null,
      is_active: true,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error" }, { status: 500 });
  }
}
