'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  FolderKanban, 
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
  Search,
  ChevronRight,
  ExternalLink,
  Phone,
  ShieldCheck,
  Scale,
  RotateCcw,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { INITIAL_CASES } from '@/lib/data';
import { PROCESS_STAGES } from '@/lib/constants';
import { ClientCase } from '@/lib/types';

// The 3 Human-Friendly Operational Phases
const WORKFLOW_PHASES = [
  {
    id: 'all',
    label: 'All Active Matters',
    shortLabel: 'All Cases',
    description: 'Master legal docket of all active property files',
    stages: PROCESS_STAGES.map(s => s.id),
  },
  {
    id: 'intake',
    label: 'Phase 1: Intake & 80% Advance',
    shortLabel: 'Intake & Advance',
    description: 'Enquiry, initial consultation & 80% advance fee collection',
    stages: ['1_ENQUIRY', '2_CALL', '3_WELCOME_ADVANCE'],
  },
  {
    id: 'scrutiny',
    label: 'Phase 2: Legal Scrutiny & EC Search',
    shortLabel: 'Scrutiny & Job Card',
    description: '30-Yr EC indexing, revenue patta/chitta verification & advocate review',
    stages: ['4_JOB_CARD', '5_PROVISIONAL_VERIFICATION', '6_FINAL_REPORT'],
  },
  {
    id: 'delivery',
    label: 'Phase 3: Client Sign-Off & Delivery',
    shortLabel: 'Sign-Off & Delivery',
    description: 'Watermarked preview, 20% balance payment & sealed courier dispatch',
    stages: ['7_LOW_RES_PREVIEW', '8_DELIVERED'],
  }
];

// Helper to provide human-readable next action descriptions
const getNextActionLabel = (stageIndex: number) => {
  switch (stageIndex) {
    case 0: return 'Advance: Discovery Call';
    case 1: return 'Advance: Welcome & 80% Advance';
    case 2: return 'Advance: Open Job Card & EC';
    case 3: return 'Advance: Advocate Review';
    case 4: return 'Advance: Assemble Report';
    case 5: return 'Advance: Issue Client Preview';
    case 6: return 'Advance: Collect 20% & Courier';
    default: return 'Completed & Dispatched';
  }
};

export default function AdminPipelinePage() {
  const [cases, setCases] = useState<ClientCase[]>(INITIAL_CASES);
  const [activePhase, setActivePhase] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdatingStage, setIsUpdatingStage] = useState<string | null>(null);
  
  // Real-time Action Feedback Banner
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Auto-dismiss notice after 5 seconds
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  // Load latest cases from Database on mount
  useEffect(() => {
    fetch('/api/cases')
      .then(res => res.json())
      .then(result => {
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          setCases(prev => {
            return result.data.map((dbRow: any) => {
              const existing = prev.find(p => p.id === dbRow.id);
              const stageIndex = (dbRow.current_stage || 1) - 1;
              const stageId = PROCESS_STAGES[stageIndex]?.id || '1_ENQUIRY';

              if (existing) {
                return {
                  ...existing,
                  currentStage: stageId,
                  advancePaid: dbRow.payment_status === 'advance_paid' || dbRow.payment_status === 'fully_paid',
                  balancePaid: dbRow.payment_status === 'fully_paid',
                };
              }

              return {
                id: dbRow.id,
                clientName: dbRow.client_name,
                clientPhone: dbRow.client_phone,
                clientEmail: dbRow.client_email,
                serviceRequired: dbRow.service_package,
                district: dbRow.district,
                surveyNumber: dbRow.survey_number || '',
                totalAgreedCost: dbRow.total_fee || 6500,
                advanceAmount: dbRow.advance_amount || 5200,
                advancePaid: dbRow.payment_status === 'advance_paid' || dbRow.payment_status === 'fully_paid',
                balanceAmount: dbRow.balance_amount || 1300,
                balancePaid: dbRow.payment_status === 'fully_paid',
                currentStage: stageId,
                createdAt: dbRow.created_at,
                updatedAt: dbRow.updated_at,
                ecRecords: [],
                parentDocs: [],
                currentDoc: {
                  id: 'curr_1',
                  pattaNumber: '',
                  pattaType: 'Individual',
                  pattaHolder: dbRow.client_name,
                  fmbVerified: false,
                  tslrVerified: false,
                  revenueStatus: 'Clear',
                  notes: '',
                },
                legalOpinion: {
                  marketableTitle: 'Pending Verification',
                  encumbranceStatus: 'Nil Encumbrance',
                  revenueCompliance: 'Full Patta Available',
                  keyFindings: [],
                  recommendations: [],
                  advocateSignoff: false,
                },
                uploadedFiles: [],
              };
            });
          });
        }
      })
      .catch(err => {
        console.warn('Database fetch notice:', err);
      });
  }, []);

  // Advance or Rollback Stage
  const moveCaseStage = async (caseId: string, direction: 'next' | 'prev') => {
    setIsUpdatingStage(caseId);
    setActionNotice(null);

    try {
      const c = cases.find(item => item.id === caseId);
      if (!c) return;

      const currentIndex = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);
      let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (targetIndex < 0) targetIndex = 0;
      if (targetIndex >= PROCESS_STAGES.length) targetIndex = PROCESS_STAGES.length - 1;
      const targetStageNumber = targetIndex + 1;
      const targetStageObj = PROCESS_STAGES[targetIndex];

      // Optimistic Update
      setCases(prev => prev.map(item => {
        if (item.id !== caseId) return item;
        return {
          ...item,
          currentStage: targetStageObj.id,
          updatedAt: new Date().toISOString(),
        };
      }));

      // Sync with SQL Database
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStage: targetStageNumber,
          notes: `Updated to Step ${targetStageNumber}: ${targetStageObj.shortName}`,
          triggeredBy: 'Advocate A.K. Saravanan',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server failed to update stage.');
      }

      setActionNotice({
        type: 'success',
        message: `✓ Case ${caseId} (${c.clientName}) successfully updated to Step ${targetStageNumber}: ${targetStageObj.shortName}.`,
      });
    } catch (err: any) {
      console.error('Failed to update stage:', err);
      setActionNotice({
        type: 'error',
        message: `✗ Error updating case: ${err.message || 'Please check your connection.'}`,
      });
    } finally {
      setIsUpdatingStage(null);
    }
  };

  // Phase counts calculation
  const phaseCounts = useMemo(() => {
    const intakeStages = ['1_ENQUIRY', '2_CALL', '3_WELCOME_ADVANCE'];
    const scrutinyStages = ['4_JOB_CARD', '5_PROVISIONAL_VERIFICATION', '6_FINAL_REPORT'];
    const deliveryStages = ['7_LOW_RES_PREVIEW', '8_DELIVERED'];

    return {
      all: cases.length,
      intake: cases.filter(c => intakeStages.includes(c.currentStage)).length,
      scrutiny: cases.filter(c => scrutinyStages.includes(c.currentStage)).length,
      delivery: cases.filter(c => deliveryStages.includes(c.currentStage)).length,
    };
  }, [cases]);

  // Filtered cases calculation
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // 1. Phase Filter
      if (activePhase !== 'all') {
        const phaseObj = WORKFLOW_PHASES.find(p => p.id === activePhase);
        if (phaseObj && !phaseObj.stages.includes(c.currentStage)) {
          return false;
        }
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = c.id.toLowerCase().includes(q);
        const matchesName = c.clientName.toLowerCase().includes(q);
        const matchesPhone = c.clientPhone.includes(q);
        const matchesDistrict = c.district.toLowerCase().includes(q);
        const matchesSurvey = (c.surveyNumber || '').toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPhone && !matchesDistrict && !matchesSurvey) {
          return false;
        }
      }

      return true;
    });
  }, [cases, activePhase, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP HEADER & NEW INTAKE ACTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
              Legal Case Pipeline
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400 font-mono text-xs flex items-center gap-1.5 font-bold">
              <Scale className="w-3.5 h-3.5" />
              <span>Advocate Desk</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Track title verification matters across Tamil Nadu — from enquiry to 30-year EC scrutiny, Patta analysis, and final sealed opinion dispatch.
          </p>
        </div>

        <Link
          href="/admin/new-case"
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-xs shrink-0 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Client Intake</span>
        </Link>
      </div>

      {/* ACTION FEEDBACK TOAST / BANNER */}
      {actionNotice && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
          actionNotice.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-500/50 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. INTUITIVE TOP METRIC TABS (Linear Style Operational Filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {WORKFLOW_PHASES.map((phase) => {
          const count = phaseCounts[phase.id as keyof typeof phaseCounts];
          const isSelected = activePhase === phase.id;

          return (
            <button
              key={phase.id}
              onClick={() => setActivePhase(phase.id)}
              className={`text-left p-3.5 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/60 dark:bg-zinc-900 border-blue-500/60 shadow-xs ring-1 ring-blue-500/30'
                  : 'bg-white dark:bg-[#121215] border-slate-200/90 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700/80 hover:bg-slate-50/50 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-zinc-400'
                }`}>
                  {phase.shortLabel}
                </span>
                <span className={`px-2 py-0.2 rounded-full text-xs font-mono font-bold ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                  {count}
                </span>
              </div>

              <div className="mt-2">
                <div className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  {phase.label.split(':')[0]}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                  {phase.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. SEARCH BAR & DOCKET COUNTER */}
      <div className="bg-white dark:bg-[#121215] border border-slate-200/90 dark:border-zinc-800/80 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by client name, mobile, case ID, survey no... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 self-end sm:self-center">
          <span>
            Showing <strong className="text-slate-900 dark:text-zinc-200">{filteredCases.length}</strong> of {cases.length} active legal matters
          </span>

          {(activePhase !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setActivePhase('all');
                setSearchQuery('');
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN DOCKET CASES LIST: Linear-Style High-Legibility Case Cards */}
      {filteredCases.length === 0 ? (
        /* Friendly Empty State with Caseload Breakdown */
        <div className="bg-white dark:bg-[#121215] border border-slate-200/90 dark:border-zinc-800/80 rounded-2xl p-8 sm:p-12 text-center shadow-xs space-y-4 max-w-xl mx-auto my-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6 text-slate-400" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              {searchQuery ? `No Matters Match "${searchQuery}"` : 'No Cases Active in this Phase'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? 'Check for spelling typos or try searching by mobile number or district.'
                : 'All your other active property cases are moving forward in other stages.'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => {
                setActivePhase('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Show All {cases.length} Cases</span>
            </button>

            <Link
              href="/admin/new-case"
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-xs border border-slate-200 dark:border-zinc-700 transition"
            >
              + Create New Docket
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((c) => {
            const currentStageObj = PROCESS_STAGES.find(s => s.id === c.currentStage) || PROCESS_STAGES[0];
            const stageIndex = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);
            const progressPct = Math.round(((stageIndex + 1) / PROCESS_STAGES.length) * 100);
            const isUpdating = isUpdatingStage === c.id;

            return (
              <div 
                key={c.id}
                className="bg-white dark:bg-[#121215] border border-slate-200/90 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700/80 rounded-xl p-4 transition-all shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 group"
              >
                {/* 1. Case Identification */}
                <div className="space-y-1 min-w-[280px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                      {c.id}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      {c.district}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">• {c.serviceRequired || 'Title Scrutiny'}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {c.clientName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                    <a
                      href={`tel:${c.clientPhone}`}
                      className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono text-[11px]"
                      title="Click to dial client"
                    >
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{c.clientPhone}</span>
                    </a>

                    <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{c.surveyNumber ? `S.F. No. ${c.surveyNumber}` : c.district}</span>
                    </div>
                  </div>
                </div>

                {/* 2. SOP Stage Progress & Description */}
                <div className="flex-1 max-w-xl space-y-2 bg-slate-50 dark:bg-zinc-950/70 p-3 rounded-lg border border-slate-100 dark:border-zinc-800/70">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        Step {currentStageObj.stepNumber} of 8: {currentStageObj.shortName}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                      {progressPct}% Completed
                    </span>
                  </div>

                  {/* 8-Segment Progress Meter */}
                  <div className="grid grid-cols-8 gap-1 h-1.5 w-full">
                    {PROCESS_STAGES.map((s, idx) => (
                      <div
                        key={s.id}
                        title={`Step ${s.stepNumber}: ${s.shortName}`}
                        className={`rounded-full transition-all ${
                          idx < stageIndex
                            ? 'bg-emerald-500'
                            : idx === stageIndex
                            ? 'bg-blue-600 dark:bg-blue-400 shadow-xs'
                            : 'bg-slate-200 dark:bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Plain-English Explanation & Financial Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] pt-0.5">
                    <span className="text-slate-500 dark:text-zinc-400 truncate max-w-xs">
                      {currentStageObj.description}
                    </span>

                    <span className={`font-mono text-[10px] font-semibold self-start sm:self-auto ${
                      c.advancePaid 
                        ? 'text-emerald-700 dark:text-emerald-400' 
                        : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      {c.advancePaid 
                        ? (c.balancePaid ? '✓ Fully Settled' : '✓ 80% Advance Paid') 
                        : '⏳ Advance Due: ₹' + (c.totalAgreedCost * 0.8).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* 3. Primary Advocate Action Hub */}
                <div className="flex items-center gap-2 self-start xl:self-center shrink-0 flex-wrap">
                  {/* Step Backward (if mistake was made) */}
                  <button
                    type="button"
                    disabled={stageIndex === 0 || isUpdating}
                    onClick={() => moveCaseStage(c.id, 'prev')}
                    className="p-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold disabled:opacity-20 transition border border-slate-200 dark:border-zinc-700/60 shadow-xs"
                    title="Move back 1 milestone"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* PRIMARY ACTION: Open Job Card & Scrutiny Workspace */}
                  <Link
                    href={`/admin/cases/${c.id}/job-card`}
                    className="px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-blue-700 dark:text-blue-400 text-xs font-bold transition flex items-center gap-1.5 shadow-xs hover:border-blue-400"
                    title="Open Document Scrutiny, EC Register & Revenue Records"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Job Card</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  {/* Step Forward Action Button */}
                  <button
                    type="button"
                    disabled={stageIndex === PROCESS_STAGES.length - 1 || isUpdating}
                    onClick={() => moveCaseStage(c.id, 'next')}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-20 transition flex items-center gap-1.5"
                    title="Advance case to next milestone"
                  >
                    <span>{getNextActionLabel(stageIndex)}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Client Tracker Link */}
                  <Link
                    href={`/track/${c.id}`}
                    target="_blank"
                    className="p-2 rounded-lg bg-white dark:bg-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 text-xs transition border border-slate-200 dark:border-zinc-800 shadow-xs"
                    title="Open live client tracking view in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
