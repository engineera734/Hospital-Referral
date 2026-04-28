"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "../../src/lib/supabase/client";
import { Eye, EyeOff, LogIn, Mail, Lock, Building2, Shield, AlertTriangle, Divide } from "lucide-react";
import Image from "next/image";

// ============ أنواع TypeScript ============
type ValidationResult = {
  isValid: boolean;
  error: string;
};

// ============ دوال الأمان ============

function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:\s*/gi, '')
    .replace(/data\s*:[^;]*;base64/gi, '')
    .replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return entities[char] || char;
    })
    .trim();
}

function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'البريد الإلكتروني مطلوب' };
  }
  
  const sanitized = sanitizeInput(email.trim());
  
  if (sanitized.length > 254) {
    return { isValid: false, error: 'البريد الإلكتروني طويل جداً' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, error: 'صيغة البريد الإلكتروني غير صحيحة' };
  }
  
  return { isValid: true, error: '' };
}

function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'كلمة المرور مطلوبة' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'كلمة المرور قصيرة جداً' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'كلمة المرور طويلة جداً' };
  }
  
  return { isValid: true, error: '' };
}

// ============ Rate Limiting ============
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string): { allowed: boolean; remainingMinutes?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now, lockedUntil: 0 });
    return { allowed: true };
  }
  
  if (entry.lockedUntil > 0 && now < entry.lockedUntil) {
    const remainingMinutes = Math.ceil((entry.lockedUntil - now) / 60000);
    return { allowed: false, remainingMinutes };
  }
  
  if (entry.lockedUntil > 0 && now >= entry.lockedUntil) {
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now, lockedUntil: 0 });
    return { allowed: true };
  }
  
  if (now - entry.firstAttempt > LOCKOUT_DURATION) {
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now, lockedUntil: 0 });
    return { allowed: true };
  }
  
  entry.attempts++;
  
  if (entry.attempts > MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION;
    rateLimitStore.set(key, entry);
    const remainingMinutes = Math.ceil(LOCKOUT_DURATION / 60000);
    return { allowed: false, remainingMinutes };
  }
  
  rateLimitStore.set(key, entry);
  return { allowed: true };
}

function getRemainingAttempts(key: string): number {
  const entry = rateLimitStore.get(key);
  if (!entry) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - entry.attempts);
}

// ============ المكون الرئيسي ============
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const clearError = useCallback(() => {
    if (errorMessage) setErrorMessage("");
  }, [errorMessage]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // تنظيف المدخلات
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    
    // التحقق من صحة المدخلات أولاً
    const emailValidation = validateEmail(cleanEmail);
    if (!emailValidation.isValid) {
      setErrorMessage(emailValidation.error);
      emailRef.current?.focus();
      return;
    }
    
    const passwordValidation = validatePassword(cleanPassword);
    if (!passwordValidation.isValid) {
      setErrorMessage(passwordValidation.error);
      passwordRef.current?.focus();
      return;
    }
    
    // Rate limiting
    const clientKey = `login_${cleanEmail}`;
    const rateLimitResult = checkRateLimit(clientKey);
    
    if (!rateLimitResult.allowed) {
      setIsLocked(true);
      setErrorMessage(`تم تجاوز عدد المحاولات. الرجاء المحاولة بعد ${rateLimitResult.remainingMinutes} دقيقة`);
      return;
    }
    
    setLoading(true);
    setErrorMessage("");
    
    try {
      // إنشاء عميل Supabase
      const supabase = createClient();
      
      // محاولة تسجيل الدخول
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });
      
      if (error) {
        // التعامل مع أنواع الأخطاء المختلفة
        let errorMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        
        if (error.message?.includes("Invalid login credentials")) {
          errorMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        } else if (error.message?.includes("Email not confirmed")) {
          errorMsg = "يرجى تأكيد البريد الإلكتروني أولاً";
        } else if (error.status === 429) {
          errorMsg = "محاولات كثيرة جداً. الرجاء الانتظار";
        }
        
        setErrorMessage(errorMsg);
        
        // عرض المحاولات المتبقية
        const remaining = getRemainingAttempts(clientKey);
        if (remaining <= 2 && remaining > 0) {
          setErrorMessage(`${errorMsg}. متبقي ${remaining} محاولات`);
        }
        
        setLoading(false);
        return;
      }
      
      // نجاح تسجيل الدخول
      if (data?.session) {
        // مسح rate limiting
        rateLimitStore.delete(clientKey);
        
        // التوجيه إلى لوحة التحكم
        window.location.href = "/dashboard";
      } else {
        setErrorMessage("فشل إنشاء الجلسة. الرجاء المحاولة مرة أخرى");
        setLoading(false);
      }
      
    } catch (err) {
      console.error("خطأ غير متوقع:", err);
      setErrorMessage("حدث خطأ في النظام. الرجاء المحاولة لاحقاً");
      setLoading(false);
    }
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    clearError();
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    clearError();
  }

  return (
    <main className="relative min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4 md:p-6 overflow-hidden" dir="rtl">
      {/* خلفية متدرجة */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1033] via-[#0f0a1f] to-[#0A0A0F]" />
      
      {/* تأثيرات ضوئية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-violet-500/10 rounded-full blur-[96px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* شبكة خلفية */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          
          {/* الجهة اليسرى - الصورة والمعلومات */}
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-right px-4 lg:px-8">
            <div className="relative w-64 h-64 lg:w-80 lg:h-80 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-indigo-600/30 rounded-full blur-3xl animate-pulse" />
              <Image
                src="https://png.pngtree.com/png-clipart/20231003/original/pngtree-online-doctor-health-service-png-image_13230792.png"
                alt="نظام الإحالة الطبية"
                width={400}
                height={400}
                className="relative z-10 drop-shadow-2xl"
                priority
                unoptimized
              />
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                نظام الإحالة الطبية
              </span>
            </h1>
            
            <p className="text-gray-400 text-lg mb-2">
              صحتك أولويتنا
            </p>
            
            <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">اتصال آمن ومشفر</span>
            </div>
          </div>

          {/* الجهة اليمنى - نموذج تسجيل الدخول */}
          <div className="w-full lg:w-1/2 px-4 lg:px-8">
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-3xl shadow-2xl border border-white/[0.08] overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600"></div>
              
              <div className="p-8 md:p-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/25 mb-4">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">تسجيل الدخول</h2>
                  <p className="text-sm text-gray-400">أدخل بياناتك للوصول إلى النظام</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6" noValidate>
                  {/* البريد الإلكتروني */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      البريد الإلكتروني
                    </label>
                    <div className="relative">
                      <input
                        ref={emailRef}
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        maxLength={254}
                        disabled={loading || isLocked}
                        className={`
                          w-full rounded-xl border bg-white/[0.05] px-4 py-3 pr-11 
                          text-white placeholder:text-gray-500 text-right
                          focus:outline-none transition-all duration-200
                          ${loading || isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                          ${errorMessage ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-white/[0.08] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'}
                        `}
                        placeholder="البريد الإلكتروني"
                        aria-invalid={!!errorMessage}
                        aria-describedby={errorMessage ? "login-error" : undefined}
                        dir="ltr"
                      />
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    </div>
                  </div>

                  {/* كلمة المرور */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gray-500" />
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <input
                        ref={passwordRef}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        maxLength={128}
                        disabled={loading || isLocked}
                        className={`
                          w-full rounded-xl border bg-white/[0.05] px-4 py-3 pr-11 pl-11
                          text-white placeholder:text-gray-500 text-right
                          focus:outline-none transition-all duration-200
                          ${loading || isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                          ${errorMessage ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-white/[0.08] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'}
                        `}
                        placeholder="كلمة المرور"
                        aria-invalid={!!errorMessage}
                        aria-describedby={errorMessage ? "login-error" : undefined}
                        dir="ltr"
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* نسيت كلمة المرور */}
                  <div className="text-left">
                    <a 
                      href="/forgot-password" 
                      className="text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
                      rel="noopener noreferrer"
                    >
                      نسيت كلمة المرور؟
                    </a>
                  </div>

                  {/* رسالة الخطأ */}
                  {errorMessage && (
                    <div 
                      id="login-error"
                      className="rounded-xl border border-red-500/20 bg-red-500/10 backdrop-blur-sm px-4 py-3"
                      role="alert"
                      aria-live="polite"
                    >
                      <p className="text-sm text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {errorMessage}
                      </p>
                    </div>
                  )}

                  {/* زر تسجيل الدخول */}
                  <button
                    type="submit"
                    disabled={loading || isLocked}
                    className="relative w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          جاري الدخول...
                        </>
                      ) : isLocked ? (
                        <>
                          <Lock className="w-5 h-5" />
                          موقوف مؤقتاً
                        </>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          دخول
                        </>
                      )}
                    </span>
                  </button>
                </form>

                {/* تذييل */}
                <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3 text-green-400" />
                    دخول آمن للموظفين المصرح لهم
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

