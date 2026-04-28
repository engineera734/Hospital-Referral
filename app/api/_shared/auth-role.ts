import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../src/lib/supabase/admin";

export function createUserClient(authHeader: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

export async function requireRole(req: Request, allowedRoles: string[]) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const userClient = createUserClient(authHeader);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const licenseError = await ensureActiveLicense(admin);
if (licenseError) return { error: licenseError };

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, username, role, phone, national_id, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  const role = String(profile?.role || "").trim().toLowerCase();

  if (profileError || !profile || !allowedRoles.includes(role)) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return { admin, profile, user };
}

export async function ensureActiveLicense(admin: ReturnType<typeof createAdminClient>) {
  const { data: licenseOk, error } = await admin.rpc("is_app_license_active");

  if (error || !licenseOk) {
    return NextResponse.json(
      {
        error:
          "انتهت مدة الترخيص التجريبي. يرجى التواصل مع مالك النظام لتجديد التفعيل.",
      },
      { status: 403 }
    );
  }

  return null;
}


