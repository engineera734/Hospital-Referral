import { ensureActiveLicense } from "../../_shared/auth-role";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";

function inRange(dateValue: string | null | undefined, year?: number | null, monthFrom?: number | null, monthTo?: number | null) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  if (year && date.getFullYear() !== year) return false;
  const month = date.getMonth() + 1;
  if (monthFrom && month < monthFrom) return false;
  if (monthTo && month > monthTo) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { doctor_id, settled_by, note, mode, year, month_from, month_to, scope } = body ?? {};
    if (!doctor_id) return NextResponse.json({ error: "معرف الطبيب مطلوب." }, { status: 400 });
    const supabase = createAdminClient();
    const licenseError = await ensureActiveLicense(supabase);
if (licenseError) return licenseError;

    if (mode === 'clear_paid') {
      const { data: settlements, error: readError } = await supabase
        .from('doctor_settlements')
        .select('id')
        .eq('doctor_id', doctor_id)
        .order('settled_at', { ascending: false });
      if (readError) return NextResponse.json({ error: readError.message }, { status: 400 });
      const ids = (settlements || []).map((row: any) => row.id).filter(Boolean);
      if (!ids.length) return NextResponse.json({ ok: true, cleared: 0 });
      const { error: clearError } = await supabase.from('doctor_settlements').delete().in('id', ids);
      if (clearError) return NextResponse.json({ error: clearError.message }, { status: 400 });
      return NextResponse.json({ ok: true, cleared: ids.length });
    }

    const { data: refs, error: refError } = await supabase
      .from('referrals')
      .select('id, department_id, arrived_at, referral_date, created_at')
      .eq('doctor_id', doctor_id)
      .eq('status', 'arrived');
    if (refError) return NextResponse.json({ error: refError.message }, { status: 400 });

    const allReferrals = refs || [];
    const scoped = scope === 'range'
      ? allReferrals.filter((row: any) => inRange(row.arrived_at || row.referral_date || row.created_at, Number(year || 0), Number(month_from || 0), Number(month_to || 0)))
      : allReferrals;

    if (!scoped.length) return NextResponse.json({ ok: true, amount: 0, referrals_count: 0 });

    const { data: rates, error: ratesError } = await supabase
      .from('doctor_department_rates')
      .select('department_id, amount')
      .eq('doctor_id', doctor_id);
    if (ratesError) return NextResponse.json({ error: ratesError.message }, { status: 400 });

    const rateMap = new Map((rates || []).map((r: any) => [r.department_id, Number(r.amount || 0)]));
    const amount = scoped.reduce((sum: number, r: any) => sum + (rateMap.get(r.department_id) || 0), 0);

    const scopeText = scope === 'range' ? `تصفية مستحقات من ${month_from}/${year} إلى ${month_to}/${year}` : 'تصفية مستحقات جميع الأشهر';
    const { error: insertError } = await supabase.from('doctor_settlements').insert({
      doctor_id,
      amount,
      referrals_count: scoped.length,
      settled_by: settled_by || null,
      note: note || scopeText,
    });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

    const ids = scoped.map((r: any) => r.id);
    const { error: deleteError } = await supabase.from('referrals').delete().in('id', ids);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

    return NextResponse.json({ ok: true, amount, referrals_count: scoped.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error" }, { status: 500 });
  }
}
