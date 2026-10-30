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
  const [phonePrompt, setPhonePrompt] = useState(false);
  const [inputPhone, setInputPhone] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchTrackingData = (phoneQuery?: string) => {
    setLoading(true);
    setAuthError(null);
    const url = `/api/tracking/${rawId}${phoneQuery ? `?phone=${encodeURIComponent(phoneQuery)}` : ''}`;

    fetch(url)
      .then(async (res) => {
        const result = await res.json();
        if (res.status === 401) {
          setPhonePrompt(true);
          setLoading(false);
          return;
        }

        if (result.success && result.data) {
          const dbData = result.data;
          const stageIndex = (dbData.currentStage || 1) - 1;
          const stageId = PROCESS_STAGES[stageIndex]?.id || '1_ENQUIRY';

          setCaseData({
            id: dbData.caseId,
            clientName: dbData.clientName,
            clientPhone: dbData.maskedPhone,
            clientEmail: dbData.maskedEmail || undefined,
            serviceRequired: dbData.servicePackage,
            district: dbData.district,
            surveyNumber: dbData.surveyNumber || '',
            totalAgreedCost: dbData.escrowBilling.totalFee || 6500,
            advanceAmount: Math.round(dbData.escrowBilling.totalFee * 0.8),
            advancePaid: dbData.escrowBilling.advancePaid > 0,
            balanceAmount: dbData.escrowBilling.balanceDue,
            balancePaid: dbData.escrowBilling.isFullyPaid,
            currentStage: stageId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ecRecords: [],
            parentDocs: [],
            currentDoc: {
              id: 'curr_1',
              pattaNumber: '',
              pattaType: 'Individual',
              pattaHolder: dbData.clientName,
              fmbVerified: false,
              tslrVerified: false,
              revenueStatus: dbData.scrutinySummary.revenueStatus,
              notes: '',
            },
            legalOpinion: {
              marketableTitle: dbData.scrutinySummary.marketableTitle,
              encumbranceStatus: dbData.scrutinySummary.ecStatus,
              revenueCompliance: dbData.scrutinySummary.revenueStatus,
              keyFindings: [],
              recommendations: [],
              advocateSignoff: dbData.scrutinySummary.advocateSignoff,
            },
            uploadedFiles: dbData.availableDocuments?.map((d: any) => ({
              id: d.id,
              name: d.fileName,
              category: d.category,
              url: d.downloadUrl,
              size: 'Verified',
              date: 'Active',
            })) || [],
          });
          setPhonePrompt(false);
          setLoading(false);
        } else {
          // Fallback to local demo cases
          const found = INITIAL_CASES.find(
            c => c.id.toUpperCase() === rawId.toUpperCase() || c.clientPhone === rawId
          );
          setCaseData(found || null);
          setLoading(false);
        }
      })
      .catch(() => {
        const found = INITIAL_CASES.find(
          c => c.id.toUpperCase() === rawId.toUpperCase() || c.clientPhone === rawId
        );
        setCaseData(found || null);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTrackingData();
  }, [rawId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-slate-900 dark:text-zinc-100">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (phonePrompt) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4 p-8 rounded-2xl bg-[#121215] border border-zinc-800/80 shadow-xl">
          <ShieldCheck className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-center">Client Security Verification</h2>
          <p className="text-xs text-zinc-400 text-center">
            To view the live legal due diligence docket <span className="font-mono text-amber-400 font-bold">&quot;{rawId}&quot;</span>, please verify your registered mobile number.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchTrackingData(inputPhone);
            }}
            className="space-y-3 pt-2"
          >
            <input
              type="text"
              placeholder="Enter 10-digit Mobile or last 4 digits"
              value={inputPhone}
              onChange={(e) => setInputPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              required
            />
            {authError && <p className="text-xs text-rose-500">{authError}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all"
            >
              Verify & View Progress
            </button>
          </form>
          <div className="pt-2 text-center">
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
              Return to Search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl bg-[#121215] border border-slate-200/80 dark:border-zinc-800/80 shadow-xl">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold">Matter Docket Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            No active legal opinion file found matching <span className="font-mono text-amber-400 font-bold">&quot;{rawId}&quot;</span>. Please check your Docket ID or 10-digit mobile number.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link 
              href="/"
              className="py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all"
            >
              Try Another Number
            </Link>
            <a 
              href="https://wa.me/919363106310?text=Hi%20AKSPCL,%20I%20am%20unable%20to%20find%20my%20case%20status."
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-medium text-xs transition-all flex items-center justify-center gap-2 border border-zinc-700"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Contact Legal Desk on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const currentStageIndex = PROCESS_STAGES.findIndex(s => s.id === caseData.currentStage);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-slate-900 dark:text-zinc-100 flex flex-col antialiased">
      {/* Top Header */}
      <header className="border-b border-slate-200/90 dark:border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#121215]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-slate-800 dark:text-zinc-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Client Portal Search</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-zinc-400">Docket ID:</span>
            <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 px-2 py-0.5 rounded">
              {caseData.id}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        
        {/* Case Banner */}
        <div className="rounded-2xl bg-white dark:bg-[#121215] border border-slate-200/90 dark:border-slate-200/80 dark:border-zinc-800/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-blue-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Advocate Title Due Diligence</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-900 dark:text-zinc-100 tracking-tight">
                {caseData.clientName}
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                  {caseData.surveyNumber}, {caseData.village || caseData.district} ({caseData.district} Dt)
                </span>
                <span>•</span>
                <span className="text-slate-700 dark:text-zinc-300 font-medium">{caseData.serviceRequired}</span>
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 dark:bg-zinc-900/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-200/80 dark:border-zinc-800/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Current Milestone</span>
                <span className="text-xs font-bold text-blue-700 dark:text-amber-400">
                  Step {currentStageIndex + 1}: {PROCESS_STAGES[currentStageIndex]?.shortName}
                </span>
              </div>
              <div className="h-6 w-px bg-zinc-800 hidden sm:block"></div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Payment Progress</span>
                <span className="text-xs font-bold font-mono text-emerald-400">
                  {caseData.balancePaid ? '100% Fully Settled' : caseData.advancePaid ? '80% Advance Received' : 'Advance Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex gap-2 border-t border-slate-200/80 dark:border-zinc-800/80 pt-4 overflow-x-auto">
            {[
              { id: 'timeline', label: 'Live 8-Step Timeline' },
              { id: 'documents', label: `Upload & View Deeds (${caseData.uploadedFiles.length})` },
              { id: 'preview', label: 'Report Preview & Delivery' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white font-bold shadow-xs' 
                    : 'bg-white dark:bg-zinc-900/60 text-slate-700 dark:text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800/60 shadow-xs'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: 8-STAGE TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="bg-[#121215] border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8">
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-6 flex items-center justify-between">
                <span>Verification Workflow Progress</span>
                <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
                  {currentStageIndex + 1} of 8 Milestones Completed
                </span>
              </h2>

              <div className="space-y-5">
                {PROCESS_STAGES.map((stage, idx) => {
                  const isCompleted = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  const isFuture = idx > currentStageIndex;

                  return (
                    <div key={stage.id} className="flex gap-4 group">
                      {/* Left Stepper Column */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                            : isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-900 dark:text-slate-500 dark:text-zinc-400 dark:border-zinc-800'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <span>{stage.stepNumber}</span>
                          )}
                        </div>
                        {idx !== PROCESS_STAGES.length - 1 && (
                          <div className={`w-0.5 flex-1 my-1.5 ${
                            isCompleted ? 'bg-emerald-500/40' : 'bg-zinc-800'
                          }`} />
                        )}
                      </div>

                      {/* Right Details Column */}
                      <div className={`flex-1 pb-6 ${isFuture ? 'opacity-40' : ''}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-sm font-bold ${isCurrent ? 'text-amber-400' : 'text-slate-900 dark:text-zinc-100'}`}>
                            Step {stage.stepNumber}: {stage.title}
                          </h3>
                          {isCurrent && (
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Active Milestone
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                              Completed
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                          {stage.description}
                        </p>

                        {/* Special Callout: Step 3 Advance Gate */}
                        {isCurrent && stage.id === '3_WELCOME_ADVANCE' && !caseData.advancePaid && (
                          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold text-amber-300">80% Advance Payment Required</p>
                              <p className="text-[11px] text-slate-700 dark:text-zinc-300">Amount: ₹{caseData.advanceAmount.toLocaleString('en-IN')} (Gated to open 30-year EC scrutiny)</p>
                            </div>
                            <button className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs whitespace-nowrap shadow-sm">
                              Pay via UPI
                            </button>
                          </div>
                        )}

                        {/* Special Callout: Step 7 Watermarked Preview Gate */}
                        {isCurrent && stage.id === '7_LOW_RES_PREVIEW' && !caseData.balancePaid && (
                          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold text-amber-300">Provisional Report Ready for Review</p>
                              <p className="text-[11px] text-slate-700 dark:text-zinc-300">Settle 20% balance (₹{caseData.balanceAmount.toLocaleString('en-IN')}) to release full certified report.</p>
                            </div>
                            <button 
                              onClick={() => setActiveTab('preview')}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs whitespace-nowrap shadow-sm"
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
              <div className="bg-[#121215] border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-4">Uploaded Property Documents</h3>
                
                {caseData.uploadedFiles.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 py-6 text-center">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {caseData.uploadedFiles.map((file) => (
                      <div key={file.id} className="p-3 rounded-lg bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{file.fileName}</p>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400">{file.category} • {file.fileSize} • Uploaded on {file.uploadedAt}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Verified
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Dropzone */}
              <div className="bg-[#121215] border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-1">Upload Additional Deeds or Patta Copies</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
                  Need to share missing parent deeds, EC copies, or latest tax receipts? Upload securely here.
                </p>

                <div className="border border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-500/50 rounded-xl p-8 text-center transition-colors bg-slate-50/50 dark:bg-zinc-950/40 cursor-pointer">
                  <Upload className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Click or drag &amp; drop files to upload</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">PDF, Word (.docx / .doc), JPG, PNG up to 15MB (Encrypted &amp; Confidential)</p>
                </div>
              </div>
            </div>

            {/* Checklist Box */}
            <div className="space-y-4">
              <div className="bg-[#121215] border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-blue-700 dark:text-amber-400 uppercase tracking-wider mb-3">Required Documents Checklist</h3>
                <ul className="space-y-2.5 text-xs text-slate-700 dark:text-zinc-300">
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
            <div className="bg-[#121215] border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-zinc-800/80">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Title Scrutiny &amp; Legal Opinion Report</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Property: {caseData.surveyNumber}, {caseData.district}</p>
                </div>

                {caseData.currentStage === '8_DELIVERED' ? (
                  <button className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-sm">
                    <Download className="w-4 h-4" />
                    <span>Download Official Signed PDF</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Watermarked Preview Mode</span>
                  </span>
                )}
              </div>

              {/* Legal Findings Highlights */}
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Marketable Title</span>
                    <span className="text-sm font-bold text-emerald-400 mt-1 block">
                      {caseData.legalOpinion.marketableTitle}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Encumbrance Search</span>
                    <span className="text-sm font-bold text-emerald-400 mt-1 block">
                      {caseData.legalOpinion.encumbranceStatus}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Revenue Compliance</span>
                    <span className="text-sm font-bold text-amber-400 mt-1 block">
                      {caseData.legalOpinion.revenueCompliance}
                    </span>
                  </div>
                </div>

                {/* Simulated Watermarked Document View */}
                <div className="relative mt-4 border border-slate-200 dark:border-zinc-800 rounded-xl p-8 bg-white dark:bg-zinc-950 overflow-hidden text-left shadow-sm">
                  {caseData.currentStage !== '8_DELIVERED' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none rotate-[-25deg] opacity-10">
                      <span className="text-4xl sm:text-6xl font-black text-amber-400 tracking-widest uppercase">
                        PREVIEW ONLY • BALANCE PENDING
                      </span>
                    </div>
                  )}

                  <div className="space-y-4 text-xs text-slate-700 dark:text-zinc-300 max-w-2xl">
                    <div className="border-b border-zinc-800 pb-3">
                      <p className="font-bold text-sm text-slate-900 dark:text-zinc-100">TITLE SCRUTINY SUMMARY (PRELIMINARY OPINION)</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">Scrutinized by Advocate A.K. Saravanan (M.E. Energy, LLB)</p>
                    </div>

                    <p className="leading-relaxed">
                      On thorough examination of the 30-year Encumbrance Certificates, parent registered title deeds, and mutation of Patta records in respect of <strong>{caseData.surveyNumber}</strong>, the following findings are certified:
                    </p>

                    <div className="space-y-1.5 pl-3 border-l-2 border-amber-500/40">
                      {caseData.legalOpinion.keyFindings.map((finding, idx) => (
                        <p key={idx}>✓ {finding}</p>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-zinc-800">
                      <p className="font-bold text-amber-400">ADVOCATE RECOMMENDATIONS:</p>
                      <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-500 dark:text-zinc-400">
                        {caseData.legalOpinion.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Balance Payment Callout for Stage 7 */}
                {caseData.currentStage === '7_LOW_RES_PREVIEW' && !caseData.balancePaid && (
                  <div className="mt-4 p-5 rounded-xl bg-zinc-900/80 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-amber-300">Ready to Receive Official Final Report?</h4>
                      <p className="text-xs text-slate-700 dark:text-zinc-300 mt-0.5 max-w-xl">
                        Review your draft findings. Complete the 20% balance payment (₹{caseData.balanceAmount.toLocaleString('en-IN')}) to remove watermarks and receive the signed physical courier + digital copies.
                      </p>
                    </div>
                    <button className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs whitespace-nowrap shadow-sm cursor-pointer">
                      Pay Balance ₹{caseData.balanceAmount.toLocaleString('en-IN')}
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
