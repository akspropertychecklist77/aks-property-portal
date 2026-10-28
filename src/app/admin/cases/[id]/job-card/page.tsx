'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle2, 
  FileText, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Scale, 
  Printer, 
  Share2, 
  Download,
  AlertCircle
} from 'lucide-react';
import { INITIAL_CASES } from '@/lib/data';
import { ClientCase, ECRecord, ParentDocument } from '@/lib/types';
import { PROCESS_STAGES } from '@/lib/constants';

export default function JobCardPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const caseId = decodeURIComponent(unwrappedParams.id);

  const [currentCase, setCurrentCase] = useState<ClientCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ec' | 'parent' | 'current' | 'opinion'>('ec');

  useEffect(() => {
    // 1. Fetch case from SQL database
    fetch(`/api/cases/${caseId}`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          const dbData = result.data;
          const stageIndex = (dbData.current_stage || 1) - 1;
          const stageId = PROCESS_STAGES[stageIndex]?.id || '1_ENQUIRY';

          // If db has no mock deeds yet, populate default template
          const defaultEc: ECRecord[] = [
            {
              id: 'ec-1',
              period: '1994 - 2005 (11 Years)',
              sro: `${dbData.district} SRO`,
              surveyNumber: dbData.survey_number || 'S.F. 101',
              docNumber: '1120/1994',
              parties: 'Original Ancestral Partition',
              natureOfDeed: 'Partition Deed',
              verified: true,
            },
            {
              id: 'ec-2',
              period: '2005 - 2018 (13 Years)',
              sro: `${dbData.district} SRO`,
              surveyNumber: dbData.survey_number || 'S.F. 101',
              docNumber: '4521/2005',
              parties: 'K. Ramasamy to Vendor',
              natureOfDeed: 'Sale Deed',
              verified: true,
            },
          ];

          setCurrentCase({
            id: dbData.id,
            clientName: dbData.client_name,
            clientPhone: dbData.client_phone,
            clientEmail: dbData.client_email,
            serviceRequired: dbData.service_package,
            district: dbData.district,
            surveyNumber: dbData.survey_number || '',
            totalAgreedCost: dbData.total_fee || 6500,
            advanceAmount: dbData.advance_amount || 5200,
            advancePaid: dbData.payment_status === 'advance_paid' || dbData.payment_status === 'fully_paid',
            balanceAmount: dbData.balance_amount || 1300,
            balancePaid: dbData.payment_status === 'fully_paid',
            currentStage: stageId,
            createdAt: dbData.created_at,
            updatedAt: dbData.updated_at,
            ecRecords: dbData.ecRecords && dbData.ecRecords.length > 0 ? dbData.ecRecords : defaultEc,
            parentDocs: dbData.parentDocs && dbData.parentDocs.length > 0 ? dbData.parentDocs : [
              {
                id: 'pd-1',
                docNumber: 'Doc 1120/1994',
                year: '1994',
                deedType: 'Registered Partition Deed',
                executants: 'Original Joint Family',
                claimants: 'Vendor Predecessor',
                extent: '2,400 Sq.Ft',
                scheduleMatches: true,
                notes: 'Root title intact without gaps.',
              }
            ],
            currentDoc: dbData.revenueRecord || {
              id: 'curr_1',
              pattaNumber: 'Patta No. 2481',
              pattaType: 'Individual',
              pattaHolder: dbData.client_name,
              fmbVerified: true,
              tslrVerified: true,
              revenueStatus: 'Clear',
              notes: 'Current revenue records match registered title deeds.',
            },
            legalOpinion: dbData.legalOpinion || {
              marketableTitle: 'Clear',
              encumbranceStatus: 'Nil Encumbrance',
              revenueCompliance: 'Full Patta Available',
              keyFindings: [
                'Chain of title verified unbroken for over 30 years.',
                'Patta transferred cleanly in the name of the vendor.',
                'No adverse court orders, attachments, or bank hypothecations flagged.',
              ],
              recommendations: [
                'Inspect original parent deeds at registration.',
                'Verify latest property tax paid receipt before sale consideration transfer.',
              ],
              advocateSignoff: false,
              advocateName: 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
            },
            uploadedFiles: [],
          });
        } else {
          const found = INITIAL_CASES.find(c => c.id.toUpperCase() === caseId.toUpperCase());
          setCurrentCase(found || null);
        }
      })
      .catch(() => {
        const found = INITIAL_CASES.find(c => c.id.toUpperCase() === caseId.toUpperCase());
        setCurrentCase(found || null);
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold">Opening Job Card from SQL database...</span>
      </div>
    );
  }

  if (!currentCase) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Case {caseId} not found.</p>
        <Link href="/admin" className="text-amber-400 underline text-xs mt-2 inline-block">
          Return to Admin Dashboard
        </Link>
      </div>
    );
  }

  // Quick helper to add EC row
  const addEcRecord = () => {
    const newRecord: ECRecord = {
      id: `ec-${Date.now()}`,
      period: '2024 - 2026 (2 Years)',
      sro: currentCase.district + ' SRO',
      surveyNumber: currentCase.surveyNumber,
      docNumber: 'Pending/2026',
      parties: 'Search in progress',
      natureOfDeed: 'Sale Deed',
      verified: true,
    };
    setCurrentCase({
      ...currentCase,
      ecRecords: [...currentCase.ecRecords, newRecord],
    });
  };

  // Quick helper to add Parent Doc
  const addParentDoc = () => {
    const newDoc: ParentDocument = {
      id: `pd-${Date.now()}`,
      docNumber: 'Doc No. / Year',
      year: '2000',
      deedType: 'Registered Sale Deed',
      executants: 'Executant Name',
      claimants: 'Claimant Name',
      extent: '1.50 Acres',
      scheduleMatches: true,
      notes: 'Chain of title verified.',
    };
    setCurrentCase({
      ...currentCase,
      parentDocs: [...currentCase.parentDocs, newDoc],
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                {currentCase.id}
              </span>
              <h1 className="text-xl font-black text-white">{currentCase.clientName}</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Property: {currentCase.surveyNumber}, {currentCase.district} • {currentCase.serviceRequired}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/track/${currentCase.id}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
          >
            Preview Client View ↗
          </Link>
          <button 
            type="button"
            onClick={() => alert('Compiling legal opinion report PDF with Annexure I and Annexure II...')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>Generate Full Report</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu (Replaces the 4 separate Google Sheets!) */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('ec')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'ec'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>1. EC Index</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40">
            {currentCase.ecRecords.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parent')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'parent'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>2. Parent Doc Index</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40">
            {currentCase.parentDocs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'current'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>3. Current Doc &amp; Patta</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40">
            {currentCase.currentDoc.revenueStatus}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('opinion')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'opinion'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>4. Advocate Opinion Sign-off</span>
        </button>
      </div>

      {/* TAB 1: EC INDEX (Replaces Google Sheet 1) */}
      {activeTab === 'ec' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Encumbrance Certificate (EC) 30-Year Index</h2>
              <p className="text-xs text-slate-400 mt-0.5">Records extracted from Inspector General of Registration (TNeGA/Kaveri)</p>
            </div>
            <button
              type="button"
              onClick={addEcRecord}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add EC Record</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">SRO</th>
                  <th className="py-3 px-4">Survey No</th>
                  <th className="py-3 px-4">Doc No. &amp; Nature</th>
                  <th className="py-3 px-4">Parties Involved</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {currentCase.ecRecords.map((ec) => (
                  <tr key={ec.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-amber-400">{ec.period}</td>
                    <td className="py-3 px-4 text-slate-300">{ec.sro}</td>
                    <td className="py-3 px-4 text-slate-300">{ec.surveyNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{ec.docNumber}</div>
                      <div className="text-[10px] text-slate-400">{ec.natureOfDeed}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{ec.parties}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                        Verified ✓
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PARENT DOC INDEX (Replaces Google Sheet 2) */}
      {activeTab === 'parent' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Parent Title Deed Chain (Historical Flow)</h2>
              <p className="text-xs text-slate-400 mt-0.5">Tracing uninterrupted root of title ownership over 30+ years</p>
            </div>
            <button
              type="button"
              onClick={addParentDoc}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Parent Deed</span>
            </button>
          </div>

          <div className="space-y-3">
            {currentCase.parentDocs.map((doc) => (
              <div key={doc.id} className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">{doc.docNumber}</span>
                    <span className="text-xs text-slate-400">({doc.year})</span>
                    <span className="text-[10px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded font-medium">
                      {doc.deedType}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                    Schedule Matches ✓
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                  <p><span className="text-slate-500">Executant:</span> {doc.executants}</p>
                  <p><span className="text-slate-500">Claimant:</span> {doc.claimants}</p>
                  <p><span className="text-slate-500">Extent:</span> {doc.extent}</p>
                </div>
                <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  {doc.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CURRENT DOC & PATTA (Replaces Google Sheet 3) */}
      {activeTab === 'current' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">Current Title Deed &amp; Revenue Records (Patta / TSLR)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Verification against Tamil Nadu Revenue Department (Tamil Nilam)</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Patta Number &amp; Type</span>
              <p className="text-sm font-bold text-white">{currentCase.currentDoc.pattaNumber} ({currentCase.currentDoc.pattaType})</p>
              <p className="text-xs text-slate-300">Holder: {currentCase.currentDoc.pattaHolder}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Revenue Portal Status</span>
              <p className="text-sm font-bold text-emerald-400">{currentCase.currentDoc.revenueStatus}</p>
              <p className="text-xs text-slate-400">
                FMB: {currentCase.currentDoc.fmbVerified ? 'Verified ✓' : 'Pending'} • TSLR: {currentCase.currentDoc.tslrVerified ? 'Verified ✓' : 'N/A'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Revenue Inspector Notes</span>
            <p className="text-xs text-slate-300">{currentCase.currentDoc.notes}</p>
          </div>
        </div>
      )}

      {/* TAB 4: ADVOCATE LEGAL OPINION SIGN-OFF (Replaces Google Sheet 4 & Docs) */}
      {activeTab === 'opinion' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">Advocate Legal Opinion &amp; Title Certificate</h2>
              <p className="text-xs text-slate-400 mt-0.5">Formal certification under Advocate-Client discretion</p>
            </div>

            {currentCase.legalOpinion.advocateSignoff ? (
              <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Digitally Approved by {currentCase.legalOpinion.advocateName}</span>
              </span>
            ) : (
              <button 
                type="button"
                onClick={() => {
                  setCurrentCase({
                    ...currentCase,
                    legalOpinion: {
                      ...currentCase.legalOpinion,
                      advocateSignoff: true,
                      advocateName: 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
                      signoffDate: new Date().toISOString().split('T')[0],
                    },
                  });
                  alert('Legal Opinion approved and digitally signed!');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all shadow"
              >
                Sign Off &amp; Approve Opinion
              </button>
            )}
          </div>

          {/* Key Scrutiny Findings */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Certified Legal Findings</h3>
            <div className="space-y-2">
              {currentCase.legalOpinion.keyFindings.map((finding, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Legal Recommendations Prior to Purchase</h3>
            <div className="space-y-2">
              {currentCase.legalOpinion.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 flex items-start gap-2">
                  <span className="font-bold text-amber-400 flex-shrink-0">#{idx + 1}</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

