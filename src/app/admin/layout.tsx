'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Scale, 
  Kanban, 
  FolderKanban, 
  FileText, 
  PlusCircle, 
  CheckSquare, 
  Users, 
  CreditCard, 
  ExternalLink,
  ShieldAlert,
  Inbox,
  Search,
  Command,
  Activity,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [newEnquiryCount, setNewEnquiryCount] = useState<number>(0);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Poll or fetch pending enquiry count
  useEffect(() => {
    fetch('/api/enquiries')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const newCount = data.data.filter((e: any) => e.status === 'new').length;
          setNewEnquiryCount(newCount);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      root.classList.add('light');
      setIsDark(false);
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  const navItems = [
    { label: 'Overview', href: '/admin', icon: FolderKanban, shortcut: '⌘1' },
    { 
      label: 'Incoming Enquiries', 
      href: '/admin/enquiries', 
      icon: Inbox, 
      shortcut: '⌘2',
      badge: newEnquiryCount > 0 ? newEnquiryCount : undefined,
    },
    { label: 'Case Pipeline', href: '/admin/pipeline', icon: Kanban, shortcut: '⌘3' },
    { label: 'New Client Intake', href: '/admin/new-case', icon: PlusCircle, shortcut: '⌘4' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row antialiased transition-colors duration-150">
      {/* Primary Sidebar - Clean Light Theme with Navy/Blue Accents */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 z-30 shadow-sm md:shadow-none">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">AKS LEGAL</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  ERP
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Due Diligence Platform</span>
            </div>
          </Link>
        </div>

        {/* Global Quick Search Pill */}
        <div className="px-3 pt-4 pb-2">
          <Link
            href="/admin/pipeline"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search cases...</span>
            </div>
            <kbd className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
              ⌘K
            </kbd>
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="p-3 flex md:flex-col overflow-x-auto gap-1 flex-shrink-0 flex-1 border-b md:border-b-0 border-slate-200 dark:border-slate-800">
          <div className="hidden md:block px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Workspaces
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all whitespace-nowrap flex-shrink-0 group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-semibold border border-blue-200/80 dark:border-blue-900/60 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.badge !== undefined && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-mono shadow-xs animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  <span className="hidden md:inline font-mono text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.shortcut}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Advocate Profile & Edge Beacon Footer */}
        <div className="hidden md:block p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs shrink-0">
                AK
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">Adv. A.K. Saravanan</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">MS/1245/2005 • Active</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" title="D1 Edge Connected" />
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <Link
                href="/"
                className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 font-medium"
              >
                <span>Client View</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
              <span className="text-slate-400 font-mono text-[10px]">Cloudflare D1</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Clean Light Sticky Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-20 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">SOP Engine:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 truncate max-w-[200px] sm:max-w-none">
              Tamil Nadu 8-Stage Legal Title Scrutiny
            </span>
            <span className="hidden lg:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="hidden lg:inline text-[11px] text-slate-500 dark:text-slate-400">
              30-Yr Chain &amp; Revenue Mutation Validation
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Toggle Light / Dark Mode"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </button>

            <a 
              href="https://akspropertychecklist.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-zinc-200 flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="hidden sm:inline font-medium">Public Site</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <Link
              href="/admin/new-case"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs shadow-blue-500/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Docket</span>
            </Link>

            <Link
              href="/login"
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
            >
              Sign Out
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
