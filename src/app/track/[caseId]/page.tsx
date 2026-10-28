'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Upload, 
  Download, 
  ExternalLink, 
  CreditCard, 
  Lock, 
  MessageSquare,
  Sparkles,
  MapPin,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { INITIAL_CASES } from '@/lib/data';
import { PROCESS_STAGES } from '@/lib/constants';
import { ClientCase, ProcessStage } from '@/lib/types';

export default function ClientTrackPage({ params }: { params: Promise<{ caseId: string }> }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams.caseId).trim();
  
  const [caseData, setCaseData] = useState<ClientCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'documents' | 'preview'>('timeline');

  useEffect(() => {
    // Search by ID (case-insensitive) or by phone number
    const found = INITIAL_CASES.find(
      c => c.id.toUpperCase() === rawId.toUpperCase() || c.clientPhone === rawId
    );
    setCaseData(found || null);
    setLoading(false);
  }, [rawId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl bg-slate-800 border border-slate-700">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Case Not Found</h2>
          <p className="text-sm text-slate-400">
            No active legal opinion case found matching <span className="font-mono text-amber-400 font-bold">&quot;{rawId}&quot;</span>. Please check your Case ID or 10-digit mobile number.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <Link 
              href="/"
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all"
            >
              Try Another Number
            </Link>
            <a 
              href="https://wa.me/919363106310?text=Hi%20AKSPCL,%20I%20am%20unable%20to%20find%20my%20case%20status."
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Contact Support on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const currentStageIndex = PROCESS_STAGES.findIndex(s => s.id === caseData.currentStage);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Search</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Case ID:</span>
            <span className="font-mono text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md">
              {caseData.id}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        
        {/* Case Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Advocate Title Due Diligence</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {caseData.clientName}
              </h1>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {caseData.surveyNumber}, {caseData.village || caseData.district} ({caseData.district} Dt)
                </span>
                <span>•</span>
                <span className="text-slate-300 font-medium">{caseData.serviceRequired}</span>
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Milestone</span>
                <span className="text-sm font-extrabold text-amber-400">
                  Step {currentStageIndex + 1}: {PROCESS_STAGES[currentStageIndex]?.shortName}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Payment Progress</span>
                <span className="text-sm font-extrabold text-emerald-400">
                  {caseData.balancePaid ? '100% Fully Settled' : caseData.advancePaid ? '80% Advance Received' : 'Advance Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 border-t border-slate-800 pt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'timeline' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Live 8-Step Timeline
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'documents' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Upload &amp; View Deeds ({caseData.uploadedFiles.length})
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'preview' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Report Preview &amp; Delivery
            </button>
          </div>
        </div>

        {/* TAB 1: 8-STAGE TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center justify-between">
                <span>Verification Workflow Progress</span>
                <span className="text-xs font-normal text-slate-400">
                  {currentStageIndex + 1} of 8 Milestones Completed
                </span>
              </h2>

              <div className="space-y-6">
                {PROCESS_STAGES.map((stage, idx) => {
                  const isDone = idx < currentStageIndex || caseData.currentStage === '8_DELIVERED';
                  const isCurrent = idx === currentStageIndex && caseData.currentStage !== '8_DELIVERED';
                  const isPending = idx > currentStageIndex;

                  return (
                    <div key={stage.id} className="relative flex items-start gap-4">
                      {/* Connecting Line */}
                      {idx !== PROCESS_STAGES.length - 1 && (
                        <div 
                          className={`absolute left-5 top-10 w-0.5 h-12 -ml-px ${
                            isDone ? 'bg-amber-500' : 'bg-slate-800'
                          }`}
                        />
                      )}

                      {/* Icon Circle */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 z-10 transition-all ${
                        isDone 
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                          : isCurrent 
                          ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/30' 
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>

                      {/* Text */}
                      <div className="flex-1 pt-1 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h3 className={`text-sm font-bold ${
                            isCurrent ? 'text-amber-400' : isDone ? 'text-white' : 'text-slate-400'
                          }`}>
                            {stage.clientVisibleTitle}
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {isDone ? 'Completed' : isCurrent ? 'In Progress' : 'Upcoming'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {stage.clientVisibleDesc}
                        </p>

                        {/* Interactive Banner on Active Milestone */}
                        {isCurrent && stage.id === '3_WELCOME_ADVANCE' && !caseData.advancePaid && (
                          <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold text-amber-300">80% Advance Payment Pending</p>
                              <p className="text-[11px] text-slate-300">₹{caseData.advanceAmount.toLocaleString()} to begin 30-year sub-registrar title search.</p>
                            </div>
                            <button className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs whitespace-nowrap shadow">
                              Pay via UPI
                            </button>
                          </div>
                        )}

                        {isCurrent && stage.id === '7_LOW_RES_PREVIEW' && !caseData.balancePaid && (
                          <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold text-amber-300">Provisional Report Ready for Review</p>
                              <p className="text-[11px] text-slate-300">Pay 20% balance (₹{caseData.balanceAmount.toLocaleString()}) to release full signed report.</p>
                            </div>
                            <button 
                              onClick={() => setActiveTab('preview')}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs whitespace-nowrap shadow"
                            >
                              View Preview
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENTS UPLOAD */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-4">Uploaded Property Documents</h3>
                
                {caseData.uploadedFiles.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {caseData.uploadedFiles.map((file) => (
                      <div key={file.id} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{file.fileName}</p>
                            <p className="text-[10px] text-slate-400">{file.category} • {file.fileSize} • Uploaded on {file.uploadedAt}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                          Verified
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Dropzone */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-2">Upload Additional Deeds or Patta Copies</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Need to share missing parent deeds, EC copies, or latest tax receipts? Upload securely here.
                </p>

                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-amber-500/50 transition-colors bg-slate-950/40 cursor-pointer">
                  <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-white">Click or drag &amp; drop files to upload</p>
                  <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG up to 25MB (Encrypted &amp; Confidential)</p>
                </div>
              </div>
            </div>

            {/* Checklist Box */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">Required Documents Checklist</h3>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Current Registered Sale Deed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Parent Deeds (Minimum 30 Years)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Individual Patta / TSLR Extract</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Field Measurement Book (FMB) Sketch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Latest Property Tax / Electricity Bill</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REPORT PREVIEW & DISPATCH */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-black text-white">Title Scrutiny &amp; Legal Opinion Report</h3>
                  <p className="text-xs text-slate-400 mt-1">Property: {caseData.surveyNumber}, {caseData.district}</p>
                </div>

                {caseData.currentStage === '8_DELIVERED' ? (
                  <button className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                    <Download className="w-4 h-4" />
                    <span>Download Official Signed PDF</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Watermarked Preview Mode</span>
                  </span>
                )}
              </div>

              {/* Legal Findings Highlights */}
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Marketable Title Status</span>
                    <span className="text-base font-black text-emerald-400 mt-1 block">
                      {caseData.legalOpinion.marketableTitle}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Encumbrance Search</span>
                    <span className="text-base font-black text-emerald-400 mt-1 block">
                      {caseData.legalOpinion.encumbranceStatus}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Revenue Compliance</span>
                    <span className="text-base font-black text-amber-400 mt-1 block">
                      {caseData.legalOpinion.revenueCompliance}
                    </span>
                  </div>
                </div>

                {/* Simulated Watermarked Document View */}
                <div className="relative mt-6 border border-slate-700 rounded-xl p-8 bg-slate-950 overflow-hidden text-left shadow-2xl">
                  {caseData.currentStage !== '8_DELIVERED' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none rotate-[-25deg] opacity-15">
                      <span className="text-5xl sm:text-7xl font-black text-amber-400 tracking-widest uppercase">
                        PREVIEW ONLY • BALANCE PENDING
                      </span>
                    </div>
                  )}

                  <div className="space-y-4 text-xs text-slate-300 max-w-2xl">
                    <div className="border-b border-slate-800 pb-3">
                      <p className="font-extrabold text-sm text-white">TITLE SCRUTINY SUMMARY (PRELIMINARY OPINION)</p>
                      <p className="text-[11px] text-slate-400">Scrutinized by Advocate A.K. Saravanan (M.E. Energy, LLB)</p>
                    </div>

                    <p className="leading-relaxed">
                      On thorough examination of the 30-year Encumbrance Certificates, parent registered title deeds, and mutation of Patta records in respect of <strong>{caseData.surveyNumber}</strong>, the following findings are certified:
                    </p>

                    <div className="space-y-2 pl-4 border-l-2 border-amber-500/40">
                      {caseData.legalOpinion.keyFindings.map((finding, idx) => (
                        <p key={idx}>✓ {finding}</p>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                      <p className="font-bold text-amber-400">ADVOCATE RECOMMENDATIONS:</p>
                      <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-400">
                        {caseData.legalOpinion.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Balance Payment Callout for Stage 7 */}
                {caseData.currentStage === '7_LOW_RES_PREVIEW' && !caseData.balancePaid && (
                  <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-base text-amber-300">Ready to Receive Official Final Report?</h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        Review your draft findings. Complete the 20% balance payment (₹{caseData.balanceAmount.toLocaleString()}) to remove watermarks and receive the signed physical courier + digital copies.
                      </p>
                    </div>
                    <button className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm whitespace-nowrap shadow-lg shadow-amber-500/20 cursor-pointer">
                      Pay Balance ₹{caseData.balanceAmount.toLocaleString()}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
