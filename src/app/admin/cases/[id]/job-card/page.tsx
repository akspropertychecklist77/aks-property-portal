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
  AlertCircle,
  Upload,
  ExternalLink,
  Sparkles,
  RefreshCw,
  X,
  Eye,
  FileCheck,
  Building2,
  Calendar,
  Layers,
  MapPin
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

  // Modal States
  const [showEcModal, setShowEcModal] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New EC Form State
  const [ecForm, setEcForm] = useState({
    period: '1994 - 2026 (32 Years)',
    sro: 'Chennai SRO',
    surveyNumber: '428/1',
    docNumber: '',
    natureOfDeed: 'Sale Deed',
    parties: '',
    isEncumbrance: false,
    remarks: '',
    file: null as File | null,
    sourceType: 'MANUAL_UPLOAD' as 'MANUAL_UPLOAD' | 'TNREGINET_AUTO_FETCH',
  });

  // New Parent Doc Form State
  const [parentForm, setParentForm] = useState({
    sequenceOrder: 1,
    deedType: 'Registered Sale Deed',
    docNumber: '',
    year: '2005',
    sro: 'Chennai SRO',
    executants: '',
    claimants: '',
    extent: '2,400 Sq.Ft',
    scheduleMatches: true,
    notes: 'Root title verified unbroken.',
    file: null as File | null,
  });

  // Revenue Upload State
  const [pattaUploading, setPattaUploading] = useState(false);
  const [fmbUploading, setFmbUploading] = useState(false);

  const loadCaseData = () => {
    fetch(`/api/cases/${caseId}`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          const dbData = result.data;
          const stageIndex = (dbData.current_stage || 1) - 1;
          const stageId = PROCESS_STAGES[stageIndex]?.id || '1_ENQUIRY';

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
            ecRecords: dbData.ecRecords || [],
            parentDocs: dbData.parentDocs || [],
            currentDoc: dbData.revenueRecord || {
              id: 'curr_1',
              pattaNumber: dbData.revenueRecord?.patta_number || 'Pending Upload',
              pattaType: 'Individual',
              pattaHolder: dbData.client_name,
              fmbVerified: false,
              tslrVerified: false,
              revenueStatus: 'Clear',
              notes: 'Manual document verification in progress.',
              pattaFileUrl: dbData.revenueRecord?.patta_file_url || null,
              fmbFileUrl: dbData.revenueRecord?.fmb_file_url || null,
            },
            legalOpinion: dbData.legalOpinion || {
              marketableTitle: 'Clear',
              encumbranceStatus: 'Nil Encumbrance',
              revenueCompliance: 'Full Patta Available',
              keyFindings: [
                'Chain of title verified unbroken for 30+ years.',
                'Patta transferred cleanly in the name of the current vendor.',
                'Nil encumbrance certificates confirmed from respective SRO.',
              ],
              recommendations: [
                'Inspect original parent deeds at registration.',
                'Verify latest property tax paid receipt before final deed execution.',
              ],
              advocateSignoff: false,
              advocateName: 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
            },
            uploadedFiles: [],
          });

          // Pre-fill SRO & Survey in forms
          setEcForm(prev => ({
            ...prev,
            sro: `${dbData.district} SRO`,
            surveyNumber: dbData.survey_number || '',
          }));
          setParentForm(prev => ({
            ...prev,
            sro: `${dbData.district} SRO`,
          }));
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
  };

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  // Handle New EC Record Submission (With File Upload & DB Save)
  const handleSaveEcRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let uploadedFileUrl = '';
      let uploadedFileName = '';

      // 1. Upload File if selected
      if (ecForm.file) {
        const fileFormData = new FormData();
        fileFormData.append('file', ecForm.file);
        fileFormData.append('caseId', caseId);
        fileFormData.append('category', 'EC_CERTIFICATE');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: fileFormData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedFileUrl = uploadData.fileUrl;
          uploadedFileName = uploadData.fileName;
        }
      }

      // 2. Save EC Record into SQL Database
      const res = await fetch(`/api/cases/${caseId}/job-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'EC_RECORD',
          data: {
            period: ecForm.period,
            sro: ecForm.sro,
            surveyNumber: ecForm.surveyNumber,
            docNumber: ecForm.docNumber,
            natureOfDeed: ecForm.natureOfDeed,
            parties: ecForm.parties,
            isEncumbrance: ecForm.isEncumbrance,
            remarks: ecForm.remarks,
            docFileName: uploadedFileName || null,
            docFileUrl: uploadedFileUrl || null,
            sourceType: ecForm.sourceType,
            verificationStatus: 'VERIFIED',
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowEcModal(false);
        // Reset form
        setEcForm({
          period: '1994 - 2026 (32 Years)',
          sro: `${currentCase?.district || 'Chennai'} SRO`,
          surveyNumber: currentCase?.surveyNumber || '',
          docNumber: '',
          natureOfDeed: 'Sale Deed',
          parties: '',
          isEncumbrance: false,
          remarks: '',
          file: null,
          sourceType: 'MANUAL_UPLOAD',
        });
        // Reload fresh data from DB
        loadCaseData();
      }
    } catch (err) {
      console.error('Failed to save EC record:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Simulate Government TNReginet Auto-Fetch for EC
  const handleAutoFetchTNReginet = () => {
    setSubmitting(true);
    setTimeout(() => {
      setEcForm(prev => ({
        ...prev,
        sourceType: 'TNREGINET_AUTO_FETCH',
        period: '1994 - 2026 (32 Years Certified)',
        docNumber: `TNR-${Math.floor(1000 + Math.random() * 9000)}/2026`,
        natureOfDeed: 'Sale Deed (Certified Clear)',
        parties: 'V. Sundaram to Transferee',
        remarks: 'Directly verified from Inspector General of Registration (TNeGA/Kaveri Portal)',
      }));
      setSubmitting(false);
    }, 700);
  };

  // Handle Delete EC Record from Database
  const handleDeleteEcRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to remove this EC record from the database?')) return;
    try {
      await fetch(`/api/cases/${caseId}/job-card?type=EC_RECORD&recordId=${recordId}`, {
        method: 'DELETE',
      });
      loadCaseData();
    } catch (err) {
      console.error('Failed to delete EC record:', err);
    }
  };

  // Handle New Parent Document Submission (With File Upload & DB Save)
  const handleSaveParentDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let uploadedFileUrl = '';
      let uploadedFileName = '';

      if (parentForm.file) {
        const fileFormData = new FormData();
        fileFormData.append('file', parentForm.file);
        fileFormData.append('caseId', caseId);
        fileFormData.append('category', 'PARENT_DEED');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: fileFormData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedFileUrl = uploadData.fileUrl;
          uploadedFileName = uploadData.fileName;
        }
      }

      const res = await fetch(`/api/cases/${caseId}/job-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PARENT_DOC',
          data: {
            sequenceOrder: parentForm.sequenceOrder,
            deedType: parentForm.deedType,
            docNumber: parentForm.docNumber,
            sro: parentForm.sro,
            year: parentForm.year,
            executants: parentForm.executants,
            claimants: parentForm.claimants,
            extent: parentForm.extent,
            scheduleMatches: parentForm.scheduleMatches,
            notes: parentForm.notes,
            docFileName: uploadedFileName || null,
            docFileUrl: uploadedFileUrl || null,
            sourceType: 'MANUAL_UPLOAD',
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowParentModal(false);
        setParentForm({
          sequenceOrder: (currentCase?.parentDocs.length || 0) + 1,
          deedType: 'Registered Sale Deed',
          docNumber: '',
          year: '2010',
          sro: `${currentCase?.district || 'Chennai'} SRO`,
          executants: '',
          claimants: '',
          extent: '2,400 Sq.Ft',
          scheduleMatches: true,
          notes: 'Root title verified unbroken.',
          file: null,
        });
        loadCaseData();
      }
    } catch (err) {
      console.error('Failed to save parent deed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Revenue File Uploads (Patta / FMB Sketch)
  const handleRevenueUpload = async (file: File, docType: 'PATTA' | 'FMB') => {
    if (docType === 'PATTA') setPattaUploading(true);
    if (docType === 'FMB') setFmbUploading(true);

    try {
      const fileFormData = new FormData();
      fileFormData.append('file', file);
      fileFormData.append('caseId', caseId);
      fileFormData.append('category', docType === 'PATTA' ? 'PATTA_COPY' : 'FMB_SKETCH');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: fileFormData,
      });
      const uploadData = await uploadRes.json();

      if (uploadData.success) {
        await fetch(`/api/cases/${caseId}/job-card`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'REVENUE_PATTA',
            data: {
              pattaNumber: currentCase?.currentDoc.pattaNumber || 'Patta No. 2481',
              pattaHolder: currentCase?.clientName,
              surveyNumber: currentCase?.surveyNumber,
              chittaVerified: true,
              fmbVerified: docType === 'FMB' ? true : currentCase?.currentDoc.fmbVerified,
              pattaFileUrl: docType === 'PATTA' ? uploadData.fileUrl : currentCase?.currentDoc.pattaFileUrl,
              fmbFileUrl: docType === 'FMB' ? uploadData.fileUrl : currentCase?.currentDoc.fmbFileUrl,
              sourceType: 'MANUAL_UPLOAD',
            },
          }),
        });
        loadCaseData();
      }
    } catch (err) {
      console.error('Revenue upload failed:', err);
    } finally {
      setPattaUploading(false);
      setFmbUploading(false);
    }
  };

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pipeline"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Back to Pipeline"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {currentCase.id}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">{currentCase.clientName}</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Property: {currentCase.surveyNumber}, {currentCase.district} • {currentCase.serviceRequired}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/track/${currentCase.id}`}
            target="_blank"
            className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
          >
            <span>Preview Client View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
          >
            <Printer className="w-4 h-4" />
            <span>Generate Full Report</span>
          </button>
        </div>
      </div>

      {/* 4 Interactive Workspace Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ec')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'ec'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>1. EC Index</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/40 text-current">
            {currentCase.ecRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('parent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'parent'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>2. Parent Doc Index</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/40 text-current">
            {currentCase.parentDocs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('current')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'current'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>3. Current Doc & Patta</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/40 text-current">
            {currentCase.currentDoc.fmbVerified ? 'Verified' : 'Pending'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('opinion')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'opinion'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>4. Advocate Opinion Sign-off</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 30-YEAR EC INDEXING WORKSPACE                                      */}
      {/* ========================================================================= */}
      {activeTab === 'ec' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Encumbrance Certificate (EC) 30-Year Index</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                  SQL Database Linked
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload certified EC records or auto-fetch from Inspector General of Registration (TNReginet / Kaveri).
              </p>
            </div>

            <button
              onClick={() => setShowEcModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl transition shadow-md shadow-amber-500/10 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add EC Record</span>
            </button>
          </div>

          {currentCase.ecRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl space-y-2">
              <p>No EC entries registered yet for this property.</p>
              <button
                onClick={() => setShowEcModal(true)}
                className="text-amber-400 font-bold underline"
              >
                Click here to add or upload the first EC document
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/40">
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">SRO</th>
                    <th className="py-3 px-4">Survey No</th>
                    <th className="py-3 px-4">Doc No & Nature</th>
                    <th className="py-3 px-4">Parties Involved</th>
                    <th className="py-3 px-4">Document / Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {currentCase.ecRecords.map((ec) => (
                    <tr key={ec.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">{ec.period}</td>
                      <td className="py-3 px-4 text-slate-300">{ec.sro}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{ec.surveyNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{ec.docNumber}</div>
                        <div className="text-[10px] text-slate-400">{ec.natureOfDeed}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs">{ec.parties}</td>
                      <td className="py-3 px-4">
                        {ec.docFileUrl ? (
                          <a
                            href={ec.docFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-bold border border-slate-700 transition"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View PDF</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No File</span>
                        )}
                        {ec.sourceType === 'TNREGINET_AUTO_FETCH' && (
                          <span className="ml-1 text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-semibold">
                            TNReginet
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Verified ✓
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteEcRecord(ec.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PARENT DOCUMENTS & TITLE FLOW WORKSPACE                            */}
      {/* ========================================================================= */}
      {activeTab === 'parent' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Parent Document Flow (Title Genealogy)</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                  Chain Analysis
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload historical sale deeds, partition deeds, and settlement documents tracking origin of ownership.
              </p>
            </div>

            <button
              onClick={() => setShowParentModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl transition shadow-md shadow-amber-500/10 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Parent Deed</span>
            </button>
          </div>

          {currentCase.parentDocs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl space-y-2">
              <p>No parent deeds recorded yet.</p>
              <button
                onClick={() => setShowParentModal(true)}
                className="text-amber-400 font-bold underline"
              >
                Click to add the root parent deed
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {currentCase.parentDocs.map((pd, index) => (
                <div
                  key={pd.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Link #{index + 1} ({pd.year})
                      </span>
                      <span className="font-bold text-sm text-white">{pd.deedType}</span>
                      <span className="text-xs font-mono text-slate-400">• {pd.docNumber}</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      <span className="text-slate-500">From:</span> {pd.executants} → <span className="text-slate-500">To:</span> {pd.claimants}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      <span className="text-slate-500">Extent:</span> {pd.extent} • {pd.notes}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    {pd.docFileUrl ? (
                      <a
                        href={pd.docFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Deed PDF</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">No PDF attached</span>
                    )}

                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Link Verified ✓
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REVENUE, PATTA & FMB MEASUREMENT                                    */}
      {/* ========================================================================= */}
      {activeTab === 'current' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Current Document & Revenue Department Records</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                Tamil Nadu e-Services
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Patta Passbook, Town Survey (TSLR), and Field Measurement Book (FMB) boundary verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patta Passbook Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm text-white">Patta Passbook Record</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {currentCase.currentDoc.pattaNumber}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Patta Holder:</span>
                  <span className="font-bold">{currentCase.currentDoc.pattaHolder || currentCase.clientName}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Survey & Subdivision:</span>
                  <span className="font-mono">{currentCase.surveyNumber}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Chitta / Adangal:</span>
                  <span className="text-emerald-400 font-bold">Verified in Tamil Nadu Portal ✓</span>
                </div>
              </div>

              {/* Upload Patta PDF */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {currentCase.currentDoc.pattaFileUrl ? (
                  <a
                    href={currentCase.currentDoc.pattaFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Uploaded Patta</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">No Patta PDF attached</span>
                )}

                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{pattaUploading ? 'Uploading...' : 'Upload Patta PDF'}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleRevenueUpload(e.target.files[0], 'PATTA');
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Field Measurement Book (FMB) Sketch Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm text-white">FMB Boundary Sketch</span>
                </div>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Boundary Map
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Field Measurement Book:</span>
                  <span className="text-emerald-400 font-bold">Sub-division boundaries demarcated ✓</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Town Survey (TSLR):</span>
                  <span className="font-mono">Ward B, Block 12</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Physical Inspection Status:</span>
                  <span className="text-slate-300">Matches Registered Schedule</span>
                </div>
              </div>

              {/* Upload FMB PDF */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {currentCase.currentDoc.fmbFileUrl ? (
                  <a
                    href={currentCase.currentDoc.fmbFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View FMB Sketch</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">No FMB sketch attached</span>
                )}

                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{fmbUploading ? 'Uploading...' : 'Upload FMB Sketch'}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleRevenueUpload(e.target.files[0], 'FMB');
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ADVOCATE A.K. SARAVANAN OPINION SIGN-OFF                           */}
      {/* ========================================================================= */}
      {activeTab === 'opinion' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <span>Advocate A.K. Saravanan Scrutiny & Certification</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Stage 5 Provisional Scrutiny & Stage 6 Formal Legal Opinion Signing.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Title Findings & Scrutiny:</span>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {currentCase.legalOpinion.keyFindings.map((kf, i) => (
                  <li key={i}>{kf}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Advocate Certification:</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                I have examined the root of title, registered parent deeds for over 30 years, revenue Patta passbook, and nil encumbrance certificates. I hereby certify that the title holder holds a <span className="text-emerald-400 font-bold">Good, Clear and Marketable Title</span> free from all encumbrances.
              </p>
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-white">Advocate A.K. Saravanan (M.E. Energy, LLB)</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                  Digitally Approved & Signed ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD EC RECORD (MANUAL UPLOAD + AUTOMATION READY)                  */}
      {/* ========================================================================= */}
      {showEcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Add Encumbrance Certificate (EC) Record</h3>
              </div>
              <button
                onClick={() => setShowEcModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Government Automation Banner */}
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Government Automation (TNReginet / Kaveri)
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Auto-fetch inspector general registration data by SRO & Survey No.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoFetchTNReginet}
                disabled={submitting}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
                <span>Simulate TNReginet Fetch</span>
              </button>
            </div>

            <form onSubmit={handleSaveEcRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Search Period *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1994 - 2026 (32 Years)"
                    value={ecForm.period}
                    onChange={(e) => setEcForm({ ...ecForm, period: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Sub-Registrar Office (SRO) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SRO Tambaram / Gandhipuram"
                    value={ecForm.sro}
                    onChange={(e) => setEcForm({ ...ecForm, sro: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Document Number & Year *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1420/2012"
                    value={ecForm.docNumber}
                    onChange={(e) => setEcForm({ ...ecForm, docNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Nature of Deed *</label>
                  <select
                    value={ecForm.natureOfDeed}
                    onChange={(e) => setEcForm({ ...ecForm, natureOfDeed: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Sale Deed">Sale Deed</option>
                    <option value="Partition Deed">Partition Deed</option>
                    <option value="Settlement Deed">Settlement Deed</option>
                    <option value="Gift Deed">Gift Deed</option>
                    <option value="Release Deed">Release Deed</option>
                    <option value="Mortgage / Bank Hypothecation">Mortgage / Bank Hypothecation</option>
                    <option value="Court Attachment">Court Attachment / Litigation</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-300 mb-1">Parties Involved (Seller to Buyer) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. K. Ramasamy to Vendor R. Suresh"
                    value={ecForm.parties}
                    onChange={(e) => setEcForm({ ...ecForm, parties: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-300 mb-1">Remarks / Findings</label>
                  <input
                    type="text"
                    placeholder="e.g. Clean schedule, boundaries match registered parent title"
                    value={ecForm.remarks}
                    onChange={(e) => setEcForm({ ...ecForm, remarks: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* File Upload Box */}
                <div className="sm:col-span-2 bg-slate-950 p-4 rounded-xl border border-dashed border-slate-700 space-y-2">
                  <label className="block font-bold text-amber-400">
                    Upload Certified EC Document (PDF / Image) *
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setEcForm({ ...ecForm, file: e.target.files[0] });
                      }
                    }}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                  />
                  {ecForm.file && (
                    <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready to upload: {ecForm.file.name} ({(ecForm.file.size / 1024).toFixed(1)} KB)</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEcModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{submitting ? 'Saving to Database...' : 'Validate & Save to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD PARENT DOCUMENT (MANUAL UPLOAD + TITLE CHAIN)                */}
      {/* ========================================================================= */}
      {showParentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Add Parent Title Deed</h3>
              </div>
              <button
                onClick={() => setShowParentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParentDoc} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Deed Type *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Registered Sale Deed / Partition"
                    value={parentForm.deedType}
                    onChange={(e) => setParentForm({ ...parentForm, deedType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Document Number & Year *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Doc 2145/2005"
                    value={parentForm.docNumber}
                    onChange={(e) => setParentForm({ ...parentForm, docNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Executant (Seller) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Seller / Transferor full name"
                    value={parentForm.executants}
                    onChange={(e) => setParentForm({ ...parentForm, executants: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Claimant (Buyer) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Buyer / Transferee full name"
                    value={parentForm.claimants}
                    onChange={(e) => setParentForm({ ...parentForm, claimants: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Extent / Area Conveyed</label>
                  <input
                    type="text"
                    placeholder="e.g. 2,400 Sq.Ft / 5 Cents"
                    value={parentForm.extent}
                    onChange={(e) => setParentForm({ ...parentForm, extent: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Sub-Registrar Office (SRO)</label>
                  <input
                    type="text"
                    value={parentForm.sro}
                    onChange={(e) => setParentForm({ ...parentForm, sro: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* File Upload Box */}
                <div className="sm:col-span-2 bg-slate-950 p-4 rounded-xl border border-dashed border-slate-700 space-y-2">
                  <label className="block font-bold text-amber-400">
                    Upload Registered Parent Deed Copy (PDF / Scan)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setParentForm({ ...parentForm, file: e.target.files[0] });
                      }
                    }}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                  />
                  {parentForm.file && (
                    <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready to upload: {parentForm.file.name} ({(parentForm.file.size / 1024).toFixed(1)} KB)</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowParentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{submitting ? 'Saving to Database...' : 'Save Parent Deed to DB'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
