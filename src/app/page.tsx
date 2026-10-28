'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, ArrowRight, FileText, CheckCircle2, Phone, Lock, Scale, Clock, Award } from 'lucide-react';
import { PROCESS_STAGES } from '@/lib/constants';

export default function PortalHomePage() {
  const [caseQuery, setCaseQuery] = useState('');
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseQuery.trim()) return;
    const cleanQuery = caseQuery.trim().toUpperCase();
    router.push(`/track/${cleanQuery}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
                AKS PROPERTY CHECKLIST
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-widest">
                  Legal Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Advocate A.K. Saravanan &amp; Associates (M.E. Energy, LLB)</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="https://akspropertychecklist.in" 
              className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:inline"
            >
              ← Back to Main Website
            </a>
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Advocate &amp; Staff Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero & Track Search */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-16 sm:py-24 flex flex-col justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mx-auto mb-6">
          <ShieldCheck className="w-4 h-4" />
          <span>Real-Time Case Tracking &amp; Legal Verification Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Track Your Property <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Legal Due Diligence</span> Live
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Transparent 8-stage verification tracking for Land Title Scrutiny, 30+ Year Sub-Registrar EC Indexing, and Revenue Patta Clearance.
        </p>

        {/* Tracking Card */}
        <div className="mt-10 max-w-xl mx-auto w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleTrack} className="space-y-4">
            <div className="text-left">
              <label htmlFor="case-search" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Enter Case ID or Registered Mobile Number
              </label>
              <div className="relative">
                <input
                  id="case-search"
                  type="text"
                  value={caseQuery}
                  onChange={(e) => setCaseQuery(e.target.value)}
                  placeholder="e.g. AK-2026-001 or 9842212345"
                  className="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  required
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-base shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Track My Case Live</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Quick Demo Links */}
          <div className="mt-4 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span>Quick Demo Cases:</span>
            <button 
              type="button"
              onClick={() => router.push('/track/AK-2026-001')} 
              className="text-amber-400 hover:text-amber-300 font-semibold underline"
            >
              AK-2026-001 (Completed)
            </button>
            <span>•</span>
            <button 
              type="button"
              onClick={() => router.push('/track/AK-2026-002')} 
              className="text-amber-400 hover:text-amber-300 font-semibold underline"
            >
              AK-2026-002 (Preview Ready)
            </button>
            <span>•</span>
            <button 
              type="button"
              onClick={() => router.push('/track/AK-2026-003')} 
              className="text-amber-400 hover:text-amber-300 font-semibold underline"
            >
              AK-2026-003 (In Job Card)
            </button>
          </div>
        </div>

        {/* 8-Stage Overview Grid */}
        <div className="mt-20 text-left">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Our 8-Step Legal Quality Standard</h2>
            <p className="mt-2 text-sm text-slate-400">Every property case follows strict advocate supervision through these milestones</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROCESS_STAGES.map((stage) => (
              <div 
                key={stage.id}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      Step {stage.stepNumber}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-slate-600" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-200">{stage.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{stage.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AKS Property Checklist. All Rights Reserved.</p>
          <p className="flex items-center gap-1.5 justify-center">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            Protected by Advocate-Client Confidentiality Privileges
          </p>
        </div>
      </footer>
    </div>
  );
}

