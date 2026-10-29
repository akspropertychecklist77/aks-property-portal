'use client';

import { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { INITIAL_CASES } from '@/lib/data';
import { PROCESS_STAGES } from '@/lib/constants';
import { ClientCase } from '@/lib/types';

export default function AdminDashboardPage() {
  const [cases, setCases] = useState<ClientCase[]>(INITIAL_CASES);

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
      .catch(err => console.log('Dashboard fetch notice:', err));
  }, []);

  const totalAdvanceCollected = cases
    .filter(c => c.advancePaid)
    .reduce((acc, c) => acc + c.advanceAmount, 0);

  const totalBalancePending = cases
    .filter(c => !c.balancePaid)
    .reduce((acc, c) => acc + c.balanceAmount, 0);

  const inReviewCount = cases.filter(
    c => c.currentStage === '4_JOB_CARD' || c.currentStage === '5_PROVISIONAL_VERIFICATION'
  ).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Operations &amp; Legal Scrutiny Hub</h1>
          <p className="text-xs text-slate-400 mt-1">Supervising all 8-stage title opinion cases across Tamil Nadu</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/pipeline"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-2"
          >
            <span>View Case Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/new-case"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Client Intake</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Active Cases</span>
          <span className="text-2xl font-black text-white mt-1 block">{cases.length}</span>
          <p className="text-[10px] text-amber-400 mt-2 font-medium">Across Coimbatore, Tiruppur &amp; Erode</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Advance Collected (80%)</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            ₹{totalAdvanceCollected.toLocaleString()}
          </span>
          <p className="text-[10px] text-slate-400 mt-2">Verified via online payment / UPI</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Balance Receivables (20%)</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">
            ₹{totalBalancePending.toLocaleString()}
          </span>
          <p className="text-[10px] text-slate-400 mt-2">To be settled before final report dispatch</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Under Expert Review</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">{inReviewCount}</span>
          <p className="text-[10px] text-slate-400 mt-2">Awaiting Advocate A.K. Saravanan sign-off</p>
        </div>
      </div>

      {/* Active Case Pipeline Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Active Case Files</h2>
            <p className="text-xs text-slate-400 mt-0.5">Click into any case to edit Job Cards, review ECs, or generate reports</p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            {cases.length} Cases
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Case ID</th>
                <th className="py-3.5 px-6">Client Name</th>
                <th className="py-3.5 px-6">Property / Survey No</th>
                <th className="py-3.5 px-6">Current Stage</th>
                <th className="py-3.5 px-6">Advance (80%)</th>
                <th className="py-3.5 px-6">Balance (20%)</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {cases.map((c) => {
                const stageObj = PROCESS_STAGES.find(s => s.id === c.currentStage);
                return (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-amber-400">
                      {c.id}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-white">{c.clientName}</div>
                      <div className="text-[10px] text-slate-400">{c.clientPhone}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      <div>{c.surveyNumber}</div>
                      <div className="text-[10px] text-slate-400">{c.village || c.district} ({c.district})</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Step {stageObj?.stepNumber}: {stageObj?.shortName}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[11px] font-bold ${c.advancePaid ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.advancePaid ? `✓ ₹${c.advanceAmount.toLocaleString()}` : `Pending ₹${c.advanceAmount.toLocaleString()}`}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[11px] font-bold ${c.balancePaid ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {c.balancePaid ? `✓ ₹${c.balanceAmount.toLocaleString()}` : `₹${c.balanceAmount.toLocaleString()}`}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/track/${c.id}`}
                          target="_blank"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                        >
                          Client View ↗
                        </Link>
                        <Link
                          href={`/admin/cases/${c.id}/job-card`}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold transition-all"
                        >
                          Open Job Card
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
    </div>
  );
}

