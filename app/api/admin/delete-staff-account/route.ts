import { ensureActiveLicense } from "../../_shared/auth-role";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staff_id } = body ?? {};
    if (!staff_id) return NextResponse.json({ error: "معرف الموظف مطلوب." }, { status: 400 });
    const supabase = createAdminClient();
    const licenseError = await ensureActiveLicense(supabase);
if (licenseError) return licenseError;
    const { data: profile, error } = await supabase.from("profiles").select("id, role").eq("id", staff_id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!profile) return NextResponse.json({ error: "الموظف غير موجود." }, { status: 404 });
    await supabase.from("profiles").delete().match({ id: staff_id });
    await supabase.auth.admin.deleteUser(staff_id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error" }, { status: 500 });
  }
}
