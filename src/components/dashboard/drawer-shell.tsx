"use client";

import { useState } from "react";
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  Archive, 
  LogOut, 
  Menu,
  ChevronLeft,
  Activity,
  Calendar,
  FileText,
  Settings,
  TrendingUp,
  X
} from "lucide-react";

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export default function DrawerShell({
  appTitle,
  roleBadge,
  profileName,
  items,
  active,
  onChange,
  children,
  onLogout,
  actions,
}: {
  appTitle: string;
  roleBadge: string;
  profileName: string;
  items: { key: string; label: string; subtitle?: string }[];
  active: string;
  onChange: (key: string) => void;
  children: React.ReactNode;
  onLogout: () => void;
  actions?: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Map items to icons based on key
  const getIcon = (key: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      overview: <LayoutDashboard size={20} />,
      new: <UserPlus size={20} />,
      active: <Activity size={20} />,
      archive: <Archive size={20} />,
      patients: <Users size={20} />,
      reports: <FileText size={20} />,
      doctors: <Users size={20} />,
      staff: <Users size={20} />,
      settlements: <TrendingUp size={20} />,
      profits: <TrendingUp size={20} />,
      queue: <Activity size={20} />,
    };
    return iconMap[key] || <LayoutDashboard size={20} />;
  };

  const navItems: NavItem[] = items.map(item => ({
    key: item.key,
    label: item.label,
    icon: getIcon(item.key),
  }));

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Logo & Brand Area */}
      <div className={`border-b border-white/10 px-6 py-6 transition-all duration-300 ${isCollapsed ? 'px-3' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
            <span className="text-xl font-black text-white">د</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 text-right">
              <p className="text-[10px] font-bold tracking-wider text-emerald-300 uppercase">{roleBadge}</p>
              <h2 className="text-lg font-black text-white">{appTitle}</h2>
              <p className="text-xs text-slate-400">{profileName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onChange(item.key);
                  setIsSidebarOpen(false);
                }}
                className={`
                  group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white shadow-lg' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <span className={`transition-transform group-hover:scale-110 ${isActive ? 'text-emerald-400' : ''}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="flex-1 text-right text-sm font-medium">{item.label}</span>
                )}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 h-full w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl bg-red-500/10 px-3 py-3 text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300"
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="text-sm font-medium">تسجيل الخروج</span>}
        </button>
        
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mt-3 flex w-full items-center justify-center rounded-xl bg-white/5 px-3 py-2 text-slate-400 transition-all hover:bg-white/10"
        >
          <ChevronLeft size={18} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'} h-full shadow-2xl`}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Modern Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/50">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm"
              >
                <Menu size={20} />
              </button>
              
              {/* Mobile Brand */}
              <div className="lg:hidden">
                <p className="text-xs font-bold text-emerald-600">{roleBadge}</p>
                <h1 className="text-lg font-black text-slate-900">{appTitle}</h1>
              </div>
            </div>

            {/* Actions Area */}
            <div className="flex items-center gap-2">
              {/* Today's Date Badge */}
              <div className="hidden md:flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
                <Calendar size={14} className="text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">
                  {new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              {actions}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 animate-in slide-in-from-right shadow-2xl">
            <div className="h-full relative">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute left-3 top-3 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur"
              >
                <X size={20} />
              </button>
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}