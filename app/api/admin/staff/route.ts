import { NextResponse } from "next/server";
import { requireRole } from "../../_shared/auth-role";

export async function GET(req: Request) {
  try {
    const result = await requireRole(req, ["admin"]);
    if ("error" in result) return result.error;

    const { data, error } = await result.admin
      .from("profiles")
      .select("id, full_name, username, role, phone, national_id, is_active, avatar_path")
      .in("role", ["reception", "accountant"])
      .order("full_name");

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ staff: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error." }, { status: 500 });
  }
}
