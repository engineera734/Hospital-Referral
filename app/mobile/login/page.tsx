"use client";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Activity, HeartPulse } from "lucide-react";
import { createClient } from "../../../src/lib/supabase/client";
import { cleanText } from "../../../src/components/mobile/mobile-utils";

const rolePath: any = {
  admin: "/mobile/admin",
  doctor: "/mobile/doctor",
  reception: "/mobile/reception",
  accountant: "/mobile/accounting",
};

export default function MobileLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFadeOut, setSplashFadeOut] = useState(false);

  useEffect(() => {
    setBlockedUntil(Number(localStorage.getItem("mobile_login_blocked_until") || 0));

    const timer = setTimeout(() => {
      setSplashFadeOut(true);
      setTimeout(() => {
        setShowSplash(false);
      }, 600);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  function fail() {
    const k = "mobile_login_attempts";
    const attempts = Number(localStorage.getItem(k) || 0) + 1;
    localStorage.setItem(k, String(attempts));
    if (attempts >= 5) {
      const until = Date.now() + 60000;
      localStorage.setItem("mobile_login_blocked_until", String(until));
      localStorage.setItem(k, "0");
      setBlockedUntil(until);
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (Date.now() < blockedUntil) {
      setMessage("تم إيقاف المحاولة مؤقتًا لمدة دقيقة.");
      return;
    }
    const cleanEmail = cleanText(email, 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || password.length < 6 || password.length > 128) {
      setMessage("بيانات الدخول غير صحيحة.");
      fail();
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        setMessage("بيانات الدخول غير صحيحة.");
        fail();
        return;
      }
      localStorage.removeItem("mobile_login_attempts");
      localStorage.removeItem("mobile_login_blocked_until");
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).maybeSingle();
      window.location.href = rolePath[String(profile?.role || "").toLowerCase()] || "/mobile/dashboard";
    } catch {
      setMessage("تعذر تسجيل الدخول الآن.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Splash Screen */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0a6b5e] via-[#0f8f7d] to-[#0d7b6a] transition-opacity duration-600 ${splashFadeOut ? "opacity-0" : "opacity-100"}`}
        >
          {/* أيقونات خلفية - مخفية على الشاشات الصغيرة جداً */}
          <div className="absolute inset-0 overflow-hidden hidden sm:block">
            <div className="absolute top-[15%] left-[10%] text-white/10 animate-pulse" style={{ animationDuration: '2s' }}>
              <HeartPulse size={70} />
            </div>
            <div className="absolute bottom-[20%] right-[8%] text-white/10 animate-bounce" style={{ animationDuration: '3s' }}>
              <Activity size={50} />
            </div>
            <div className="absolute top-[40%] right-[15%] text-white/10 animate-pulse" style={{ animationDuration: '2.5s' }}>
              <HeartPulse size={35} />
            </div>
          </div>

          {/* دوائر زخرفية */}
          <div className="absolute -top-[15%] -right-[15%] w-[50%] max-w-[250px] aspect-square rounded-full bg-white/5 animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute -bottom-[20%] -left-[20%] w-[60%] max-w-[300px] aspect-square rounded-full bg-white/5 animate-pulse" style={{ animationDuration: '5s' }}></div>

          {/* المحتوى الرئيسي */}
          <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-6 px-6 w-full max-w-[360px] mx-auto">
            {/* الأيقونة الرئيسية مع حلقات */}
            <div className="relative">
              <div className="w-[28vw] h-[28vw] max-w-[130px] max-h-[130px] min-w-[100px] min-h-[100px] rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-2xl animate-pulse" style={{ animationDuration: '2s' }}>
                <HeartPulse className="text-white w-[55%] h-[55%]" />
              </div>
              {/* حلقة خارجية */}
              <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-spin" style={{ animationDuration: '8s' }}>
                <div className="absolute -top-[2%] -right-[2%] w-[10%] aspect-square bg-white rounded-full shadow-lg"></div>
              </div>
              {/* حلقة ثانية */}
              <div className="absolute -inset-[15%] rounded-full border-2 border-dashed border-white/20 animate-spin hidden sm:block" style={{ animationDuration: '12s', animationDirection: 'reverse' }}>
                <div className="absolute -bottom-[5%] left-[20%] w-[8%] aspect-square bg-white/80 rounded-full shadow-lg"></div>
              </div>
            </div>

            {/* اسم المستشفى */}
            <div className="text-center space-y-1 sm:space-y-2">
              <h1 className="text-[6vw] sm:text-[5vw] md:text-4xl font-black text-white tracking-wider leading-tight">
                مستشفى الرفاعي
              </h1>
              <p className="text-[3.5vw] sm:text-[2.5vw] md:text-lg font-bold text-white/80">
                Al-Rifai Hospital
              </p>
            </div>

            {/* شعار */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 sm:px-6 py-1.5 sm:py-2">
              <Activity className="text-white/90 w-[3.5vw] h-[3.5vw] min-w-[14px] min-h-[14px] max-w-[18px] max-h-[18px]" />
              <span className="text-[2.8vw] sm:text-[2vw] md:text-sm font-bold text-white/90 whitespace-nowrap">نظام الإحالات الطبية</span>
            </div>

            {/* مؤشر التحميل */}
            <div className="mt-4 sm:mt-8 flex flex-col items-center gap-2 sm:gap-3">
              <div className="flex gap-1 sm:gap-1.5">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
              <p className="text-[2.5vw] sm:text-xs font-bold text-white/70">جاري التحميل...</p>
            </div>

            {/* شريط التقدم */}
            <div className="w-[70%] max-w-[200px] h-1 sm:h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full animate-progress"></div>
            </div>
          </div>
        </div>
      )}

      {/* صفحة تسجيل الدخول */}
      <main className="min-h-screen overflow-hidden bg-[#eef4f3] px-5 py-8" dir="rtl">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[430px] flex-col justify-center">
          <section className="relative overflow-hidden rounded-[2.25rem] bg-white px-7 pb-8 pt-7 shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
            {/* دوائر زخرفية */}
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#0f8f7d]" />
            <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-[#8ad3c8]" />

            <div className="relative z-10">
              {/* أيقونة دائرية معبرة */}
              <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#e7f6f4] to-[#d0f0ea] shadow-inner relative">
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#0f8f7d]/20 animate-spin" style={{ animationDuration: '15s' }}></div>
                <HeartPulse size={52} className="text-[#0f8f7d]" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#0f8f7d] rounded-full flex items-center justify-center shadow-lg">
                  <Activity size={16} className="text-white" />
                </div>
              </div>

              <div className="mb-6 text-center">
                <div className="mx-auto inline-flex rounded-xl bg-[#e2f3f0] px-5 py-2 text-2xl font-black text-[#0b776a]">
                  تسجيل الدخول
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-400">
                  نظام إحالات مستشفى الرفاعي
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-400">البريد الإلكتروني</span>
                  <div className="flex h-12 items-center gap-2 border-b border-slate-200">
                    <Mail size={18} className="text-slate-400" />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      className="h-full flex-1 bg-transparent text-left text-sm text-slate-700 outline-none"
                      placeholder="email@example.com"
                      dir="ltr"
                      autoComplete="email"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-400">كلمة المرور</span>
                  <div className="flex h-12 items-center gap-2 border-b border-slate-200">
                    <Lock size={18} className="text-slate-400" />
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={show ? "text" : "password"}
                      className="h-full flex-1 bg-transparent text-left text-sm text-slate-700 outline-none"
                      placeholder="Password"
                      dir="ltr"
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShow(!show)} className="text-slate-400">
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {message && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-center text-xs font-bold text-red-600">
                    {message}
                  </div>
                )}

                <button
                  disabled={busy}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0f8f7d] text-sm font-black text-white shadow-[0_12px_24px_rgba(15,143,125,0.25)] disabled:opacity-60 transition-all hover:bg-[#0c7a6b] active:scale-[0.98]"
                >
                  <ShieldCheck size={18} />
                  {busy ? "جاري الدخول..." : "دخول النظام"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>

      {/* أنماط CSS للأنيميشن */}
      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 10s linear forwards;
        }
        .transition-opacity.duration-600 {
          transition: opacity 0.6s ease-in-out;
        }
      `}</style>
    </>
  );
}