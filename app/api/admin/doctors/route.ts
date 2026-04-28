import { NextResponse } from "next/server";
import { requireRole } from "../../_shared/auth-role";

export async function GET(req: Request) {
  try {
    const result = await requireRole(req, ["admin"]);
    if ("error" in result) return result.error;

    const { data, error } = await result.admin
      .from("doctors")
      .select("id, full_name, card_no, kareemy_account, specialty, phone, user_id, is_active")
      .order("full_name");

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ doctors: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error." }, { status: 500 });
  }
}
