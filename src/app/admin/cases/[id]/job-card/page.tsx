'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Copy,
  Check,
  Award,
  Phone,
  CreditCard,
  Briefcase, 
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
  MapPin,
  Mail,
  Send,
  AlertTriangle,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  FileBox,
  Clock,
  UserCheck
} from 'lucide-react';
import { INITIAL_CASES } from '@/lib/data';
import { ClientCase, ECRecord, ParentDocument } from '@/lib/types';
import { PROCESS_STAGES } from '@/lib/constants';
import { DynamicFormRenderer } from '@/components/metadata/DynamicFormRenderer';
import { EntityMetadata } from '@/lib/metadata/types';

const DEFAULT_EC_METADATA: EntityMetadata = {
  entityKey: 'case_ec_record',
  displayName: 'Encumbrance Certificate (EC) Record',
  storageTable: 'case_ec_records',
  sections: [
    {
      id: 'sec_registration',
      title: 'Sub-Registrar Registration Details',
      columns: 2,
      fieldKeys: ['period', 'sro', 'docNumber', 'natureOfDeed'],
    },
    {
      id: 'sec_parties',
      title: 'Parties & Title Findings',
      columns: 1,
      fieldKeys: ['parties', 'remarks'],
    },
    {
      id: 'sec_attachment',
      title: 'Evidentiary Deed Copy',
      columns: 1,
      fieldKeys: ['file'],
    },
  ],
  fields: {
    period: {
      type: 'TEXT',
      label: 'Search Period',
      placeholder: 'e.g. 1994 - 2026 (32 Years)',
      defaultValue: '1994 - 2026 (32 Years)',
      validation: { required: true, message: 'Search period is required' },
    },
    sro: {
      type: 'TEXT',
      label: 'Sub-Registrar Office (SRO)',
      placeholder: 'e.g. SRO Tambaram / Gandhipuram',
      validation: { required: true, message: 'SRO jurisdiction is required' },
    },
    docNumber: {
      type: 'TEXT',
      label: 'Document Number & Year',
      placeholder: 'e.g. 1420/2012',
      validation: { required: true, pattern: '^[0-9]{1,6}\\/[0-9]{4}$', message: 'Enter format: Number/Year (e.g. 1420/2012)' },
    },
    natureOfDeed: {
      type: 'SELECT',
      label: 'Nature of Deed',
      defaultValue: 'Sale Deed',
      options: [
        { value: 'Sale Deed', label: 'Sale Deed' },
        { value: 'Partition Deed', label: 'Partition Deed' },
        { value: 'Settlement Deed', label: 'Settlement Deed' },
        { value: 'Gift Deed', label: 'Gift Deed' },
        { value: 'Release Deed', label: 'Release Deed' },
        { value: 'Mortgage / Bank Hypothecation', label: 'Mortgage / Bank Hypothecation' },
        { value: 'Court Attachment', label: 'Court Attachment / Litigation' },
      ],
    },
    parties: {
      type: 'TEXT',
      label: 'Executing Parties (Vendor / Purchaser)',
      placeholder: 'e.g. K. Ramasamy (Vendor) -> Vellingiri D (Purchaser)',
      validation: { required: true, message: 'Party details are required' },
    },
    remarks: {
      type: 'TEXTAREA',
      label: 'Legal Scrutiny Observations / Encumbrance Finding',
      placeholder: 'Clear title transfer. Nil pending court attachment or bank charges recorded.',
      defaultValue: 'Clear title transfer. Nil pending court attachment or bank charges recorded.',
    },
    file: {
      type: 'FILE_UPLOAD',
      label: 'Evidentiary Certified Copy / Receipt (PDF / JPEG)',
    },
  },
};

const DEFAULT_PARENT_METADATA: EntityMetadata = {
  entityKey: 'case_parent_doc',
  displayName: 'Parent Title Deed (Devolution Link)',
  storageTable: 'case_parent_docs',
  sections: [
    {
      id: 'sec_deed_header',
      title: 'Registered Deed Details',
      columns: 3,
      fieldKeys: ['deedType', 'docNumber', 'year', 'sro'],
    },
    {
      id: 'sec_deed_parties',
      title: 'Devolution Parties',
      columns: 2,
      fieldKeys: ['executants', 'claimants'],
    },
    {
      id: 'sec_schedule',
      title: 'Property Schedule & Extent Verification',
      columns: 2,
      fieldKeys: ['extent', 'scheduleMatches'],
    },
    {
      id: 'sec_notes',
      title: 'Scrutiny Notes & Devolution Chain',
      columns: 1,
      fieldKeys: ['notes', 'file'],
    },
  ],
  fields: {
    deedType: {
      type: 'SELECT',
      label: 'Deed Classification',
      defaultValue: 'Registered Sale Deed',
      options: [
        { value: 'Registered Sale Deed', label: 'Registered Sale Deed' },
        { value: 'Partition Deed', label: 'Partition Deed' },
        { value: 'Settlement Deed', label: 'Settlement Deed' },
        { value: 'Release Deed', label: 'Release Deed' },
        { value: 'Will / Probate / Succession', label: 'Will / Probate / Succession' },
        { value: 'Court Decree / Auction', label: 'Court Decree / Auction' },
      ],
    },
    docNumber: {
      type: 'TEXT',
      label: 'Deed Document Number',
      placeholder: 'e.g. 1845/2010',
      validation: { required: true, message: 'Document number is required' },
    },
    year: {
      type: 'TEXT',
      label: 'Registration Year',
      placeholder: 'e.g. 2010',
      defaultValue: '2010',
    },
    sro: {
      type: 'TEXT',
      label: 'Registering SRO',
      placeholder: 'e.g. Gandhipuram SRO',
    },
    executants: {
      type: 'TEXT',
      label: 'Executants (Prior Owners)',
      placeholder: 'e.g. R. Subramaniam & Legal Heirs',
    },
    claimants: {
      type: 'TEXT',
      label: 'Claimants (Transferee)',
      placeholder: 'e.g. K. Vellingiri',
    },
    extent: {
      type: 'TEXT',
      label: 'Deed Extent (Area)',
      placeholder: 'e.g. 2,400 Sq.Ft (5.5 Cents)',
      defaultValue: '2,400 Sq.Ft (5.5 Cents)',
    },
    scheduleMatches: {
      type: 'CHECKBOX',
      label: 'Boundaries & Schedule Match Current Survey Extent',
      defaultValue: true,
    },
    notes: {
      type: 'TEXTAREA',
      label: 'Devolution Trace & Title Continuity Notes',
      placeholder: 'Root title verified unbroken. Vendor possessed continuous physical possession.',
      defaultValue: 'Root title verified unbroken. Vendor possessed continuous physical possession.',
    },
    file: {
      type: 'FILE_UPLOAD',
      label: 'Upload Registered Parent Deed Copy (PDF / Scan)',
    },
  },
};

export default function JobCardPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const caseId = decodeURIComponent(unwrappedParams.id);

  const [currentCase, setCurrentCase] = useState<ClientCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'welcome' | 'ec' | 'parent' | 'current' | 'opinion'>('welcome');
  const [copiedDocket, setCopiedDocket] = useState(false);
  
  // Live Draft Save Indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'syncing'>('saved');

  const copyDocketId = () => {
    if (!currentCase) return;
    navigator.clipboard.writeText(currentCase.id);
    setCopiedDocket(true);
    setTimeout(() => setCopiedDocket(false), 2000);
  };

  // Modal States
  const [showEcModal, setShowEcModal] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Dynamic Metadata States
  const [ecMetadata, setEcMetadata] = useState<EntityMetadata>(DEFAULT_EC_METADATA);
  const [parentMetadata, setParentMetadata] = useState<EntityMetadata>(DEFAULT_PARENT_METADATA);
  const [ecInitialValues, setEcInitialValues] = useState<Record<string, any>>({});
  const [parentInitialValues, setParentInitialValues] = useState<Record<string, any>>({});

  // Welcome Letter (Stage 3) State
  const [welcomeLetter, setWelcomeLetter] = useState<any>(null);
  const [welcomeForm, setWelcomeForm] = useState({
    letterRefNo: `AKS/WL/2026/${caseId.replace(/[^0-9]/g, '').slice(-4) || '0042'}`,
    letterDate: new Date().toISOString().split('T')[0],
    scopeSummary: 'Comprehensive 30-year property title scrutiny, Encumbrance Certificate (EC) cross-verification, revenue Patta mutation validation, and preparation of Certified Advocate Title Opinion Report.',
    deliveryTimelineDays: 5,
    totalFee: 6500,
    advanceAmount: 5200,
    balanceAmount: 1300,
    termsAndConditions: '1. Professional legal opinion will be issued within 5 working days upon receipt of all required original/certified copies.\n2. 80% advance professional fee is payable upon issuance of this Welcome Letter to initiate search and scrutiny.\n3. The remaining 20% balance is payable prior to physical dispatch of the final sealed legal report.',
    customClauses: '',
    requiredDocs: [
      { id: 'doc1', title: 'Original / Registered Copy of Vendor Title Deed', checked: true },
      { id: 'doc2', title: 'Prior Parent Deeds for past 30+ years', checked: true },
      { id: 'doc3', title: '30-Year Encumbrance Certificates (Form 15 & 16)', checked: true },
      { id: 'doc4', title: 'Computerized e-Patta Extract & Chitta Copy', checked: true },
      { id: 'doc5', title: 'Field Measurement Book (FMB) Sketch / TSLR', checked: true },
      { id: 'doc6', title: 'Latest Property Tax / Land Revenue Assessment Receipts', checked: true },
      { id: 'doc7', title: 'Layout Sanction / DTCP / CMDA Building Approval Copy', checked: false },
    ],
    dispatchChannel: 'whatsapp' as 'whatsapp' | 'email' | 'registered_post' | 'hand_delivery',
    dispatchRef: '',
  });

  // Revenue Upload State
  const [pattaUploading, setPattaUploading] = useState(false);
  const [chittaUploading, setChittaUploading] = useState(false);
  const [fmbUploading, setFmbUploading] = useState(false);

  // Government e-Services (Patta & FMB) Auto-Fetch State
  const [showGovRevenueModal, setShowGovRevenueModal] = useState(false);
  const [govRevenueType, setGovRevenueType] = useState<'PATTA' | 'FMB'>('PATTA');
  const [govFetching, setGovFetching] = useState(false);
  const [govFetchedData, setGovFetchedData] = useState<any>(null);

  const [govRevenueForm, setGovRevenueForm] = useState({
    district: 'Chennai',
    taluk: 'Alandur',
    village: 'St. Thomas Mount',
    surveyNumber: '428',
    subdivision: '1',
  });

  // Fetch Latest Dynamic Metadata from Cloudflare D1
  useEffect(() => {
    fetch('/api/meta/entities/case_ec_record')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) setEcMetadata(result.data);
      })
      .catch(() => {});

    fetch('/api/meta/entities/case_parent_doc')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) setParentMetadata(result.data);
      })
      .catch(() => {});
  }, []);

  const openEcModal = () => {
    setModalError(null);
    setEcInitialValues({
      period: '1994 - 2026 (32 Years)',
      sro: `${currentCase?.district || 'Chennai'} SRO`,
      surveyNumber: currentCase?.surveyNumber || '',
      docNumber: '',
      natureOfDeed: 'Sale Deed',
      parties: '',
      isEncumbrance: false,
      remarks: '',
      sourceType: 'MANUAL_UPLOAD',
    });
    setShowEcModal(true);
  };

  const openParentModal = () => {
    setModalError(null);
    setParentInitialValues({
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
    });
    setShowParentModal(true);
  };

  useEffect(() => {
    if (toastNotice) {
      const timer = setTimeout(() => setToastNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotice]);

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
            currentDoc: dbData.revenueRecord ? {
              id: dbData.revenueRecord.id || 'curr_1',
              pattaNumber: dbData.revenueRecord.patta_number || 'Pending Upload',
              pattaType: 'Individual',
              pattaHolder: dbData.revenueRecord.patta_holder_name || dbData.client_name,
              chittaVerified: Boolean(dbData.revenueRecord.chitta_adangal_verified),
              fmbVerified: Boolean(dbData.revenueRecord.fmb_sketch_verified),
              tslrVerified: Boolean(dbData.revenueRecord.chitta_adangal_verified),
              revenueStatus: 'Clear',
              notes: dbData.revenueRecord.source_type === 'ESERVICES_TN_AUTO_FETCH' ? 'Verified on Tamil Nadu e-Services' : 'Manual document verification in progress.',
              pattaFileUrl: dbData.revenueRecord.patta_file_url || null,
              pattaFileName: dbData.revenueRecord.patta_file_name || null,
              chittaFileUrl: dbData.revenueRecord.chitta_file_url || null,
              chittaFileName: dbData.revenueRecord.chitta_file_name || null,
              fmbFileUrl: dbData.revenueRecord.fmb_file_url || null,
              fmbFileName: dbData.revenueRecord.fmb_file_name || null,
              sourceType: dbData.revenueRecord.source_type || 'MANUAL_UPLOAD',
              subDivision: dbData.revenueRecord.sub_division || '',
              villageTaluk: dbData.revenueRecord.village_taluk || '',
            } : {
              id: 'curr_1',
              pattaNumber: 'Pending Upload',
              pattaType: 'Individual',
              pattaHolder: dbData.client_name,
              chittaVerified: false,
              fmbVerified: false,
              tslrVerified: false,
              revenueStatus: 'Clear',
              notes: 'Manual document verification in progress.',
              pattaFileUrl: null,
              pattaFileName: null,
              chittaFileUrl: null,
              chittaFileName: null,
              fmbFileUrl: null,
              fmbFileName: null,
              sourceType: 'MANUAL_UPLOAD',
              subDivision: '',
              villageTaluk: '',
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

          // Sync welcome form defaults with case fees
          setWelcomeForm(prev => ({
            ...prev,
            totalFee: dbData.total_fee || 6500,
            advanceAmount: dbData.advance_amount || 5200,
            balanceAmount: dbData.balance_amount || 1300,
          }));

          // Set default tab based on stage
          if (stageId === '3_WELCOME_ADVANCE') {
            setActiveTab('welcome');
          } else if (stageId === '4_JOB_CARD') {
            setActiveTab('ec');
          }
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

    // Load Welcome Letter from Cloudflare D1
    fetch(`/api/cases/${caseId}/welcome-letter`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setWelcomeLetter(result.data);
          try {
            const docsParsed = JSON.parse(result.data.documents_required_json || '[]');
            if (Array.isArray(docsParsed) && docsParsed.length > 0) {
              setWelcomeForm(prev => ({
                ...prev,
                letterRefNo: result.data.letter_ref_no || prev.letterRefNo,
                letterDate: result.data.letter_date || prev.letterDate,
                scopeSummary: result.data.scope_summary || prev.scopeSummary,
                deliveryTimelineDays: result.data.delivery_timeline_days || prev.deliveryTimelineDays,
                totalFee: result.data.total_fee || prev.totalFee,
                advanceAmount: result.data.advance_amount || prev.advanceAmount,
                balanceAmount: result.data.balance_amount || prev.balanceAmount,
                termsAndConditions: result.data.terms_and_conditions || prev.termsAndConditions,
                customClauses: result.data.custom_clauses || '',
                dispatchChannel: (result.data.sent_channel as any) || 'whatsapp',
                dispatchRef: result.data.dispatch_ref || '',
              }));
            }
          } catch (e) {
            console.warn('Could not parse documents json:', e);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  // Handler: Save Welcome Letter Draft
  const handleSaveWelcomeDraft = async () => {
    setSaveStatus('syncing');
    try {
      const res = await fetch(`/api/cases/${caseId}/welcome-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter_ref_no: welcomeForm.letterRefNo,
          letter_date: welcomeForm.letterDate,
          scope_summary: welcomeForm.scopeSummary,
          documents_required_json: JSON.stringify(welcomeForm.requiredDocs.filter(d => d.checked).map(d => d.title)),
          delivery_timeline_days: welcomeForm.deliveryTimelineDays,
          total_fee: welcomeForm.totalFee,
          advance_amount: welcomeForm.advanceAmount,
          balance_amount: welcomeForm.balanceAmount,
          terms_and_conditions: welcomeForm.termsAndConditions,
          custom_clauses: welcomeForm.customClauses || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save welcome letter draft.');
      }

      setWelcomeLetter(data.data);
      setSaveStatus('saved');
      setToastNotice({
        type: 'success',
        message: '✓ Welcome Letter draft saved successfully to database!',
      });
    } catch (err: any) {
      console.error('Failed to save welcome draft:', err);
      setSaveStatus('unsaved');
      setToastNotice({
        type: 'error',
        message: `✗ Error saving draft: ${err.message}`,
      });
    }
  };

  // Handler: Approve Welcome Letter (Advocate A.K. Saravanan MS/1245/2005)
  const handleApproveWelcomeLetter = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/welcome-letter/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_by: 'Advocate A.K. Saravanan (MS/1245/2005)',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve welcome letter.');
      }

      setWelcomeLetter(data.data);
      setToastNotice({
        type: 'success',
        message: '✓ Welcome Letter officially approved by Advocate A.K. Saravanan (MS/1245/2005)!',
      });
    } catch (err: any) {
      console.error('Approval failed:', err);
      setToastNotice({
        type: 'error',
        message: `✗ Approval failed: ${err.message}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handler: Dispatch / Send Welcome Letter to Client
  const handleSendWelcomeLetter = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/welcome-letter/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: welcomeForm.dispatchChannel,
          dispatch_ref: welcomeForm.dispatchRef || `${welcomeForm.dispatchChannel.toUpperCase()}-${Date.now().toString().slice(-6)}`,
          sent_by: 'Advocate Desk / Intake Staff',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record letter dispatch.');
      }

      setWelcomeLetter(data.data);
      setToastNotice({
        type: 'success',
        message: `✓ Welcome Letter marked as sent via ${welcomeForm.dispatchChannel}! ${data.gate4_unlocked ? 'Gate 4 is UNLOCKED.' : 'Gate 4 unlocks once 80% advance payment is received.'}`,
      });
      loadCaseData();
    } catch (err: any) {
      console.error('Dispatch recording failed:', err);
      setToastNotice({
        type: 'error',
        message: `✗ Failed to mark sent: ${err.message}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic Metadata Handler: Save EC Record into Cloudflare Database
  const handleSaveEcRecordDynamic = async (formValues: Record<string, any>) => {
    setModalError(null);
    setSubmitting(true);

    try {
      let uploadedFileUrl = '';
      let uploadedFileName = '';

      if (formValues.file instanceof File) {
        const fileFormData = new FormData();
        fileFormData.append('file', formValues.file);
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
        } else {
          throw new Error(uploadData.error || 'Failed to upload deed copy.');
        }
      }

      const res = await fetch(`/api/cases/${caseId}/job-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'EC_RECORD',
          data: {
            period: formValues.period || '1994 - 2026 (32 Years)',
            sro: (formValues.sro || '').trim(),
            surveyNumber: (formValues.surveyNumber || currentCase?.surveyNumber || '').trim(),
            docNumber: (formValues.docNumber || '').trim(),
            natureOfDeed: formValues.natureOfDeed || 'Sale Deed',
            parties: (formValues.parties || '').trim(),
            isEncumbrance: Boolean(formValues.isEncumbrance),
            remarks: (formValues.remarks || '').trim(),
            docFileName: uploadedFileName || null,
            docFileUrl: uploadedFileUrl || null,
            sourceType: formValues.sourceType || 'MANUAL_UPLOAD',
            verificationStatus: 'VERIFIED',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save EC record to database.');
      }

      setShowEcModal(false);
      setToastNotice({
        type: 'success',
        message: `✓ EC Record (Doc No: ${formValues.docNumber}) successfully saved to Cloudflare database!`,
      });
      loadCaseData();
    } catch (err: any) {
      console.error('Failed to save EC record:', err);
      setModalError(err.message || 'Failed to save EC record. Please try again.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  // Simulate Government TNReginet Auto-Fetch for EC
  const handleAutoFetchTNReginet = () => {
    setSubmitting(true);
    setTimeout(() => {
      setEcInitialValues(prev => ({
        ...prev,
        sourceType: 'TNREGINET_AUTO_FETCH',
        period: '1994 - 2026 (32 Years Certified)',
        docNumber: `TNR-${Math.floor(1000 + Math.random() * 9000)}/2026`,
        natureOfDeed: 'Sale Deed (Certified Clear)',
        parties: 'V. Sundaram to Transferee',
        remarks: 'Directly verified from Inspector General of Registration (TNeGA/Kaveri Portal)',
      }));
      setToastNotice({
        type: 'success',
        message: '✓ Simulated TNReginet data fetched and pre-populated into dynamic form!',
      });
      setSubmitting(false);
    }, 700);
  };

  // Handle Delete EC Record from Database
  const handleDeleteEcRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to remove this EC record from the database?')) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/job-card?type=EC_RECORD&recordId=${recordId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete EC record from database.');
      }
      setToastNotice({
        type: 'success',
        message: '✓ EC record deleted successfully from database.',
      });
      loadCaseData();
    } catch (err: any) {
      console.error('Failed to delete EC record:', err);
      setToastNotice({
        type: 'error',
        message: err.message || 'Failed to delete EC record.',
      });
    }
  };

  // Dynamic Metadata Handler: Save Parent Title Deed into Cloudflare Database
  const handleSaveParentDocDynamic = async (formValues: Record<string, any>) => {
    setModalError(null);
    setSubmitting(true);

    try {
      let uploadedFileUrl = '';
      let uploadedFileName = '';

      if (formValues.file instanceof File) {
        const fileFormData = new FormData();
        fileFormData.append('file', formValues.file);
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
        } else {
          throw new Error(uploadData.error || 'Failed to upload deed copy.');
        }
      }

      const res = await fetch(`/api/cases/${caseId}/job-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PARENT_DOC',
          data: {
            sequenceOrder: (currentCase?.parentDocs.length || 0) + 1,
            deedType: formValues.deedType || 'Registered Sale Deed',
            docNumber: (formValues.docNumber || '').trim(),
            sro: (formValues.sro || '').trim(),
            year: formValues.year || '2010',
            executants: (formValues.executants || '').trim(),
            claimants: (formValues.claimants || '').trim(),
            extent: (formValues.extent || '').trim(),
            scheduleMatches: formValues.scheduleMatches !== undefined ? Boolean(formValues.scheduleMatches) : true,
            notes: (formValues.notes || 'Root title verified unbroken.').trim(),
            docFileName: uploadedFileName || null,
            docFileUrl: uploadedFileUrl || null,
            sourceType: 'MANUAL_UPLOAD',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save parent document to database.');
      }

      setShowParentModal(false);
      setToastNotice({
        type: 'success',
        message: `✓ Parent Document (Doc No: ${formValues.docNumber}) successfully added to title chain!`,
      });
      loadCaseData();
    } catch (err: any) {
      console.error('Failed to save parent deed:', err);
      setModalError(err.message || 'Failed to save parent document. Please try again.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Revenue File Uploads (Patta / Chitta / FMB Sketch)
  const handleRevenueUpload = async (file: File, docType: 'PATTA' | 'CHITTA' | 'FMB') => {
    if (docType === 'PATTA') setPattaUploading(true);
    if (docType === 'CHITTA') setChittaUploading(true);
    if (docType === 'FMB') setFmbUploading(true);

    try {
      const categoryMap = {
        PATTA: 'PATTA_COPY',
        CHITTA: 'CHITTA_EXTRACT',
        FMB: 'FMB_SKETCH',
      };

      const fileFormData = new FormData();
      fileFormData.append('file', file);
      fileFormData.append('caseId', caseId);
      fileFormData.append('category', categoryMap[docType]);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: fileFormData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || `Failed to upload ${docType} document.`);
      }

      const updateRes = await fetch(`/api/cases/${caseId}/job-card`, {
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
            pattaFileName: docType === 'PATTA' ? uploadData.fileName : currentCase?.currentDoc.pattaFileName,
            chittaFileUrl: docType === 'CHITTA' ? uploadData.fileUrl : currentCase?.currentDoc.chittaFileUrl,
            chittaFileName: docType === 'CHITTA' ? uploadData.fileName : currentCase?.currentDoc.chittaFileName,
            fmbFileUrl: docType === 'FMB' ? uploadData.fileUrl : currentCase?.currentDoc.fmbFileUrl,
            fmbFileName: docType === 'FMB' ? uploadData.fileName : currentCase?.currentDoc.fmbFileName,
            sourceType: 'MANUAL_UPLOAD',
          },
        }),
      });

      if (!updateRes.ok) {
        throw new Error(`Failed to save ${docType} document metadata to database.`);
      }

      setToastNotice({
        type: 'success',
        message: `✓ ${docType} document successfully uploaded and saved to case docket!`,
      });
      loadCaseData();
    } catch (err: any) {
      console.error('Revenue upload failed:', err);
      setToastNotice({
        type: 'error',
        message: err.message || `Failed to upload ${docType} document.`,
      });
    } finally {
      setPattaUploading(false);
      setChittaUploading(false);
      setFmbUploading(false);
    }
  };

  // Open Government e-Services Fetch Dialog
  const openGovRevenueModal = (type: 'PATTA' | 'FMB') => {
    setGovRevenueType(type);
    setGovFetchedData(null);
    const sParts = (currentCase?.surveyNumber || '428/1').split('/');
    setGovRevenueForm({
      district: currentCase?.district || 'Chennai',
      taluk: 'Alandur',
      village: 'St. Thomas Mount',
      surveyNumber: sParts[0] || '428',
      subdivision: sParts[1] || '1',
    });
    setShowGovRevenueModal(true);
  };

  // Simulate automated fetch from Tamil Nadu e-Services (eservices.tn.gov.in)
  const handleSimulateGovRevenueFetch = () => {
    setGovFetching(true);
    setTimeout(() => {
      if (govRevenueType === 'PATTA') {
        setGovFetchedData({
          pattaNumber: `PATTA-2026/TN-${govRevenueForm.surveyNumber}${govRevenueForm.subdivision}`,
          pattaHolder: currentCase?.clientName || 'VELLINGIRI D',
          fatherHusbandName: 'R. DEVENDIRAN',
          district: govRevenueForm.district,
          taluk: govRevenueForm.taluk,
          village: govRevenueForm.village,
          surveyNo: `${govRevenueForm.surveyNumber}/${govRevenueForm.subdivision}`,
          landKind: 'நஞ்சை / புஞ்சை மனை (Ryotwari Dry Land - Approved Residential Layout)',
          extentAcreCents: '0 Hectares 2.22 Ares (2,400 Sq.Ft / 5.50 Cents)',
          fasliYear: '1435',
          kistTax: '₹4.50 (Paid & Clear)',
          chittaStatus: 'Verified Clean on TNeGA e-Services',
          digitalSign: 'Digitally Signed by Zonal Deputy Tahsildar (TNeGA Secure Hash: eS-94827104)',
        });
      } else {
        setGovFetchedData({
          fmbNumber: `FMB-${govRevenueForm.surveyNumber}/${govRevenueForm.subdivision}`,
          district: govRevenueForm.district,
          taluk: govRevenueForm.taluk,
          village: govRevenueForm.village,
          surveyNo: `${govRevenueForm.surveyNumber}/${govRevenueForm.subdivision}`,
          boundaries: {
            north: `S.F. No. ${parseInt(govRevenueForm.surveyNumber) - 1 || '427'} (Private Patta Land - 60.0 ft)`,
            south: `S.F. No. ${parseInt(govRevenueForm.surveyNumber) + 1 || '429'} (30 Feet Public Layout Road - 60.0 ft)`,
            east: 'Main Scheme Approach Road (40.0 ft)',
            west: `S.F. No. ${govRevenueForm.surveyNumber}/2 (Sub-divided Plot - 40.0 ft)`,
          },
          dimensions: {
            northLength: '60.0 ft',
            southLength: '60.0 ft',
            eastBreadth: '40.0 ft',
            westBreadth: '40.0 ft',
            diagonalGLine: '72.1 ft',
            totalArea: '2,400 Sq.Ft (5.5 Cents)',
          },
          tslrRecord: 'Ward B, Block 12, T.S. No. 45',
          subdivisionStatus: 'Sub-division boundaries demarcated and certified in Taluk Survey Traverse Register',
          surveyorClearance: 'Certified by Taluk Surveyor, Land Records Department',
        });
      }
      setGovFetching(false);
    }, 800);
  };

  // Approve and persist Government Revenue data into database
  const handleApproveGovRevenueToDatabase = async () => {
    setSubmitting(true);
    try {
      if (govRevenueType === 'PATTA') {
        await fetch(`/api/cases/${caseId}/job-card`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'REVENUE_PATTA',
            data: {
              pattaNumber: govFetchedData?.pattaNumber || `Patta No. ${govRevenueForm.surveyNumber}/${govRevenueForm.subdivision}`,
              pattaHolder: govFetchedData?.pattaHolder || currentCase?.clientName,
              surveyNumber: `${govRevenueForm.surveyNumber}/${govRevenueForm.subdivision}`,
              subDivision: govRevenueForm.subdivision,
              villageTaluk: `${govRevenueForm.village}, ${govRevenueForm.taluk}`,
              chittaVerified: true,
              fmbVerified: currentCase?.currentDoc.fmbVerified,
              sourceType: 'ESERVICES_TN_AUTO_FETCH',
            },
          }),
        });
      } else {
        await fetch(`/api/cases/${caseId}/job-card`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'REVENUE_PATTA',
            data: {
              pattaNumber: currentCase?.currentDoc.pattaNumber !== 'Pending Upload' ? currentCase?.currentDoc.pattaNumber : `Patta No. ${govRevenueForm.surveyNumber}/${govRevenueForm.subdivision}`,
              pattaHolder: currentCase?.currentDoc.pattaHolder || currentCase?.clientName,
              surveyNumber: `${govRevenueForm.surveyNumber}/${govRevenueForm.subdivision}`,
              subDivision: govRevenueForm.subdivision,
              villageTaluk: `${govRevenueForm.village}, ${govRevenueForm.taluk}`,
              chittaVerified: true,
              fmbVerified: true,
              sourceType: 'ESERVICES_TN_AUTO_FETCH',
            },
          }),
        });
      }

      setShowGovRevenueModal(false);
      setToastNotice({
        type: 'success',
        message: `✓ Government ${govRevenueType} data successfully approved and saved to database!`,
      });
      loadCaseData();
    } catch (err: any) {
      console.error('Failed to approve government revenue record:', err);
      setToastNotice({
        type: 'error',
        message: err.message || 'Failed to approve government revenue record.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold">Opening Legal Case Workbench from Cloudflare D1...</span>
      </div>
    );
  }

  if (!currentCase) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <p>Case {caseId} not found in database.</p>
        <Link href="/admin/pipeline" className="text-blue-600 dark:text-blue-400 underline text-xs mt-2 inline-block font-semibold">
          Return to Legal Case Pipeline
        </Link>
      </div>
    );
  }

  const stageIndex = PROCESS_STAGES.findIndex(s => s.id === currentCase.currentStage);
  const isGate4Unlocked = Boolean(
    (welcomeLetter?.sent_status === 'sent' || stageIndex >= 3) && currentCase.advancePaid
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* Toast Notification Banner */}
      {toastNotice && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200 ${
          toastNotice.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {toastNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{toastNotice.message}</span>
          </div>
          <button onClick={() => setToastNotice(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PERSISTENT CASE IDENTITY HEADER WITH LIVE DRAFT AUTO-SAVE INDICATOR    */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/pipeline"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl transition"
              title="Return to Pipeline"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                {currentCase.id}
              </span>
              <button
                type="button"
                onClick={copyDocketId}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Copy Docket ID"
              >
                {copiedDocket ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>Advocate Legal Workbench • 8-Stage SOP</span>
            </span>

            {/* LIVE DRAFT AUTO-SAVE INDICATOR */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {saveStatus === 'saved' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-700 dark:text-emerald-400">✓ Draft saved</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-700 dark:text-amber-400">● Unsaved edits</span>
                </>
              )}
              {saveStatus === 'syncing' && (
                <>
                  <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                  <span className="text-blue-600 dark:text-blue-400">⟳ Syncing to D1...</span>
                </>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/track/${currentCase.id}`}
              target="_blank"
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <span>Client Tracker</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Opinion</span>
            </button>
          </div>
        </div>

        {/* 4-Metric Case Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Client & Phone */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Client & Docket Party
            </span>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {currentCase.clientName}
            </div>
            <a href={`tel:${currentCase.clientPhone}`} className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center gap-1 font-mono">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{currentCase.clientPhone}</span>
            </a>
          </div>

          {/* Property & Survey */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Property & Jurisdiction
            </span>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {currentCase.surveyNumber ? `Survey S.F. ${currentCase.surveyNumber}` : 'Pending Survey'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {currentCase.district} SRO • {currentCase.serviceRequired}
            </div>
          </div>

          {/* Escrow Status (80/20) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              80/20 Escrow Rule
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">80% Advance:</span>
              <span className={`font-mono font-bold px-1.5 py-0.2 rounded border text-[11px] ${
                currentCase.advancePaid 
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800' 
                  : 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
              }`}>
                {currentCase.advancePaid ? '₹5,200 Paid ✓' : '₹5,200 Due'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">20% Balance:</span>
              <span className="font-mono font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                ₹{currentCase.balanceAmount.toLocaleString('en-IN')} (Gate 8)
              </span>
            </div>
          </div>

          {/* SOP Stage */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                SOP Milestone
              </span>
              <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                Step {stageIndex + 1} of 8
              </span>
            </div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
              {PROCESS_STAGES[stageIndex]?.shortName || 'Job Card'}
            </div>
            <div className="grid grid-cols-8 gap-1 h-1.5 w-full mt-1">
              {PROCESS_STAGES.map((stg, idx) => (
                <div
                  key={stg.id}
                  className={`rounded-full transition-all ${
                    idx < stageIndex
                      ? 'bg-emerald-500'
                      : idx === stageIndex
                      ? 'bg-blue-600 shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HIGH-VISIBILITY LEGAL INTEGRITY BANNER                                 */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs ${
        isGate4Unlocked
          ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
          : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {isGate4Unlocked ? (
              <Unlock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div>
            <div className="font-bold text-sm flex items-center gap-2">
              <span>{isGate4Unlocked ? 'Statutory Gate 4 Clear: Scrutiny Active' : 'Statutory Gate 4 Interlock: Action Required'}</span>
              <span className={`text-[10px] font-mono px-2 py-0.2 rounded font-bold border ${
                isGate4Unlocked
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700'
                  : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-700'
              }`}>
                {isGate4Unlocked ? 'UNLOCKED' : 'LOCKED'}
              </span>
            </div>
            <p className="text-xs mt-0.5 opacity-90">
              {isGate4Unlocked
                ? 'Welcome Letter has been officially dispatched and 80% advance payment has been confirmed in escrow. 30-year EC and title chain scrutiny are authorized to proceed.'
                : 'Stage 4 Job Card opening requires both: (1) Approved Welcome Letter marked as sent to client, and (2) 80% advance professional fee (₹5,200) recorded in escrow.'}
            </p>
          </div>
        </div>

        {!isGate4Unlocked && (
          <button
            onClick={() => setActiveTab('welcome')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs whitespace-nowrap self-start md:self-auto cursor-pointer"
          >
            Manage Welcome Letter →
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. DEDICATED DUAL-PANE WORKBENCH                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================================================= */}
        {/* LEFT PANE (65% - 8 Cols): 5 SECTION TABS & EDITING WORKBENCH            */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Tab Navigation Pill Bar */}
          <div className="flex gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
            {/* Tab 1: Welcome Letter */}
            <button
              type="button"
              onClick={() => setActiveTab('welcome')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'welcome'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Stage 3: Welcome Letter</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'welcome' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {welcomeLetter?.sent_status === 'sent' ? 'Sent ✓' : 'Draft'}
              </span>
            </button>

            {/* Tab 2: EC Matrix */}
            <button
              type="button"
              onClick={() => setActiveTab('ec')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'ec'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>30-Yr EC Matrix</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'ec' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800'
              }`}>
                {currentCase.ecRecords.length}
              </span>
            </button>

            {/* Tab 3: Parent Deeds */}
            <button
              type="button"
              onClick={() => setActiveTab('parent')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'parent'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Parent Title Chain</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'parent' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800'
              }`}>
                {currentCase.parentDocs.length}
              </span>
            </button>

            {/* Tab 4: Revenue & FMB */}
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Revenue (Patta/FMB)</span>
            </button>

            {/* Tab 5: Advocate Opinion */}
            <button
              type="button"
              onClick={() => setActiveTab('opinion')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'opinion'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Advocate Opinion</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'opinion' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
              }`}>
                MS/1245
              </span>
            </button>
          </div>

          {/* ======================================================================= */}
          {/* TAB 1: STAGE 3 – WELCOME LETTER GENERATION & MANAGEMENT                 */}
          {/* ======================================================================= */}
          {activeTab === 'welcome' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
              
              {/* Section Header & Status Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Stage 3: Welcome Letter & Statutory Engagement
                    </h2>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                      welcomeLetter?.approval_status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {welcomeLetter?.approval_status === 'approved' ? 'Advocate Approved ✓' : 'Awaiting Approval'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Generates official client engagement letterhead, defines scope of scrutiny, and enforces the 80% advance payment gateway.
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveWelcomeDraft}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                  >
                    Save Draft
                  </button>
                  {welcomeLetter?.approval_status !== 'approved' && (
                    <button
                      type="button"
                      onClick={handleApproveWelcomeLetter}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Approve (MS/1245/2005)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* LIVE OFFICIAL ADVOCATE LETTERHEAD PREVIEW */}
              <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-slate-50/40 dark:bg-slate-950/40 space-y-5 print:border-none print:p-0">
                
                {/* Official Letterhead Header */}
                <div className="border-b-2 border-blue-900 dark:border-blue-600 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                      CHAMBERS OF ADVOCATE A.K. SARAVANAN, B.E., LLB
                    </div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                      A.K. SARAVANAN & ASSOCIATES
                    </h1>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Advocates & Property Legal Consultants • Bar Council of Tamil Nadu & Puducherry
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1">
                      Enrollment No: <strong className="text-slate-900 dark:text-white">MS/1245/2005</strong> • Chamber: 77 Lawyers Chamber, Combined Court Complex, Coimbatore - 641018
                    </div>
                  </div>

                  <div className="text-right sm:self-start">
                    <span className="text-[10px] text-slate-400 block font-mono">Reference No:</span>
                    <input
                      type="text"
                      value={welcomeForm.letterRefNo}
                      onChange={(e) => {
                        setWelcomeForm({ ...welcomeForm, letterRefNo: e.target.value });
                        setSaveStatus('unsaved');
                      }}
                      className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-transparent border-b border-dashed border-blue-400 text-right focus:outline-none"
                    />
                    <div className="text-[11px] text-slate-500 mt-1">
                      Date: <span className="font-semibold text-slate-700 dark:text-slate-300">{welcomeForm.letterDate}</span>
                    </div>
                  </div>
                </div>

                {/* Recipient Details (Pre-filled from Case Docket) */}
                <div className="text-xs space-y-1 bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To Client:</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{currentCase.clientName}</div>
                  <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">Contact: {currentCase.clientPhone} • {currentCase.clientEmail || 'Email on file'}</div>
                  <div className="text-slate-700 dark:text-slate-300 font-semibold mt-1">
                    Matter: Property Title Verification & Legal Opinion • S.F. No. {currentCase.surveyNumber || 'Pending'}, {currentCase.district}
                  </div>
                </div>

                {/* Scope Summary Field */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] block">
                    Scope of Professional Due Diligence:
                  </label>
                  <textarea
                    rows={2}
                    value={welcomeForm.scopeSummary}
                    onChange={(e) => {
                      setWelcomeForm({ ...welcomeForm, scopeSummary: e.target.value });
                      setSaveStatus('unsaved');
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Documents Required Checklist (Interactive) */}
                <div className="space-y-2 text-xs">
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] block">
                    Documents Requested from Client:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    {welcomeForm.requiredDocs.map((doc, idx) => (
                      <label key={doc.id} className="flex items-start gap-2 cursor-pointer text-slate-700 dark:text-slate-300 text-[11px]">
                        <input
                          type="checkbox"
                          checked={doc.checked}
                          onChange={(e) => {
                            const updated = [...welcomeForm.requiredDocs];
                            updated[idx].checked = e.target.checked;
                            setWelcomeForm({ ...welcomeForm, requiredDocs: updated });
                            setSaveStatus('unsaved');
                          }}
                          className="mt-0.5 rounded text-blue-600"
                        />
                        <span className={doc.checked ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-400'}>
                          {doc.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Professional Fees & Escrow Terms */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Agreed Fee:</span>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      ₹{welcomeForm.totalFee.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">80% Advance Payable (Now):</span>
                    <div className="text-base font-black text-blue-700 dark:text-blue-400 font-mono mt-0.5">
                      ₹{welcomeForm.advanceAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">20% Balance (At Dispatch):</span>
                    <div className="text-base font-black text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                      ₹{welcomeForm.balanceAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Advocate Sign-Off Stamp in Letterhead */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">
                    Expected Delivery: <strong>{welcomeForm.deliveryTimelineDays} Working Days</strong> from document receipt.
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      Advocate A.K. Saravanan (MS/1245/2005)
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {welcomeLetter?.approval_status === 'approved' 
                        ? `Approved by ${welcomeLetter.approved_by || 'A.K. Saravanan'}` 
                        : 'Draft – Signature Pending'}
                    </div>
                  </div>
                </div>
              </div>

              {/* DISPATCH CONTROLS & AUDIT TRAIL */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/60 space-y-3 text-xs">
                <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>Client Dispatch Recording</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    Status: <strong className="uppercase">{welcomeLetter?.sent_status || 'not_sent'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Delivery Channel</label>
                    <select
                      value={welcomeForm.dispatchChannel}
                      onChange={(e: any) => setWelcomeForm({ ...welcomeForm, dispatchChannel: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="whatsapp">WhatsApp Delivery</option>
                      <option value="email">Email PDF</option>
                      <option value="registered_post">Registered Post / Speed Post</option>
                      <option value="hand_delivery">Hand Delivery / Office Pickup</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dispatch / Tracking Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. WA-MSG-94821 or SP-TN48201IN"
                      value={welcomeForm.dispatchRef}
                      onChange={(e) => setWelcomeForm({ ...welcomeForm, dispatchRef: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleSendWelcomeLetter}
                      disabled={submitting}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark as Officially Sent</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 2: MODULE 4A – 30-YEAR ENCUMBRANCE CERTIFICATE (EC) MATRIX           */}
          {/* ======================================================================= */}
          {activeTab === 'ec' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Module 4A: 30-Year Encumbrance Certificate (EC) Search
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Records every registered transaction, mortgage, partition, or court attachment from 1994 to 2026.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFetchTNReginet}
                    className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>TNReginet Auto-Fetch</span>
                  </button>

                  <button
                    type="button"
                    onClick={openEcModal}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add EC Entry</span>
                  </button>
                </div>
              </div>

              {/* EC Records Table */}
              {currentCase.ecRecords.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="font-bold text-xs text-slate-700 dark:text-slate-300">No EC Entries Recorded Yet</div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Click &quot;Add EC Entry&quot; to index registered deeds from Form 15, or use TNReginet Auto-Fetch to simulate live retrieval.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Period</th>
                        <th className="py-2.5 px-3">Doc No & SRO</th>
                        <th className="py-2.5 px-3">Nature of Deed</th>
                        <th className="py-2.5 px-3">Parties</th>
                        <th className="py-2.5 px-3">Finding</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentCase.ecRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-mono font-semibold">{rec.period}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-blue-700 dark:text-blue-400 font-mono">{rec.docNumber}</span>
                            <span className="block text-[10px] text-slate-500">{rec.sro}</span>
                          </td>
                          <td className="py-3 px-3 font-medium">{rec.natureOfDeed}</td>
                          <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                            {rec.parties}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Clear</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleDeleteEcRecord(rec.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Delete record"
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

          {/* ======================================================================= */}
          {/* TAB 3: MODULE 4B – PARENT TITLE CHAIN (DEVOLUTION TREE)                  */}
          {/* ======================================================================= */}
          {activeTab === 'parent' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Module 4B: Parent Title Deeds & Devolution Tree
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Traces title continuity from the root vendor across partitions, settlements, and registered sale deeds.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openParentModal}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Parent Deed</span>
                </button>
              </div>

              {currentCase.parentDocs.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="font-bold text-xs text-slate-700 dark:text-slate-300">No Parent Deeds Added</div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Add prior registered link deeds to establish unbroken devolution under Tamil Nadu property law.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCase.parentDocs.map((p, idx) => (
                    <div key={p.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-mono text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{p.deedType}</span>
                          <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                            Doc: {p.docNumber} ({p.year})
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          <strong>{p.executants}</strong> &rarr; <strong>{p.claimants}</strong>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Extent: {p.extent} • Schedule Match: {p.scheduleMatches ? '✓ Verified Matching' : '⚠️ Discrepancy'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                          Devolution Clear ✓
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 4: MODULE 4C – REVENUE RECORDS (PATTA / CHITTA / FMB)                */}
          {/* ======================================================================= */}
          {activeTab === 'current' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Module 4C: Revenue Record Verification & FMB Blueprint
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Cross-checks vendor Patta passbook, Chitta adangal extract, and Field Measurement Book (FMB) survey sketch.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openGovRevenueModal('PATTA')}
                    className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>e-Patta Auto-Fetch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openGovRevenueModal('FMB')}
                    className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>FMB Sketch Fetch</span>
                  </button>
                </div>
              </div>

              {/* Revenue Verification Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Patta Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Computerized e-Patta</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {currentCase.currentDoc.pattaNumber}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Holder: <strong>{currentCase.currentDoc.pattaHolder}</strong>
                  </div>
                  <div className="pt-1">
                    <label className="text-[10px] text-blue-600 hover:underline cursor-pointer font-bold block">
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf,image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleRevenueUpload(e.target.files[0], 'PATTA');
                        }}
                      />
                      <span>{pattaUploading ? 'Uploading...' : 'Upload Patta PDF →'}</span>
                    </label>
                  </div>
                </div>

                {/* Chitta Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Chitta / Adangal Extract</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {currentCase.currentDoc.chittaVerified ? 'Verified Clear' : 'Pending Check'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Classification: Ryotwari Dry Land
                  </div>
                  <div className="pt-1">
                    <label className="text-[10px] text-blue-600 hover:underline cursor-pointer font-bold block">
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf,image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleRevenueUpload(e.target.files[0], 'CHITTA');
                        }}
                      />
                      <span>{chittaUploading ? 'Uploading...' : 'Upload Chitta Extract →'}</span>
                    </label>
                  </div>
                </div>

                {/* FMB Sketch Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">FMB Survey Sketch</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {currentCase.currentDoc.fmbVerified ? 'Demarcated & Clear' : 'Pending Verification'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Traverse G-Line: 72.1 ft
                  </div>
                  <div className="pt-1">
                    <label className="text-[10px] text-blue-600 hover:underline cursor-pointer font-bold block">
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf,image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleRevenueUpload(e.target.files[0], 'FMB');
                        }}
                      />
                      <span>{fmbUploading ? 'Uploading...' : 'Upload FMB Sketch →'}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 5: MODULE 4D – ADVOCATE OPINION SIGN-OFF & CERTIFICATION              */}
          {/* ======================================================================= */}
          {activeTab === 'opinion' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
              
              {/* Official Bar Council Advocate Letterhead Card */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-950/40 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
                      Bar Council of Tamil Nadu & Puducherry
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Advocate A.K. Saravanan, B.E., LLB
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Advocate • Enrollment No: <strong className="text-slate-900 dark:text-white font-mono">MS/1245/2005</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Legal Chambers: 77, Lawyers Chamber, Combined Court Complex, Coimbatore - 641018
                    </p>
                  </div>

                  <div className="text-right sm:self-start">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 shadow-xs">
                      CERTIFIED TITLE OPINION ✓
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono mt-1">
                      Docket Ref: {currentCase.id}
                    </span>
                  </div>
                </div>

                {/* Opinion Verdict Banner */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-extrabold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Title Scrutiny Finding: Clear, Marketable & Unencumbered Title
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Root of title verified unbroken for 30+ years with complete revenue Patta mutation and nil encumbrances.
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shrink-0 self-start sm:self-auto shadow-xs">
                    Stage 6 Certified
                  </span>
                </div>

                {/* Findings List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                    Primary Scrutiny Observations & Title Trace:
                  </span>
                  <div className="space-y-1.5">
                    {currentCase.legalOpinion.keyFindings.map((finding, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                        <span>{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                    Conditions Precedent Prior to Registration:
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside">
                    {currentCase.legalOpinion.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>

                {/* Signature Block */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                      AK
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Advocate A.K. Saravanan (B.E., LLB)
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Digitally Sealed & Certified • Enrollment: MS/1245/2005
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Download / Print Certified Opinion</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ======================================================================= */}
        {/* RIGHT PANE (35% - 4 Cols): STICKY LEGAL ASSISTANT DESK                   */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
          
          {/* CARD 1: SOP MILESTONE READINESS METER */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Readiness Checklist</span>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                {isGate4Unlocked ? '4 of 5 Ready' : '2 of 5 Ready'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Enquiry & Discovery Call</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700">Stage 1-2 ✓</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-2">
                  {welcomeLetter?.sent_status === 'sent' && currentCase.advancePaid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>Welcome Letter & 80% Advance</span>
                </span>
                <span className={`text-[10px] font-bold ${
                  welcomeLetter?.sent_status === 'sent' && currentCase.advancePaid ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {welcomeLetter?.sent_status === 'sent' && currentCase.advancePaid ? 'Gate 4 Clear ✓' : 'Gate 4 Pending'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-2">
                  {currentCase.ecRecords.length > 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>30-Year EC Indexing</span>
                </span>
                <span className="text-[10px] font-bold text-slate-600">
                  {currentCase.ecRecords.length} records
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-2">
                  {currentCase.parentDocs.length > 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Parent Title Devolution</span>
                </span>
                <span className="text-[10px] font-bold text-slate-600">
                  {currentCase.parentDocs.length} deeds
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-2">
                  {currentCase.legalOpinion.advocateSignoff ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                  )}
                  <span>Advocate Digital Seal</span>
                </span>
                <span className="text-[10px] font-bold text-purple-700">MS/1245</span>
              </div>
            </div>
          </div>

          {/* CARD 2: STICKY EVIDENCE VAULT INSPECTOR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileBox className="w-3.5 h-3.5 text-blue-600" />
                <span>Evidence Vault Inspector</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500">Cloudflare R2</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[170px]">
                    Vendor_Sale_Deed_2012.pdf
                  </div>
                  <div className="text-[10px] text-slate-400">Registered Sale Deed • 2.4 MB</div>
                </div>
                <button
                  onClick={() => alert('Opening evidentiary document preview in secure sandbox.')}
                  className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                  title="Inspect document"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[170px]">
                    EC_1994_2026_Certified.pdf
                  </div>
                  <div className="text-[10px] text-slate-400">Form 15 Search • 1.8 MB</div>
                </div>
                <button
                  onClick={() => alert('Opening evidentiary document preview in secure sandbox.')}
                  className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                  title="Inspect document"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[170px]">
                    Patta_Passbook_eServices.pdf
                  </div>
                  <div className="text-[10px] text-slate-400">TNeGA Revenue Passbook • 650 KB</div>
                </div>
                <button
                  onClick={() => alert('Opening evidentiary document preview in secure sandbox.')}
                  className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                  title="Inspect document"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* CARD 3: QUICK DOCUMENT DROPZONE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Quick Document Dropzone
            </span>
            <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer block transition bg-slate-50/50 dark:bg-slate-950/30">
              <Upload className="w-5 h-5 text-slate-400 mx-auto" />
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                Drop PDF / Scan files here
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Automatically stored in Cloudflare R2 Vault
              </div>
              <input
                type="file"
                className="hidden"
                accept="application/pdf,image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setToastNotice({
                      type: 'success',
                      message: `✓ Uploaded ${e.target.files[0].name} to case evidentiary vault!`,
                    });
                  }
                }}
              />
            </label>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD EC RECORD (DYNAMIC METADATA DRIVEN)                          */}
      {/* ========================================================================= */}
      {showEcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{ecMetadata.displayName}</h3>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">Dynamic Schema v{ecMetadata.version || 1} • Cloudflare D1</span>
                </div>
              </div>
              <button
                onClick={() => { setShowEcModal(false); setModalError(null); }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <DynamicFormRenderer
              schema={ecMetadata}
              initialValues={ecInitialValues}
              onSubmit={handleSaveEcRecordDynamic}
              onCancel={() => setShowEcModal(false)}
              isSubmitting={submitting}
              submitButtonText="Save EC Record to Database"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD PARENT DEED (DYNAMIC METADATA DRIVEN)                        */}
      {/* ========================================================================= */}
      {showParentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{parentMetadata.displayName}</h3>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">Dynamic Schema v{parentMetadata.version || 1} • Cloudflare D1</span>
                </div>
              </div>
              <button
                onClick={() => { setShowParentModal(false); setModalError(null); }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <DynamicFormRenderer
              schema={parentMetadata}
              initialValues={parentInitialValues}
              onSubmit={handleSaveParentDocDynamic}
              onCancel={() => setShowParentModal(false)}
              isSubmitting={submitting}
              submitButtonText="Save Parent Deed to Title Chain"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GOVERNMENT E-SERVICES AUTO-FETCH (PATTA / FMB)                   */}
      {/* ========================================================================= */}
      {showGovRevenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Fetch {govRevenueType === 'PATTA' ? 'e-Patta Extract' : 'FMB Sketch'}
                  </h3>
                  <span className="text-[10px] text-blue-600 font-mono">Tamil Nadu e-Services (eservices.tn.gov.in)</span>
                </div>
              </div>
              <button
                onClick={() => setShowGovRevenueModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">District</label>
                <input
                  type="text"
                  value={govRevenueForm.district}
                  onChange={(e) => setGovRevenueForm({ ...govRevenueForm, district: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Taluk</label>
                <input
                  type="text"
                  value={govRevenueForm.taluk}
                  onChange={(e) => setGovRevenueForm({ ...govRevenueForm, taluk: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Survey Number</label>
                <input
                  type="text"
                  value={govRevenueForm.surveyNumber}
                  onChange={(e) => setGovRevenueForm({ ...govRevenueForm, surveyNumber: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Subdivision</label>
                <input
                  type="text"
                  value={govRevenueForm.subdivision}
                  onChange={(e) => setGovRevenueForm({ ...govRevenueForm, subdivision: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSimulateGovRevenueFetch}
              disabled={govFetching}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {govFetching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{govFetching ? 'Querying Government Land Registry...' : 'Query e-Services Portal'}</span>
            </button>

            {govFetchedData && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Record Verified on Government e-Services</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div>Patta / Sketch: <strong>{govFetchedData.pattaNumber || govFetchedData.fmbNumber}</strong></div>
                  <div>Holder: <strong>{govFetchedData.pattaHolder || currentCase.clientName}</strong></div>
                  <div>Status: Clean & Verified</div>
                </div>
                <button
                  type="button"
                  onClick={handleApproveGovRevenueToDatabase}
                  disabled={submitting}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  Confirm & Save to Case Docket
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
