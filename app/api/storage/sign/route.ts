import { ensureActiveLicense } from "../../_shared/auth-role";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bucket, path } = body ?? {};
    if (!bucket || !path) {
      return NextResponse.json({ error: "bucket and path are required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const licenseError = await ensureActiveLicense(supabase);
if (licenseError) return licenseError;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error." }, { status: 500 });
  }
}
