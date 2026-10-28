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
  AlertCircle
} from 'lucide-react';
import { INITIAL_CASES } from '@/lib/data';
import { PROCESS_STAGES } from '@/lib/constants';
import { ClientCase, ProcessStage } from '@/lib/types';

export default function AdminPipelinePage() {
  const [cases, setCases] = useState<ClientCase[]>(INITIAL_CASES);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">8-Stage Legal Workflow Pipeline</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time Kanban tracking from Website Enquiry to Physical Courier Delivery
          </p>
        </div>

        <Link
          href="/admin/new-case"
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Intake</span>
        </Link>
      </div>

      {/* Horizontal Scrollable Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
        {PROCESS_STAGES.map((stage, idx) => {
          const stageCases = cases.filter(c => c.currentStage === stage.id);

          return (
            <div 
              key={stage.id}
              className="w-80 flex-shrink-0 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col max-h-[calc(100vh-14rem)]"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/40 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    Step {stage.stepNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {stageCases.length}
                  </span>
                </div>
                <h3 className="font-extrabold text-xs text-white mt-1.5">{stage.shortName}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{stage.description}</p>
              </div>

              {/* Column Cards Container */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {stageCases.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-slate-600 border border-dashed border-slate-800/80 rounded-xl">
                    No cases in this stage
                  </div>
                ) : (
                  stageCases.map((c) => (
                    <div 
                      key={c.id}
                      className="p-4 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/50 transition-all space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-amber-400">{c.id}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{c.district}</span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-white">{c.clientName}</h4>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{c.surveyNumber}</span>
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                        <span className={c.advancePaid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {c.advancePaid ? '80% Paid' : 'Adv. Pending'}
                        </span>
                        <span className="text-slate-400 font-semibold">
                          ₹{c.totalAgreedCost.toLocaleString()}
                        </span>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveCaseStage(c.id, 'prev')}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                          title="Move to Previous Step"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>

                        <Link
                          href={`/admin/cases/${c.id}/job-card`}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-400 transition-colors"
                        >
                          Job Card →
                        </Link>

                        <button
                          type="button"
                          disabled={idx === PROCESS_STAGES.length - 1}
                          onClick={() => moveCaseStage(c.id, 'next')}
                          className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold disabled:opacity-20 disabled:pointer-events-none transition-all"
                          title="Advance to Next Step"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
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
    </div>
  );
}

