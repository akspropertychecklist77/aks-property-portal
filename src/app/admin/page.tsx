'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  FolderKanban, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ArrowRight, 
  CreditCard,
  User,
  PlusCircle,
  ExternalLink,
  Search,
  ChevronRight,
  ShieldCheck,
  Scale,
  Sparkles,
  Phone,
  AlertCircle
} from 'lucide-react';
import { INITIAL_CASES } from '@/lib/data';
import { PROCESS_STAGES } from '@/lib/constants';
import { ClientCase } from '@/lib/types';

export default function AdminDashboardPage() {
  const [cases, setCases] = useState<ClientCase[]>(INITIAL_CASES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('ALL');

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
      .catch(err => console.log('Dashboard fetch notice:', err));
  }, []);

  // Financial aggregates
  const totalAdvanceCollected = cases
    .filter(c => c.advancePaid)
    .reduce((acc, c) => acc + c.advanceAmount, 0);

  const totalBalancePending = cases
    .filter(c => !c.balancePaid)
    .reduce((acc, c) => acc + c.balanceAmount, 0);

  const inReviewCount = cases.filter(
    c => c.currentStage === '4_JOB_CARD' || c.currentStage === '5_PROVISIONAL_VERIFICATION'
  ).length;

  // Linear-style Priority Action Queue Segments
  const pendingAdvanceCases = useMemo(() => {
    return cases.filter(c => !c.advancePaid && (c.currentStage === '1_ENQUIRY' || c.currentStage === '2_CALL' || c.currentStage === '3_WELCOME_ADVANCE'));
  }, [cases]);

  const readyForSignoffCases = useMemo(() => {
    return cases.filter(c => c.currentStage === '5_PROVISIONAL_VERIFICATION' || c.currentStage === '6_FINAL_REPORT');
  }, [cases]);

  const pendingDeliveryCases = useMemo(() => {
    return cases.filter(c => c.currentStage === '7_LOW_RES_PREVIEW' || c.currentStage === '8_DELIVERED');
  }, [cases]);

  // Filtered cases for the table
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchesSearch = 
        c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.surveyNumber && c.surveyNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStage = filterStage === 'ALL' || c.currentStage === filterStage;
      return matchesSearch && matchesStage;
    });
  }, [cases, searchQuery, filterStage]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Legal Operations Command Center</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
              Live Edge D1
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Supervising Tamil Nadu 8-Stage Title Scrutiny Dockets under Advocate A.K. Saravanan
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/pipeline"
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span>Active Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/admin/new-case"
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs shadow-blue-500/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Client Intake</span>
          </Link>
        </div>
      </div>

      {/* Metric KPI Cards (Clean Light Cards with Soft Shadows) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Active Dockets</span>
            <FolderKanban className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {cases.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% In-SOP</span> across TN
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Advance Collected (80%)</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            ₹{totalAdvanceCollected.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Gated before Stage 4 Job Card opening
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Balance Receivables (20%)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            ₹{totalBalancePending.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Gated before Stage 8 certified dispatch
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>In Scrutiny (Stages 4-6)</span>
            <Scale className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-2">
            {inReviewCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            30-Yr EC &amp; Advocate Scrutiny Active
          </p>
        </div>
      </div>

      {/* Linear-Style Priority Action Queue (Actionable Triaging) */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Priority Action Queue</h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Action items requiring immediate legal attention</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Action Card 1: Pending Advances */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/70 hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Pending 80% Advance</span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {pendingAdvanceCases.length} Matters
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {pendingAdvanceCases.length > 0 
                ? `Matters waiting for client payment confirmation before title extraction.`
                : 'All dockets have advances settled.'}
            </p>
            {pendingAdvanceCases.length > 0 && (
              <Link
                href="/admin/pipeline"
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
              >
                <span>Review fee status</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Action Card 2: Ready for Advocate Sign-Off */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/70 hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Ready for Advocate Review</span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {readyForSignoffCases.length} Matters
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {readyForSignoffCases.length > 0
                ? 'EC records & Parent title deeds indexed; pending certification.'
                : 'No matters waiting for review.'}
            </p>
            {readyForSignoffCases.length > 0 && (
              <Link
                href={`/admin/cases/${readyForSignoffCases[0].id}/job-card`}
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
              >
                <span>Scrutinize next file ({readyForSignoffCases[0].id})</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Action Card 3: Pending Balance & Courier */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/70 hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Ready for Final Delivery</span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {pendingDeliveryCases.length} Matters
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Watermarked draft issued; awaiting 20% balance and courier AWB release.
            </p>
            {pendingDeliveryCases.length > 0 && (
              <Link
                href="/admin/pipeline"
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
              >
                <span>View delivery queue</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Interactive 8-Stage Funnel Visualizer */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            SOP 8-Stage Caseload Distribution
          </div>
          <button
            onClick={() => setFilterStage('ALL')}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
              filterStage === 'ALL'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Show All Stages ({cases.length})
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {PROCESS_STAGES.map((stage) => {
            const count = cases.filter(c => c.currentStage === stage.id).length;
            const isSelected = filterStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setFilterStage(isSelected ? 'ALL' : stage.id)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-slate-400">Step {stage.stepNumber}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{count}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate mt-1">
                  {stage.shortName}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Case Files Master Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Table Filter & Search Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Legal Matters</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredCases.length} of {cases.length} dockets in practice
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by client, ID, survey... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-slate-400 hover:text-slate-700 px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Clean Light High-Legibility Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800 tracking-wider">
              <tr>
                <th className="py-3 px-4">Docket ID</th>
                <th className="py-3 px-4">Client &amp; Contact</th>
                <th className="py-3 px-4">Property Location</th>
                <th className="py-3 px-4">SOP Milestone</th>
                <th className="py-3 px-4">Advance (80%)</th>
                <th className="py-3 px-4">Balance (20%)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No matching legal matters found</p>
                    <p className="text-xs text-slate-500 mt-1">Try refining your search filter or clear active stage filters.</p>
                    <button
                      onClick={() => { setSearchQuery(''); setFilterStage('ALL'); }}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-medium transition-colors"
                    >
                      Reset All Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const stageObj = PROCESS_STAGES.find(s => s.id === c.currentStage) || PROCESS_STAGES[0];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                      {/* Docket ID */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {c.id}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {c.clientName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {c.clientPhone}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{c.surveyNumber ? `S.F. ${c.surveyNumber}` : 'Pending Survey'}</div>
                        <div className="text-[10px] text-slate-400">{c.district}</div>
                      </td>

                      {/* Stage Pill */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          <span>Step {stageObj.stepNumber}: {stageObj.shortName}</span>
                        </span>
                      </td>

                      {/* Advance 80% */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className={`font-semibold ${c.advancePaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                          {c.advancePaid ? `✓ ₹${c.advanceAmount.toLocaleString('en-IN')}` : `Due ₹${c.advanceAmount.toLocaleString('en-IN')}`}
                        </span>
                      </td>

                      {/* Balance 20% */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className={`font-semibold ${c.balancePaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                          {c.balancePaid ? `✓ ₹${c.balanceAmount.toLocaleString('en-IN')}` : `₹${c.balanceAmount.toLocaleString('en-IN')}`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/track/${c.id}`}
                            target="_blank"
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
                            title="Open client public tracker"
                          >
                            Track ↗
                          </Link>
                          <Link
                            href={`/admin/cases/${c.id}/job-card`}
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all shadow-2xs"
                          >
                            Job Card
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
