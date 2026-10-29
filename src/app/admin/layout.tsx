'use client';

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
  Inbox
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/admin', icon: FolderKanban },
    { label: 'Incoming Enquiries', href: '/admin/enquiries', icon: Inbox },
    { label: 'Case Pipeline', href: '/admin/pipeline', icon: Kanban },
    { label: 'New Client Intake', href: '/admin/new-case', icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-white tracking-tight">AKS LEGAL OPS</span>
            <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wider">Advocate ERP</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2 sm:p-4 flex md:flex-col overflow-x-auto gap-1 sm:gap-1.5 flex-shrink-0 border-b md:border-b-0 border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Advocate badge - desktop only */}
        <div className="hidden md:block p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs">
              AK
            </div>
            <div>
              <p className="text-xs font-bold text-white">Advocate A.K. Saravanan</p>
              <p className="text-[10px] text-slate-400">Chief Legal Advisor</p>
            </div>
          </div>
          <Link
            href="/"
            className="mt-3 block text-[11px] text-slate-400 hover:text-white text-center py-1.5 rounded-lg bg-slate-800/80 transition-colors"
          >
            Switch to Client View →
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 px-4 sm:px-6 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>SOP:</span>
            <span className="font-bold text-amber-400 truncate max-w-[180px] sm:max-w-none">Legal Opinion 8-Stage Workflow</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <a 
              href="https://akspropertychecklist.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span className="hidden sm:inline">Public Website</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <Link
              href="/login"
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Sign Out
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

