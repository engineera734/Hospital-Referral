import { ensureActiveLicense } from "../../_shared/auth-role";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = createAdminClient();
    const licenseError = await ensureActiveLicense(supabase);
if (licenseError) return licenseError;

    const { error } = await supabase
      .from("referrals")
      .delete()
      .eq("status", "completed");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to delete completed referrals." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
