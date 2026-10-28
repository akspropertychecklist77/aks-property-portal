'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Kanban, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  FileText,
  CreditCard,
  PlusCircle,
  AlertCircle,
  Filter,
  Search,
  LayoutList,
  Columns3,
  Layers,
  ChevronRight,
  ExternalLink,
  Phone,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { INITIAL_CASES } from '@/lib/data';
import { PROCESS_STAGES } from '@/lib/constants';
import { ClientCase, ProcessStage } from '@/lib/types';

// The 3 Operational Phases grouping the 8 SOP milestones
const WORKFLOW_PHASES = [
  {
    id: 'intake',
    title: 'Phase 1: Client Intake & Onboarding',
    description: 'Enquiry, Requirement Assessment & 80% Advance',
    stages: ['1_ENQUIRY', '2_CALL', '3_WELCOME_ADVANCE'],
    badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10'
  },
  {
    id: 'scrutiny',
    title: 'Phase 2: Legal Scrutiny & Production',
    description: '30-Yr EC Indexing, Parent Deeds Chain & Advocate Saravanan Review',
    stages: ['4_JOB_CARD', '5_PROVISIONAL_VERIFICATION', '6_FINAL_REPORT'],
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10'
  },
  {
    id: 'delivery',
    title: 'Phase 3: Billing & Final Dispatch',
    description: 'Watermarked Preview, 20% Balance Payment & Physical Courier Delivery',
    stages: ['7_LOW_RES_PREVIEW', '8_DELIVERED'],
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
  }
];

export default function AdminPipelinePage() {
  const [cases, setCases] = useState<ClientCase[]>(INITIAL_CASES);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'stepper_table' | 'three_phase' | 'classic_board'>('stepper_table');

  const moveCaseStage = (caseId: string, direction: 'next' | 'prev') => {
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const currentIndex = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);
      let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (targetIndex < 0) targetIndex = 0;
      if (targetIndex >= PROCESS_STAGES.length) targetIndex = PROCESS_STAGES.length - 1;
      return {
        ...c,
        currentStage: PROCESS_STAGES[targetIndex].id,
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  // Filter cases based on selected stage and search query
  const filteredCases = cases.filter(c => {
    const matchesStage = selectedStageFilter === 'ALL' || c.currentStage === selectedStageFilter;
    const matchesSearch = 
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientPhone.includes(searchQuery) ||
      c.surveyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.district.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Legal Workflow Pipeline</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
              8-Stage Standard
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track title verification from initial enquiry to 80% advance, advocate scrutiny, and final courier delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-sm">
            <button
              onClick={() => setViewMode('stepper_table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'stepper_table'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Modern Stepper + Smart Table (Zero Horizontal Scroll)"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Process Flow</span>
            </button>

            <button
              onClick={() => setViewMode('three_phase')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'three_phase'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="3-Phase Kanban (Fits 100% on any screen)"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">3-Phase Board</span>
            </button>

            <button
              onClick={() => setViewMode('classic_board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'classic_board'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Classic 8-Column Horizontal Board"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">8-Columns</span>
            </button>
          </div>

          <Link
            href="/admin/new-case"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Intake</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 8-STAGE INTERACTIVE CHEVRON PROCESS BAR (Zero-Scroll Pipeline Overview)  */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">Milestone Stepper:</span>
            <span className="text-slate-400 font-normal">Click any step to filter cases</span>
          </div>
          {selectedStageFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedStageFilter('ALL')}
              className="text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
            >
              Clear Filter (Show All {cases.length} Cases)
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {PROCESS_STAGES.map((stage) => {
            const count = cases.filter(c => c.currentStage === stage.id).length;
            const isSelected = selectedStageFilter === stage.id;
            const hasCases = count > 0;

            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStageFilter(isSelected ? 'ALL' : stage.id)}
                className={`text-left p-2.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                    : hasCases
                    ? 'bg-slate-800/90 border-amber-500/40 text-slate-100 hover:border-amber-400'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    isSelected ? 'text-slate-950' : 'text-amber-400'
                  }`}>
                    Step {stage.stepNumber}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isSelected
                      ? 'bg-slate-950 text-amber-400'
                      : hasCases
                      ? 'bg-amber-500 text-slate-950 font-extrabold'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </div>
                <div className="text-xs font-bold leading-tight line-clamp-1">
                  {stage.shortName}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by client, ID, phone, or survey number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="text-xs text-slate-400 self-end sm:self-center">
          Showing <span className="font-bold text-white">{filteredCases.length}</span> of {cases.length} cases
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: PROCESS FLOW TABLE / STEPPER (RECOMMENDED - ZERO SCROLL)          */}
      {/* ========================================================================= */}
      {viewMode === 'stepper_table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800">
            {filteredCases.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No legal cases found matching this criteria.
              </div>
            ) : (
              filteredCases.map((c) => {
                const currentStageObj = PROCESS_STAGES.find(s => s.id === c.currentStage) || PROCESS_STAGES[0];
                const stageIndex = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);
                const progressPct = Math.round(((stageIndex + 1) / PROCESS_STAGES.length) * 100);

                return (
                  <div key={c.id} className="p-5 hover:bg-slate-850 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Case & Client Info */}
                    <div className="space-y-1.5 min-w-[280px]">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                          {c.id}
                        </span>
                        <span className="text-xs font-bold text-slate-300">{c.district}</span>
                        <span className="text-[10px] text-slate-500">• {c.serviceRequired}</span>
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight">{c.clientName}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{c.village ? `${c.village}, ${c.district}` : c.district} ({c.surveyNumber})</span>
                      </p>
                    </div>

                    {/* Middle: Step Progress Indicator */}
                    <div className="flex-1 max-w-md space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          Step {currentStageObj.stepNumber}: {currentStageObj.shortName}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px] font-bold">
                          {progressPct}% Done
                        </span>
                      </div>

                      {/* Mini 8-Segment Connected Progress Bar */}
                      <div className="grid grid-cols-8 gap-1 h-2 w-full">
                        {PROCESS_STAGES.map((s, idx) => (
                          <div
                            key={s.id}
                            title={`Step ${s.stepNumber}: ${s.shortName}`}
                            className={`rounded-full transition-all ${
                              idx < stageIndex
                                ? 'bg-emerald-500'
                                : idx === stageIndex
                                ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                                : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span className="truncate max-w-[280px]">{currentStageObj.clientVisibleTitle}</span>
                        <span className={c.advancePaid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {c.advancePaid ? '80% Paid (₹' + (c.totalAgreedCost * 0.8).toLocaleString() + ')' : 'Adv. Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Quick Stage Advancement & Job Card Actions */}
                    <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                      <button
                        type="button"
                        disabled={stageIndex === 0}
                        onClick={() => moveCaseStage(c.id, 'prev')}
                        className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-20 transition"
                        title="Move back 1 step"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>

                      <Link
                        href={`/admin/cases/${c.id}/job-card`}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-amber-400 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <span>Job Card</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        disabled={stageIndex === PROCESS_STAGES.length - 1}
                        onClick={() => moveCaseStage(c.id, 'next')}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/20 disabled:opacity-20 transition flex items-center gap-1.5"
                        title="Advance to next step"
                      >
                        <span>Advance Step</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: 3-PHASE GROUPED KANBAN (Fits cleanly on all desktop/tablets)      */}
      {/* ========================================================================= */}
      {viewMode === 'three_phase' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {WORKFLOW_PHASES.map((phase) => {
            const phaseCases = filteredCases.filter(c => phase.stages.includes(c.currentStage));

            return (
              <div key={phase.id} className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-xl">
                {/* Phase Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/50 rounded-t-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${phase.badgeColor}`}>
                      {phase.title.split(':')[0]}
                    </span>
                    <span className="text-xs font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                      {phaseCases.length} Cases
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-white mt-1">{phase.title.split(':')[1]}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{phase.description}</p>
                </div>

                {/* Phase Cards Container */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-20rem)]">
                  {phaseCases.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-600 border border-dashed border-slate-800/80 rounded-xl">
                      No cases active in this phase
                    </div>
                  ) : (
                    phaseCases.map((c) => {
                      const stageObj = PROCESS_STAGES.find(s => s.id === c.currentStage);
                      const stageIdx = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);

                      return (
                        <div key={c.id} className="p-4 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/50 transition-all space-y-3 shadow-md">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black text-amber-400">{c.id}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Step {stageObj?.stepNumber}: {stageObj?.shortName}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-white">{c.clientName}</h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{c.district} — {c.surveyNumber}</span>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                            <span className={c.advancePaid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {c.advancePaid ? '80% Paid' : 'Adv. Pending'}
                            </span>
                            <span className="text-slate-400 font-semibold">
                              ₹{c.totalAgreedCost.toLocaleString()}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-1">
                            <button
                              type="button"
                              disabled={stageIdx === 0}
                              onClick={() => moveCaseStage(c.id, 'prev')}
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-20 transition"
                              title="Previous Step"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              href={`/admin/cases/${c.id}/job-card`}
                              className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-400 transition"
                            >
                              Job Card →
                            </Link>

                            <button
                              type="button"
                              disabled={stageIdx === PROCESS_STAGES.length - 1}
                              onClick={() => moveCaseStage(c.id, 'next')}
                              className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-20 transition"
                              title="Next Step"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: CLASSIC 8-COLUMN HORIZONTAL BOARD (Preserved for full overview)    */}
      {/* ========================================================================= */}
      {viewMode === 'classic_board' && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
          {PROCESS_STAGES.map((stage, idx) => {
            const stageCases = filteredCases.filter(c => c.currentStage === stage.id);

            return (
              <div 
                key={stage.id}
                className="w-72 flex-shrink-0 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col max-h-[calc(100vh-16rem)] shadow-lg"
              >
                <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      Step {stage.stepNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      {stageCases.length}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-xs text-white mt-1.5 truncate">{stage.shortName}</h3>
                </div>

                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {stageCases.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-600 border border-dashed border-slate-800/80 rounded-xl">
                      No cases
                    </div>
                  ) : (
                    stageCases.map((c) => (
                      <div 
                        key={c.id}
                        className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/50 transition-all space-y-2.5 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-amber-400">{c.id}</span>
                          <span className="text-[10px] text-slate-400">{c.district}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white truncate">{c.clientName}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.surveyNumber}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveCaseStage(c.id, 'prev')}
                            className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-20"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <Link
                            href={`/admin/cases/${c.id}/job-card`}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-700 text-amber-400"
                          >
                            Job Card
                          </Link>
                          <button
                            type="button"
                            disabled={idx === PROCESS_STAGES.length - 1}
                            onClick={() => moveCaseStage(c.id, 'next')}
                            className="p-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-20"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
