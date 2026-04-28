import { TrendingUp, Users, Activity, DollarSign, Calendar, ChevronRight } from "lucide-react";

export function MetricCard({ title, value, accent, icon, trend }: { 
  title: string; 
  value: string | number; 
  accent: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Gradient Background Effect */}
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1 text-right">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-xs font-semibold ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend.value >= 0 ? `+${trend.value}` : trend.value}%
              </span>
              <span className="text-xs text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`rounded-xl ${accent.replace('bg-', 'bg-').replace('/10', '')} p-3 text-white shadow-lg`}>
          {icon || <TrendingUp size={24} />}
        </div>
      </div>
    </div>
  );
}

export function Panel({ title, children, actions, icon }: { 
  title: string; 
  children: React.ReactNode; 
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                {icon}
              </div>
            )}
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

export function StatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}