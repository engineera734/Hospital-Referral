"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const hideTimer = setTimeout(() => {
      setLeaving(true);
    }, 9500);

    const removeTimer = setTimeout(() => {
      setVisible(false);
      router.push("/login"); // التوجيه إلى صفحة التسجيل
    }, 10000);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [router]);

  if (!visible) return null;

  return (
    <section
      className={`fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-[#0a0f1e] transition-all duration-700 ${
        leaving ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
    >
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.04); }
        }
        
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-float {
          animation: float 2.4s ease-in-out infinite;
        }
        
        .animate-progress {
          animation: progress 10s linear forwards;
        }
        
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 7s linear infinite;
        }
      `}</style>

      {/* تأثيرات الخلفية الداكنة المحسنة */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(239,68,68,0.25),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(37,99,235,0.3),transparent_40%),radial-gradient(ellipse_at_center,rgba(34,197,94,0.15),transparent_50%)]" />
      
      {/* نقاط متوهجة في الخلفية */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-red-400/60 blur-sm" />
        <div className="absolute top-1/3 right-1/3 h-1.5 w-1.5 rounded-full bg-blue-400/60 blur-sm" />
        <div className="absolute bottom-1/3 left-1/2 h-2 w-2 rounded-full bg-green-400/50 blur-sm" />
        <div className="absolute top-1/2 right-1/4 h-1 w-1 rounded-full bg-blue-300/60 blur-sm" />
      </div>

      {/* حلقات مدارية محسنة */}
      <div className="absolute h-[420px] w-[420px] rounded-full border border-red-500/30 animate-spin-slow shadow-[0_0_30px_rgba(239,68,68,0.15)]" />
      <div className="absolute h-[320px] w-[320px] rounded-full border border-blue-500/30 animate-spin-slow-reverse shadow-[0_0_30px_rgba(37,99,235,0.15)]" />
      <div className="absolute h-[220px] w-[220px] rounded-full border border-green-500/20 animate-spin-slow" />

      <div className="relative flex flex-col items-center px-6 text-center">
        {/* حاوية الشعار بتصميم داكن مميز */}
        <div className="relative mb-8 flex h-44 w-44 items-center justify-center rounded-[3rem] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 shadow-[0_30px_90px_rgba(0,0,0,0.5),0_0_40px_rgba(59,130,246,0.2)] ring-1 ring-slate-700">
          <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-blue-950/80" />
          <div className="absolute -inset-3 rounded-[3.4rem] bg-gradient-to-r from-red-500/50 via-green-500/40 to-blue-600/50 blur-xl animate-pulse" />

          <Image
            src="/images/hospital-referral-logo.png"
            alt="Hospital Referral Logo"
            width={145}
            height={145}
            priority
            className="relative z-10 object-contain animate-float drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          />
        </div>

        {/* العنوان بتدرج لوني جذاب */}
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
          Hospital Referral
        </h1>

        <p className="mt-3 text-sm font-semibold tracking-[0.28em] text-blue-300/80 uppercase">
          Al Rifai Hospital
        </p>

        {/* شريط التقدم بتوهج محسن */}
        <div className="mt-9 h-2 w-64 overflow-hidden rounded-full bg-slate-800 shadow-inner ring-1 ring-slate-700">
          <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-600 animate-progress shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        </div>

        <p className="mt-5 animate-pulse text-xs font-medium text-slate-500">
          Preparing your medical workspace...
        </p>
      </div>
    </section>
  );
}