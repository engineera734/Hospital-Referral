"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const [message, setMessage] = useState("جارٍ التحقق من الحساب...");
  useEffect(() => {
    let active = true;
    async function run() {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !user) { router.replace('/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const role = String(profile?.role || '').trim().toLowerCase();
      if (role === 'admin') router.replace('/dashboard/admin');
      else if (role === 'doctor') router.replace('/dashboard/doctor');
      else if (role === 'reception') router.replace('/dashboard/reception');
      else if (role === 'accountant') router.replace('/dashboard/accounting');
      else setMessage('تعذر تحديد صلاحية المستخدم.');
    }
    run();
    return () => { active = false; };
  }, [router]);
  return <main className="min-h-screen flex items-center justify-center px-6"><div className="rounded-3xl border border-slate-200 bg-white px-8 py-7 text-center shadow-xl"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /><h1 className="text-xl font-bold text-slate-900">جارٍ فتح النظام</h1><p className="mt-3 text-slate-500">{message}</p></div></main>;
}
