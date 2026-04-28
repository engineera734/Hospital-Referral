"use client";

type NavItem = {
  key: string;
  label: string;
};

export default function AppShell({
  appTitle,
  roleLabel,
  fullName,
  navItems,
  activeKey,
  onChange,
  onSignOut,
  children,
}: {
  appTitle: string;
  roleLabel: string;
  fullName: string;
  navItems: NavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen p-3 md:p-5" dir="rtl">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)] md:grid md:grid-cols-[280px,1fr]">
        <aside className="border-b border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] px-4 py-5 text-white md:min-h-screen md:border-b-0 md:border-l md:border-l-white/10 md:px-5 md:py-6">
          <div className="flex items-start justify-between gap-3 md:block">
            <div>
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                {roleLabel}
              </div>
              <h1 className="mt-3 text-xl font-extrabold">{appTitle}</h1>
              <p className="mt-1 text-sm text-slate-300">{fullName}</p>
            </div>

            <button
              onClick={onSignOut}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white md:mt-6"
            >
              Sign out
            </button>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-2 md:mt-8 md:block md:space-y-2 md:overflow-visible md:pb-0">
            {navItems.map((item) => {
              const active = item.key === activeKey;
              return (
                <button
                  key={item.key}
                  onClick={() => onChange(item.key)}
                  className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-bold transition md:block md:w-full md:text-right ${
                    active
                      ? "bg-white text-slate-900 shadow-lg"
                      : "bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="bg-slate-50 p-4 md:p-7">{children}</section>
      </div>
    </main>
  );
}