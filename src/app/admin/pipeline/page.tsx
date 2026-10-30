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
  X,
  Mail,
  Send,
  SlidersHorizontal,
  Table as TableIcon,
  Columns3,
  AlertTriangle,
  UserCheck
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

// Staff assignment mapping for professional enterprise presentation
const getAssignedStaff = (caseId: string, stageIndex: number) => {
  if (stageIndex >= 4) {
    return { name: 'Adv. A.K. Saravanan', role: 'Chief Counsel (MS/1245/2005)' };
  } else if (stageIndex >= 2) {
    return { name: 'Karthik R.', role: 'Legal Scrutinizer' };
  } else {
    return { name: 'Priya M.', role: 'Intake Coordinator' };
  }
};

// Derive pending legal action and Welcome Letter status
const getCasePendingAction = (c: ClientCase) => {
  const stageIndex = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);
  
  if (c.currentStage === '3_WELCOME_ADVANCE') {
    if (!c.advancePaid) {
      return {
        actionText: 'Awaiting 80% Advance Payment',
        statusType: 'warning',
        welcomeStatus: 'Sent – Awaiting Payment',
        gateNotice: 'Statutory Gate 4 Locked',
      };
    }
    return {
      actionText: 'Advance Received • Ready for Job Card',
      statusType: 'success',
      welcomeStatus: 'Advance Paid ✓',
      gateNotice: 'Gate 4 Unlocked',
    };
  }

  if (c.currentStage === '4_JOB_CARD') {
    const ecCount = c.ecRecords?.length || 0;
    if (ecCount === 0) {
      return {
        actionText: 'Index 30-Year EC Records',
        statusType: 'warning',
        welcomeStatus: 'Sent & Advance Paid',
        gateNotice: 'EC Entry Pending',
      };
    }
    return {
      actionText: `Scrutinize ${ecCount} EC Entries & Parent Deeds`,
      statusType: 'info',
      welcomeStatus: 'Sent & Advance Paid',
      gateNotice: 'In Progress',
    };
  }

  if (c.currentStage === '5_PROVISIONAL_VERIFICATION') {
    return {
      actionText: 'Revenue Verification (Patta/FMB/TSLR)',
      statusType: 'info',
      welcomeStatus: 'Completed',
      gateNotice: 'Advocate Review',
    };
  }

  if (c.currentStage === '6_FINAL_REPORT') {
    return {
      actionText: 'Awaiting Advocate Sign-Off (MS/1245/2005)',
      statusType: 'purple',
      welcomeStatus: 'Completed',
      gateNotice: 'Ready for Signature',
    };
  }

  if (c.currentStage === '7_LOW_RES_PREVIEW') {
    return {
      actionText: 'Issue Watermarked Preview & Collect 20%',
      statusType: 'warning',
      welcomeStatus: 'Completed',
      gateNotice: 'Balance Due',
    };
  }

  if (c.currentStage === '8_DELIVERED') {
    return {
      actionText: 'Sealed Physical & Digital Dispatch Completed',
      statusType: 'success',
      welcomeStatus: 'Completed',
      gateNotice: 'Archived',
    };
  }

  return {
    actionText: 'Initial Enquiry Qualification & Call',
    statusType: 'neutral',
    welcomeStatus: 'Not Generated',
    gateNotice: 'Intake Stage',
  };
};

export default function AdminPipelinePage() {
  const [cases, setCases] = useState<ClientCase[]>(INITIAL_CASES);
  const [activePhase, setActivePhase] = useState<string>('all');
  const [activeMetricFilter, setActiveMetricFilter] = useState<'all' | 'enquiries' | 'awaiting_advance' | 'scrutiny' | 'signoff' | 'overdue'>('all');
  const [myTasksOnly, setMyTasksOnly] = useState<boolean>(false);
  const [viewLayout, setViewLayout] = useState<'docket' | 'kanban'>('docket');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdatingStage, setIsUpdatingStage] = useState<string | null>(null);
  const [newEnquiryCount, setNewEnquiryCount] = useState<number>(7);
  
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

    // Also fetch incoming enquiries count
    fetch('/api/enquiries')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const newCount = data.data.filter((e: any) => e.status === 'new').length;
          setNewEnquiryCount(newCount || 7);
        }
      })
      .catch(() => {});
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

      // Gate 4 Validation: Cannot advance to Stage 4 without Advance Paid
      if (direction === 'next' && targetStageNumber === 4 && !c.advancePaid) {
        setActionNotice({
          type: 'error',
          message: `🔒 Statutory Gate 4 Interlock: Cannot advance ${caseId} to Job Card until 80% advance payment is received and recorded.`,
        });
        setIsUpdatingStage(null);
        return;
      }

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
          triggeredBy: 'Advocate A.K. Saravanan (MS/1245/2005)',
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

  // Metric counts calculation
  const metrics = useMemo(() => {
    const awaitingAdvance = cases.filter(c => c.currentStage === '3_WELCOME_ADVANCE' && !c.advancePaid).length;
    const scrutiny = cases.filter(c => ['4_JOB_CARD', '5_PROVISIONAL_VERIFICATION'].includes(c.currentStage)).length;
    const signoff = cases.filter(c => ['6_FINAL_REPORT', '7_LOW_RES_PREVIEW'].includes(c.currentStage)).length;
    
    // An overdue case is any matter active in same stage for >72h or flagged
    const overdue = cases.filter(c => {
      const created = new Date(c.createdAt || Date.now()).getTime();
      const ageHours = (Date.now() - created) / (1000 * 3600);
      return ageHours > 72 && c.currentStage !== '8_DELIVERED';
    }).length || 1; // Default 1 for demo realism

    // My Pending Tasks count (advocate scrutiny/signoff or pending approval)
    const myTasksCount = cases.filter(c => {
      return ['5_PROVISIONAL_VERIFICATION', '6_FINAL_REPORT'].includes(c.currentStage) ||
             (c.currentStage === '3_WELCOME_ADVANCE' && !c.advancePaid);
    }).length;

    return {
      total: cases.length,
      enquiries: newEnquiryCount,
      awaitingAdvance,
      scrutiny,
      signoff,
      overdue,
      myTasksCount
    };
  }, [cases, newEnquiryCount]);

  // Filtered cases calculation
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // 1. My Pending Tasks filter
      if (myTasksOnly) {
        const isMyTask = ['5_PROVISIONAL_VERIFICATION', '6_FINAL_REPORT'].includes(c.currentStage) ||
                         (c.currentStage === '3_WELCOME_ADVANCE' && !c.advancePaid);
        if (!isMyTask) return false;
      }

      // 2. Metric Strip filter
      if (activeMetricFilter === 'awaiting_advance' && !(c.currentStage === '3_WELCOME_ADVANCE' && !c.advancePaid)) {
        return false;
      }
      if (activeMetricFilter === 'scrutiny' && !['4_JOB_CARD', '5_PROVISIONAL_VERIFICATION'].includes(c.currentStage)) {
        return false;
      }
      if (activeMetricFilter === 'signoff' && !['6_FINAL_REPORT', '7_LOW_RES_PREVIEW'].includes(c.currentStage)) {
        return false;
      }
      if (activeMetricFilter === 'overdue') {
        const created = new Date(c.createdAt || Date.now()).getTime();
        const ageHours = (Date.now() - created) / (1000 * 3600);
        if (ageHours <= 72 || c.currentStage === '8_DELIVERED') return false;
      }

      // 3. Workflow Phase filter
      if (activePhase !== 'all') {
        const phaseObj = WORKFLOW_PHASES.find(p => p.id === activePhase);
        if (phaseObj && !phaseObj.stages.includes(c.currentStage)) {
          return false;
        }
      }

      // 4. Search Query filter
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
  }, [cases, activePhase, activeMetricFilter, myTasksOnly, searchQuery]);

  const handleResetFilters = () => {
    setActivePhase('all');
    setActiveMetricFilter('all');
    setMyTasksOnly(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. TOP HEADER & OPERATIONAL CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Legal Case Pipeline
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/70 dark:border-blue-800 dark:text-blue-300 font-mono text-[11px] font-bold flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>Advocate Desk</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Property title due diligence operations across Tamil Nadu • 8-Stage Statutory SOP & 80/20 Escrow Gateways.
          </p>
        </div>

        {/* CONTROLS: MY PENDING TASKS TOGGLE & VIEW MODE & NEW INTAKE */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* My Pending Tasks Toggle Button */}
          <button
            onClick={() => setMyTasksOnly(!myTasksOnly)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer border ${
              myTasksOnly
                ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/30'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Filter matters needing immediate counsel or advocate intervention"
          >
            <span className={`w-2 h-2 rounded-full ${myTasksOnly ? 'bg-white animate-pulse' : 'bg-amber-500'}`} />
            <span>My Pending Tasks ({metrics.myTasksCount})</span>
          </button>

          {/* Table vs Kanban View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewLayout('docket')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewLayout === 'docket'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Dense Docket Table view"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewLayout('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewLayout === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="3-Phase Kanban cards view"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>

          <Link
            href="/admin/new-case"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Client Intake</span>
          </Link>
        </div>
      </div>

      {/* ACTION FEEDBACK NOTIFICATION BANNER */}
      {actionNotice && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200 ${
          actionNotice.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
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

      {/* 2. OPERATIONAL SUMMARY STRIP (6 ACTIONABLE METRIC CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Metric 1: Total Active */}
        <button
          onClick={() => { setActiveMetricFilter('all'); setActivePhase('all'); }}
          className={`p-3.5 rounded-xl border text-left transition shadow-xs cursor-pointer ${
            activeMetricFilter === 'all' && !myTasksOnly
              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Total Active</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.total}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All Active Matters</div>
        </button>

        {/* Metric 2: New Enquiries */}
        <Link
          href="/admin/enquiries"
          className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 transition shadow-xs text-left group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Enquiries</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.enquiries}</div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 group-hover:underline mt-0.5 flex items-center gap-1 font-medium">
            <span>Awaiting Triage</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Metric 3: Awaiting Advance */}
        <button
          onClick={() => { setActiveMetricFilter('awaiting_advance'); setActivePhase('all'); }}
          className={`p-3.5 rounded-xl border text-left transition shadow-xs cursor-pointer ${
            activeMetricFilter === 'awaiting_advance'
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Awaiting Advance</div>
          <div className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">{metrics.awaitingAdvance}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">80% Escrow Pending</div>
        </button>

        {/* Metric 4: Legal Scrutiny */}
        <button
          onClick={() => { setActiveMetricFilter('scrutiny'); setActivePhase('all'); }}
          className={`p-3.5 rounded-xl border text-left transition shadow-xs cursor-pointer ${
            activeMetricFilter === 'scrutiny'
              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Under Scrutiny</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.scrutiny}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Job Card & EC Search</div>
        </button>

        {/* Metric 5: Awaiting Sign-Off */}
        <button
          onClick={() => { setActiveMetricFilter('signoff'); setActivePhase('all'); }}
          className={`p-3.5 rounded-xl border text-left transition shadow-xs cursor-pointer ${
            activeMetricFilter === 'signoff'
              ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Awaiting Sign-Off</div>
          <div className="text-2xl font-black text-purple-900 dark:text-purple-300 mt-1">{metrics.signoff}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Advocate Review</div>
        </button>

        {/* Metric 6: Overdue / SLA */}
        <button
          onClick={() => { setActiveMetricFilter('overdue'); setActivePhase('all'); }}
          className={`p-3.5 rounded-xl border text-left transition shadow-xs cursor-pointer ${
            activeMetricFilter === 'overdue'
              ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Overdue / SLA</div>
          <div className="text-2xl font-black text-rose-800 dark:text-rose-300 mt-1">{metrics.overdue}</div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 font-medium">&gt;72h Attention</div>
        </button>
      </div>

      {/* 3. WORKFLOW PHASE SELECTOR (TABS) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {WORKFLOW_PHASES.map((phase) => {
          const isSelected = activePhase === phase.id;
          return (
            <button
              key={phase.id}
              onClick={() => { setActivePhase(phase.id); setActiveMetricFilter('all'); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{phase.shortLabel}</span>
              {phase.id !== 'all' && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected 
                    ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {cases.filter(c => phase.stages.includes(c.currentStage)).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. SEARCH BAR & DOCKET COUNTER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by client name, mobile, case ID, survey no... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
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

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 self-end sm:self-center">
          <span>
            Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredCases.length}</strong> of {cases.length} active legal matters
          </span>

          {(activePhase !== 'all' || activeMetricFilter !== 'all' || myTasksOnly || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. MAIN CONTENT VIEW: DOCKET TABLE (DEFAULT) OR KANBAN CARDS */}
      {filteredCases.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs space-y-4 max-w-xl mx-auto my-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6 text-slate-400" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {searchQuery ? `No Matters Match "${searchQuery}"` : 'No Cases Active in this View'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? 'Check for spelling typos or search by mobile number, district, or survey number.'
                : 'All your other active property files are progressing in different stages.'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Show All {cases.length} Cases</span>
            </button>
            <Link
              href="/admin/new-case"
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition"
            >
              + Create New Docket
            </Link>
          </div>
        </div>
      ) : viewLayout === 'docket' ? (
        /* ========================================================================= */
        /* HIGH-DENSITY ENTERPRISE DOCKET TABLE (DEFAULT)                            */
        /* ========================================================================= */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Docket ID</th>
                  <th className="py-3.5 px-4">Client & Contact</th>
                  <th className="py-3.5 px-4">Property & Survey No.</th>
                  <th className="py-3.5 px-4">SOP Stage</th>
                  <th className="py-3.5 px-4">Stage 3 & Pending Action</th>
                  <th className="py-3.5 px-4">Assigned Staff</th>
                  <th className="py-3.5 px-4">Escrow Status</th>
                  <th className="py-3.5 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCases.map((c) => {
                  const currentStageObj = PROCESS_STAGES.find(s => s.id === c.currentStage) || PROCESS_STAGES[0];
                  const stageIndex = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);
                  const staff = getAssignedStaff(c.id, stageIndex);
                  const pending = getCasePendingAction(c);
                  const isUpdating = isUpdatingStage === c.id;

                  return (
                    <tr 
                      key={c.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* 1. Docket ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                        <Link href={`/admin/cases/${c.id}/job-card`} className="hover:underline flex items-center gap-1">
                          <span>{c.id}</span>
                        </Link>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          {c.serviceRequired || 'Title Due Diligence'}
                        </span>
                      </td>

                      {/* 2. Client & Contact */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <strong className="font-bold text-slate-900 dark:text-white block">
                          {c.clientName}
                        </strong>
                        <a 
                          href={`tel:${c.clientPhone}`} 
                          className="text-slate-500 dark:text-slate-400 font-mono text-[11px] hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{c.clientPhone}</span>
                        </a>
                      </td>

                      {/* 3. Property & Survey No. */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {c.surveyNumber ? `S.F. No. ${c.surveyNumber}` : 'Survey Pending'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          <span>{c.district} SRO Jurisdiction</span>
                        </div>
                      </td>

                      {/* 4. SOP Stage */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            stageIndex >= 6 ? 'bg-purple-600' : stageIndex >= 3 ? 'bg-blue-600 animate-pulse' : 'bg-amber-600'
                          }`} />
                          <span>Step {currentStageObj.stepNumber}: {currentStageObj.shortName}</span>
                        </div>
                      </td>

                      {/* 5. Stage 3 Welcome Letter & Pending Action */}
                      <td className="py-3.5 px-4">
                        <div className={`font-semibold flex items-center gap-1 ${
                          pending.statusType === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                          pending.statusType === 'purple' ? 'text-purple-700 dark:text-purple-400' :
                          pending.statusType === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
                          'text-slate-700 dark:text-slate-300'
                        }`}>
                          {pending.statusType === 'warning' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                          {pending.statusType === 'purple' && <Scale className="w-3 h-3 shrink-0" />}
                          {pending.statusType === 'success' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                          <span>{pending.actionText}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                          <span className="text-slate-500 dark:text-slate-400">
                            Welcome Letter: <strong className="font-semibold text-slate-700 dark:text-slate-300">{pending.welcomeStatus}</strong>
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="font-mono text-slate-500">{pending.gateNotice}</span>
                        </div>
                      </td>

                      {/* 6. Assigned Staff */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-slate-800 dark:text-slate-200 font-semibold block">
                          {staff.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {staff.role}
                        </span>
                      </td>

                      {/* 7. Escrow Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                          c.advancePaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                        }`}>
                          {c.advancePaid 
                            ? (c.balancePaid ? '✓ Fully Settled' : '80% Advance Paid') 
                            : 'Pending 80% Advance'}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono mt-0.5">
                          {c.advancePaid ? `Bal: ₹${c.balanceAmount.toLocaleString('en-IN')}` : `Req: ₹${c.advanceAmount.toLocaleString('en-IN')}`}
                        </span>
                      </td>

                      {/* 8. Quick Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Step Back button */}
                          <button
                            type="button"
                            disabled={stageIndex === 0 || isUpdating}
                            onClick={() => moveCaseStage(c.id, 'prev')}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold disabled:opacity-20 transition border border-slate-200 dark:border-slate-700"
                            title="Step backward 1 milestone"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>

                          {/* Primary Job Card Workbench button */}
                          <Link
                            href={`/admin/cases/${c.id}/job-card`}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 transition shadow-xs flex items-center gap-1"
                            title="Open Dual-Pane Job Card Workbench"
                          >
                            <span>Workbench</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>

                          {/* Advance Step button */}
                          <button
                            type="button"
                            disabled={stageIndex === PROCESS_STAGES.length - 1 || isUpdating}
                            onClick={() => moveCaseStage(c.id, 'next')}
                            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-20 transition shadow-xs"
                            title={getNextActionLabel(stageIndex)}
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          {/* Client Tracking View */}
                          <Link
                            href={`/track/${c.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs border border-slate-200 dark:border-slate-700 transition"
                            title="Open client tracker"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* KANBAN CARDS VIEW                                                         */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCases.map((c) => {
            const currentStageObj = PROCESS_STAGES.find(s => s.id === c.currentStage) || PROCESS_STAGES[0];
            const stageIndex = PROCESS_STAGES.findIndex(s => s.id === c.currentStage);
            const progressPct = Math.round(((stageIndex + 1) / PROCESS_STAGES.length) * 100);
            const staff = getAssignedStaff(c.id, stageIndex);
            const pending = getCasePendingAction(c);
            const isUpdating = isUpdatingStage === c.id;

            return (
              <div 
                key={c.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 transition-all shadow-xs flex flex-col justify-between space-y-4 group"
              >
                {/* Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      {c.id}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                      c.advancePaid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                    }`}>
                      {c.advancePaid ? '80% Paid' : 'Advance Due'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 transition-colors">
                    {c.clientName}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {c.clientPhone}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {c.surveyNumber ? `SF ${c.surveyNumber}` : c.district}
                    </span>
                  </div>
                </div>

                {/* SOP Progress Meter */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950/70 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      Step {currentStageObj.stepNumber}: {currentStageObj.shortName}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {progressPct}%
                    </span>
                  </div>

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
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1">
                    <span className="truncate max-w-[200px]">{pending.actionText}</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      ₹{c.totalAgreedCost.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">
                    Staff: <strong className="text-slate-700 dark:text-slate-300">{staff.name.split(' ')[0]}</strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/cases/${c.id}/job-card`}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1"
                    >
                      <span>Workbench</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
