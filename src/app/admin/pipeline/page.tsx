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
  Filter,
  Search,
  LayoutList,
  Columns3,
  ChevronRight,
  ExternalLink,
  Phone,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Check,
  Building,
  Scale
} from 'lucide-react';
import { INITIAL_CASES } from '@/lib/data';
import { PROCESS_STAGES } from '@/lib/constants';
import { ClientCase } from '@/lib/types';

// The 3 Human-Friendly Operational Phases
const WORKFLOW_PHASES = [
  {
    id: 'all',
    title: 'All Active Matters',
    shortTitle: 'All Matters',
    description: 'Master legal docket of all active property verification files',
    badgeColor: 'border-slate-700 text-slate-300 bg-slate-800/60',
    stages: PROCESS_STAGES.map(s => s.id),
    icon: FolderKanban,
  },
  {
    id: 'intake',
    title: 'Phase 1: Intake & 80% Advance',
    shortTitle: 'Intake & Advance',
    description: 'Enquiry, initial consultation & 80% advance fee collection',
    badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    stages: ['1_ENQUIRY', '2_CALL', '3_WELCOME_ADVANCE'],
    icon: Clock,
  },
  {
    id: 'scrutiny',
    title: 'Phase 2: Legal Scrutiny & EC Search',
    shortTitle: 'Scrutiny & Job Card',
    description: '30-Yr EC indexing, revenue patta verification & advocate review',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    stages: ['4_JOB_CARD', '5_PROVISIONAL_VERIFICATION', '6_FINAL_REPORT'],
    icon: Scale,
  },
  {
    id: 'delivery',
    title: 'Phase 3: Client Sign-Off & Dispatch',
    shortTitle: 'Sign-Off & Delivery',
    description: 'Watermarked preview, balance payment & sealed courier delivery',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    stages: ['7_LOW_RES_PREVIEW', '8_DELIVERED'],
    icon: CheckCircle2,
  }
];

// Helper to provide human-readable next action descriptions
const getNextActionLabel = (stageIndex: number) => {
  switch (stageIndex) {
    case 0: return 'Advance: Discovery Call';
    case 1: return 'Advance: Welcome & 80% Fee';
    case 2: return 'Advance: Open Job Card & EC';
    case 3: return 'Advance: Advocate Scrutiny';
    case 4: return 'Advance: Assemble Report';
    case 5: return 'Advance: Issue Client Preview';
    case 6: return 'Advance: Collect 20% & Courier';
    default: return 'Completed & Dispatched';
  }
};

export default function AdminPipelinePage() {
  const [cases, setCases] = useState<ClientCase[]>(INITIAL_CASES);
  const [activePhaseTab, setActivePhaseTab] = useState<string>('all');
  const [specificStageFilter, setSpecificStageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [isUpdatingStage, setIsUpdatingStage] = useState<string | null>(null);

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
      .catch(err => console.log('Database fetch notice:', err));
  }, []);

  // Move stage forward or backward
  const moveCaseStage = async (caseId: string, direction: 'next' | 'prev') => {
    setIsUpdatingStage(caseId);
    try {
      const c = cases.find(item => item.id === caseId);
      if (!c) return;

      const currentIndex = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);
      let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (targetIndex < 0) targetIndex = 0;
      if (targetIndex >= PROCESS_STAGES.length) targetIndex = PROCESS_STAGES.length - 1;
      const targetStageNumber = targetIndex + 1;

      // Optimistic state update
      setCases(prev => prev.map(item => {
        if (item.id !== caseId) return item;
        return {
          ...item,
          currentStage: PROCESS_STAGES[targetIndex].id,
          updatedAt: new Date().toISOString(),
        };
      }));

      // Sync stage update directly into SQL database
      await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStage: targetStageNumber,
          notes: `Updated to Step ${targetStageNumber}: ${PROCESS_STAGES[targetIndex].shortName}`,
          triggeredBy: 'Advocate A.K. Saravanan',
        }),
      });
    } catch (err) {
      console.error('Failed to sync stage update:', err);
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
      if (activePhaseTab !== 'all') {
        const phaseObj = WORKFLOW_PHASES.find(p => p.id === activePhaseTab);
        if (phaseObj && !phaseObj.stages.includes(c.currentStage)) {
          return false;
        }
      }

      // 2. Specific Milestone Filter (if active)
      if (specificStageFilter !== 'ALL' && c.currentStage !== specificStageFilter) {
        return false;
      }

      // 3. Search Query Filter
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
  }, [cases, activePhaseTab, specificStageFilter, searchQuery]);

  // Selected stage object if filtering by specific step
  const activeSpecificStage = specificStageFilter !== 'ALL' 
    ? PROCESS_STAGES.find(s => s.id === specificStageFilter) 
    : null;

  // Reset all filters
  const resetAllFilters = () => {
    setActivePhaseTab('all');
    setSpecificStageFilter('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. PROFESSIONAL HEADER: Case Management & Operations Hub                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Legal Case Pipeline
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" />
              <span>Advocate Scrutiny Desk</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Track active property title verifications across Tamil Nadu — from enquiry to 30-year EC scrutiny, Patta analysis, and final sealed opinion dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* View Mode Toggle: Clean & Simple */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Organized Docket View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Docket List</span>
            </button>

            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'board'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="3-Phase Board View"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>3-Phase Board</span>
            </button>
          </div>

          <Link
            href="/admin/new-case"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Case Intake</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP METRIC CARDS: High-Level Overview with 1-Click Phase Selection    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {WORKFLOW_PHASES.map((phase) => {
          const Icon = phase.icon;
          const count = phaseCounts[phase.id as keyof typeof phaseCounts];
          const isSelected = activePhaseTab === phase.id && specificStageFilter === 'ALL';

          return (
            <button
              key={phase.id}
              onClick={() => {
                setActivePhaseTab(phase.id);
                setSpecificStageFilter('ALL');
              }}
              className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-br from-slate-900 to-slate-850 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  isSelected ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {phase.shortTitle}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  isSelected ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {count}
                  <span className="text-xs font-semibold text-slate-500 ml-1.5">
                    {count === 1 ? 'matter' : 'matters'}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Active View
                  </span>
                )}
              </div>

              <div className="mt-2 text-[11px] text-slate-400 line-clamp-1 leading-snug">
                {phase.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH & SPECIFIC MILESTONE SELECTOR (Clean, Human Ergonomics)        */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by client name, mobile, case ID, or survey no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Milestone Step Filter Dropdown & Quick Badges */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 whitespace-nowrap">Filter Step:</span>
            <select
              value={specificStageFilter}
              onChange={(e) => {
                setSpecificStageFilter(e.target.value);
                if (e.target.value !== 'ALL') {
                  // Auto-switch phase tab to 'all' so specific step isn't masked by phase
                  setActivePhaseTab('all');
                }
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors max-w-[240px]"
            >
              <option value="ALL">All 8 SOP Steps</option>
              {PROCESS_STAGES.map((s) => {
                const count = cases.filter(c => c.currentStage === s.id).length;
                return (
                  <option key={s.id} value={s.id}>
                    Step {s.stepNumber}: {s.shortName} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {(specificStageFilter !== 'ALL' || activePhaseTab !== 'all' || searchQuery) && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 shrink-0"
              title="Reset all filters and view full caseload"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Context Ribbon (if filtered) */}
      {(specificStageFilter !== 'ALL' || searchQuery || activePhaseTab !== 'all') && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-500">Showing:</span>
            <span className="font-bold text-white">{filteredCases.length}</span>
            <span>of {cases.length} total legal matters</span>

            {activeSpecificStage && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                Step {activeSpecificStage.stepNumber}: {activeSpecificStage.shortName}
              </span>
            )}

            {activePhaseTab !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                {WORKFLOW_PHASES.find(p => p.id === activePhaseTab)?.shortTitle}
              </span>
            )}

            {searchQuery && (
              <span className="text-slate-400">
                matching query <span className="text-amber-400 font-mono">"{searchQuery}"</span>
              </span>
            )}
          </div>

          <button
            onClick={resetAllFilters}
            className="text-amber-400 hover:text-amber-300 font-bold text-xs underline"
          >
            Show All {cases.length} Cases →
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT AREA: ZERO DEAD ENDS!                                    */}
      {/* ========================================================================= */}

      {/* CASE 1: ZERO RESULTS - FRIENDLY REASSURING STATE (NO SCARY VOID) */}
      {filteredCases.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-xl space-y-5 max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            {activeSpecificStage ? (
              <CheckCircle2 className="w-8 h-8 text-amber-400" />
            ) : (
              <Search className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-white tracking-tight">
              {activeSpecificStage 
                ? `No Cases Currently in Step ${activeSpecificStage.stepNumber}` 
                : searchQuery
                ? `No Matters Match "${searchQuery}"`
                : 'No Cases Found in this Phase'}
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
              {activeSpecificStage ? (
                <>
                  There are currently no files waiting at <span className="text-amber-400 font-semibold">{activeSpecificStage.title}</span>. 
                  All your other active property cases are advancing through other stages of legal diligence.
                </>
              ) : searchQuery ? (
                <>
                  We could not find any case matching that client name, phone, or survey number. Check for typos or reset your search.
                </>
              ) : (
                <>
                  No legal files are currently active in this operational phase.
                </>
              )}
            </p>
          </div>

          {/* Quick Active Caseload Breakdown for Context */}
          {cases.length > 0 && (
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Caseload Breakdown ({cases.length} Total):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Intake &amp; Advance:</span>
                  <span className="font-bold text-blue-400">{phaseCounts.intake} files</span>
                </div>
                <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">In Scrutiny (EC):</span>
                  <span className="font-bold text-amber-400">{phaseCounts.scrutiny} files</span>
                </div>
                <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 col-span-2">
                  <span className="text-slate-400">Delivery &amp; Dispatched:</span>
                  <span className="font-bold text-emerald-400">{phaseCounts.delivery} files</span>
                </div>
              </div>
            </div>
          )}

          {/* Reassuring Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={resetAllFilters}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Show All {cases.length} Active Matters</span>
            </button>

            <Link
              href="/admin/new-case"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Matter</span>
            </Link>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* ========================================================================= */
        /* VIEW 1: ORGANIZED DOCKET LIST VIEW (Ergonomic Legal Desk Layout)           */
        /* ========================================================================= */
        <div className="space-y-3">
          {filteredCases.map((c) => {
            const currentStageObj = PROCESS_STAGES.find(s => s.id === c.currentStage) || PROCESS_STAGES[0];
            const stageIndex = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);
            const progressPct = Math.round(((stageIndex + 1) / PROCESS_STAGES.length) * 100);
            const isUpdating = isUpdatingStage === c.id;

            return (
              <div 
                key={c.id} 
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition-all shadow-md hover:shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-5 group"
              >
                {/* 1. Case Docket Identification */}
                <div className="space-y-1.5 min-w-[280px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                      {c.id}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {c.district}
                    </span>
                    <span className="text-[10px] text-slate-500">• {c.serviceRequired || 'Title Scrutiny'}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors">
                    {c.clientName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <a
                      href={`tel:${c.clientPhone}`}
                      className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                      title="Click to dial client"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{c.clientPhone}</span>
                    </a>

                    <div className="flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{c.surveyNumber ? `S.F. No. ${c.surveyNumber}` : c.district}</span>
                    </div>
                  </div>
                </div>

                {/* 2. SOP Stage Progress & Description */}
                <div className="flex-1 max-w-xl space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="font-black text-amber-400">
                        Step {currentStageObj.stepNumber} of 8: {currentStageObj.shortName}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-slate-400">
                      {progressPct}% Completed
                    </span>
                  </div>

                  {/* 8-Segment Progress Meter */}
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

                  {/* Human-Friendly Stage Explanation & Financial Pill */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] pt-0.5">
                    <span className="text-slate-400 truncate max-w-xs">
                      {currentStageObj.description}
                    </span>

                    <span className={`font-bold self-start sm:self-auto ${
                      c.advancePaid 
                        ? (c.balancePaid ? 'text-emerald-400' : 'text-emerald-400/90') 
                        : 'text-amber-400/90'
                    }`}>
                      {c.advancePaid 
                        ? (c.balancePaid ? '✓ Fully Settled' : '✓ 80% Advance Paid') 
                        : '⏳ 80% Advance Due (₹' + (c.totalAgreedCost * 0.8).toLocaleString() + ')'}
                    </span>
                  </div>
                </div>

                {/* 3. Advocate 1-Click Action Workspace Hub */}
                <div className="flex items-center gap-2 self-start xl:self-center shrink-0 flex-wrap">
                  {/* Step Backward (if mistake was made) */}
                  <button
                    type="button"
                    disabled={stageIndex === 0 || isUpdating}
                    onClick={() => moveCaseStage(c.id, 'prev')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-20 transition border border-slate-700/60"
                    title="Move back to previous step"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* PRIMARY ACTION: Open Job Card & Document Workspace */}
                  <Link
                    href={`/admin/cases/${c.id}/job-card`}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm hover:border-amber-500/40"
                    title="Open Document Scrutiny, EC Register & Revenue Records"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open Job Card</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  {/* Step Forward Action Button */}
                  <button
                    type="button"
                    disabled={stageIndex === PROCESS_STAGES.length - 1 || isUpdating}
                    onClick={() => moveCaseStage(c.id, 'next')}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 disabled:opacity-20 transition flex items-center gap-1.5"
                    title={`Advance case to next milestone`}
                  >
                    <span>{getNextActionLabel(stageIndex)}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Live Client Tracker Link */}
                  <Link
                    href={`/track/${c.id}`}
                    target="_blank"
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition border border-slate-800"
                    title="Open live client tracking view in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: 3-PHASE BOARD (Spacious, Zero-Overload Visual Kanban)             */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {WORKFLOW_PHASES.filter(p => p.id !== 'all').map((phase) => {
            const phaseCases = filteredCases.filter(c => phase.stages.includes(c.currentStage));

            return (
              <div 
                key={phase.id} 
                className="bg-slate-900 border border-slate-800 rounded-3xl flex flex-col shadow-xl overflow-hidden"
              >
                {/* Phase Header */}
                <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${phase.badgeColor}`}>
                      {phase.shortTitle}
                    </span>
                    <span className="text-xs font-black bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full">
                      {phaseCases.length} Matters
                    </span>
                  </div>
                  <h3 className="font-black text-base text-white">{phase.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{phase.description}</p>
                </div>

                {/* Phase Case Cards */}
                <div className="p-4 space-y-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-18rem)]">
                  {phaseCases.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl p-6">
                      <p className="font-medium">No cases currently in this phase</p>
                      <button
                        onClick={resetAllFilters}
                        className="mt-2 text-amber-400 hover:text-amber-300 text-[11px] underline font-bold"
                      >
                        View all active matters
                      </button>
                    </div>
                  ) : (
                    phaseCases.map((c) => {
                      const stageObj = PROCESS_STAGES.find(s => s.id === c.currentStage);
                      const stageIdx = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);

                      return (
                        <div 
                          key={c.id} 
                          className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/50 transition-all space-y-3 shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {c.id}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Step {stageObj?.stepNumber}: {stageObj?.shortName}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-white">{c.clientName}</h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{c.district} — {c.surveyNumber || 'S.F. Pending'}</span>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                            <span className={c.advancePaid ? 'text-emerald-400 font-bold' : 'text-amber-400/90 font-bold'}>
                              {c.advancePaid ? '✓ 80% Paid' : '⏳ Advance Pending'}
                            </span>
                            <span className="text-slate-400 font-semibold">
                              ₹{c.totalAgreedCost.toLocaleString()}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-1.5">
                            <button
                              type="button"
                              disabled={stageIdx === 0}
                              onClick={() => moveCaseStage(c.id, 'prev')}
                              className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-20 transition"
                              title="Previous Step"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              href={`/admin/cases/${c.id}/job-card`}
                              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-700 hover:bg-slate-600 text-amber-400 transition flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Job Card</span>
                            </Link>

                            <button
                              type="button"
                              disabled={stageIdx === PROCESS_STAGES.length - 1}
                              onClick={() => moveCaseStage(c.id, 'next')}
                              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-20 transition"
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
    </div>
  );
}
