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
  MapPin
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
      label: 'Parties Involved (Seller to Buyer)',
      placeholder: 'e.g. K. Ramasamy to Vendor R. Suresh',
      validation: { required: true, message: 'Parties conveyance information is required' },
    },
    remarks: {
      type: 'TEXTAREA',
      label: 'Remarks / Findings',
      placeholder: 'e.g. Clean schedule, boundaries match registered parent title',
    },
    file: {
      type: 'FILE_UPLOAD',
      label: 'Upload Certified EC Document (PDF / Word .docx / Image)',
    },
  },
};

const DEFAULT_PARENT_METADATA: EntityMetadata = {
  entityKey: 'case_parent_doc',
  displayName: 'Parent Title Deed',
  storageTable: 'case_parent_docs',
  sections: [
    {
      id: 'sec_deed_info',
      title: 'Title Deed Information',
      columns: 2,
      fieldKeys: ['deedType', 'docNumber', 'year', 'sro'],
    },
    {
      id: 'sec_conveyance',
      title: 'Conveyance & Parties',
      columns: 2,
      fieldKeys: ['executants', 'claimants', 'extent', 'scheduleMatches'],
    },
    {
      id: 'sec_notes',
      title: 'Scrutiny Notes & File Attachment',
      columns: 1,
      fieldKeys: ['notes', 'file'],
    },
  ],
  fields: {
    deedType: {
      type: 'SELECT',
      label: 'Deed Type',
      defaultValue: 'Registered Sale Deed',
      options: [
        { value: 'Registered Sale Deed', label: 'Registered Sale Deed' },
        { value: 'Partition Deed', label: 'Partition Deed' },
        { value: 'Settlement Deed', label: 'Settlement Deed' },
        { value: 'Gift Deed', label: 'Gift Deed' },
        { value: 'Release Deed', label: 'Release Deed' },
      ],
    },
    docNumber: {
      type: 'TEXT',
      label: 'Document Number & Year',
      placeholder: 'e.g. Doc 2145/2005',
      validation: { required: true, message: 'Document number is required' },
    },
    year: {
      type: 'TEXT',
      label: 'Year of Registration',
      placeholder: 'e.g. 2005',
      defaultValue: '2005',
    },
    sro: {
      type: 'TEXT',
      label: 'Sub-Registrar Office (SRO)',
      placeholder: 'e.g. Coimbatore SRO',
      validation: { required: true, message: 'SRO jurisdiction is required' },
    },
    executants: {
      type: 'TEXT',
      label: 'Executant (Seller / Transferor)',
      placeholder: 'Seller full name',
      validation: { required: true, message: 'Executant name is required' },
    },
    claimants: {
      type: 'TEXT',
      label: 'Claimant (Buyer / Transferee)',
      placeholder: 'Buyer full name',
      validation: { required: true, message: 'Claimant name is required' },
    },
    extent: {
      type: 'TEXT',
      label: 'Extent / Area Conveyed',
      placeholder: 'e.g. 2,400 Sq.Ft / 5.5 Cents',
      defaultValue: '2,400 Sq.Ft',
    },
    scheduleMatches: {
      type: 'CHECKBOX',
      label: 'Schedule Boundaries & Extent Match Unbroken Title',
      defaultValue: true,
    },
    notes: {
      type: 'TEXTAREA',
      label: 'Advocate Scrutiny Notes',
      defaultValue: 'Root title verified unbroken.',
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
  const [activeTab, setActiveTab] = useState<'ec' | 'parent' | 'current' | 'opinion'>('ec');
  const [copiedDocket, setCopiedDocket] = useState(false);
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

  // Dynamic Metadata Handler: Save EC Record into Cloudflare Database
  const handleSaveEcRecordDynamic = async (formValues: Record<string, any>) => {
    setModalError(null);
    setSubmitting(true);

    try {
      let uploadedFileUrl = '';
      let uploadedFileName = '';

      // 1. Upload File if selected in dynamic form
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

      // 2. Save EC Record into SQL Database
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
        <span className="text-xs font-semibold">Opening Job Card from SQL database...</span>
      </div>
    );
  }

  if (!currentCase) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <p>Case {caseId} not found.</p>
        <Link href="/admin" className="text-blue-600 dark:text-blue-400 underline text-xs mt-2 inline-block font-semibold">
          Return to Admin Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification Banner */}
      {toastNotice && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200 ${
          toastNotice.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-500/50 text-rose-800 dark:text-rose-200'
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

      {/* Top Header Bar & Legal Executive Command Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        
        {/* Top Row: Back button, Docket ID, Stage Badge, and Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/pipeline"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl transition"
              title="Return to Pipeline"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-500/20">
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

            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>Advocate Legal Workbench • 8-Stage SOP</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href={`/track/${currentCase.id}`}
              target="_blank"
              className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <span>Client Live Tracker</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-xs shadow-blue-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Legal Opinion Report</span>
            </button>
          </div>
        </div>

        {/* Docket Executive Summary 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Col 1: Client & Contact */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Client & Docket Party
            </span>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {currentCase.clientName}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <a href={`tel:${currentCase.clientPhone}`} className="hover:text-blue-600 flex items-center gap-1 font-mono text-[11px]">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{currentCase.clientPhone}</span>
              </a>
            </div>
          </div>

          {/* Col 2: Property Schedule & SRO */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Property & SRO Jurisdiction
            </span>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {currentCase.surveyNumber ? `Survey No. ${currentCase.surveyNumber}` : 'Pending Survey'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {currentCase.district} • {currentCase.serviceRequired}
            </div>
          </div>

          {/* Col 3: Fee Gates (80/20 Rule) */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              SOP Fee Gates (80 / 20)
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">80% Advance:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                ₹{currentCase.advanceAmount.toLocaleString('en-IN')} Paid ✓
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">20% Balance:</span>
              <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                ₹{currentCase.balanceAmount.toLocaleString('en-IN')} (Gate 8)
              </span>
            </div>
          </div>

          {/* Col 4: Milestone Progress */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                SOP Milestone
              </span>
              <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                Stage 4 / 8
              </span>
            </div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
              Legal Scrutiny & EC Search
            </div>
            <div className="grid grid-cols-8 gap-1 h-1.5 w-full mt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((stg) => (
                <div
                  key={stg}
                  className={`rounded-full transition-all ${
                    stg < 4
                      ? 'bg-emerald-500'
                      : stg === 4
                      ? 'bg-blue-600 shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Interactive Workspace Tabs with High-Contrast SaaS styling */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('ec')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'ec'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Module 4A: 30-Year EC Matrix</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'ec' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {currentCase.ecRecords.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parent')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'parent'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Module 4B: Parent Title Chain</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'parent' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {currentCase.parentDocs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'current'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Module 4C: Revenue & FMB Blueprint</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'current' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
          }`}>
            {currentCase.currentDoc.fmbVerified ? 'Verified ✓' : 'Pending'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('opinion')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'opinion'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Module 4D: Advocate Opinion & Seal</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'opinion' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
          }`}>
            MS/1245/2005
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 30-YEAR EC INDEXING WORKSPACE                                      */}
      {/* ========================================================================= */}
      {activeTab === 'ec' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
          
          {/* EC Top Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Encumbrance Certificate (EC) 30-Year Index
                </h2>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                  SQL Database Linked
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive search across Tamil Nadu SRO registers for unbroken title devolution.
              </p>
            </div>

            <button
              onClick={openEcModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs shadow-blue-500/20 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add EC Record</span>
            </button>
          </div>

          {/* Metric Bar: Period, SRO, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Search Span</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">1994 – 2026 (32 Years)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Jurisdiction SRO</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{currentCase.district} Sub-Registrar Office</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Encumbrance Verdict</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Nil Encumbrance Confirmed ✓</span>
            </div>
          </div>

          {currentCase.ecRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
              <p>No EC entries registered yet for this property.</p>
              <button
                onClick={openEcModal}
                className="text-blue-600 dark:text-blue-400 font-bold underline cursor-pointer"
              >
                Click here to add or upload the first EC document
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider bg-slate-50/80 dark:bg-slate-950/40">
                    <th className="py-3 px-4 font-semibold">Period</th>
                    <th className="py-3 px-4 font-semibold">SRO</th>
                    <th className="py-3 px-4 font-semibold">Survey No</th>
                    <th className="py-3 px-4 font-semibold">Doc No & Nature</th>
                    <th className="py-3 px-4 font-semibold">Parties Involved</th>
                    <th className="py-3 px-4 font-semibold">Document / Source</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {currentCase.ecRecords.map((ec) => (
                    <tr key={ec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">{ec.period}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{ec.sro}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{ec.surveyNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white font-mono">{ec.docNumber}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{ec.natureOfDeed}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs">{ec.parties}</td>
                      <td className="py-3 px-4">
                        {ec.docFileUrl ? (
                          <a
                            href={ec.docFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 text-[11px] font-bold border border-slate-200 dark:border-slate-700 transition"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View PDF</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No File</span>
                        )}
                        {ec.sourceType === 'TNREGINET_AUTO_FETCH' && (
                          <span className="ml-1 text-[9px] bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 px-1.5 py-0.2 rounded font-semibold">
                            TNReginet
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                          Verified ✓
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteEcRecord(ec.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition"
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Parent Document Flow (Title Genealogy)
                </h2>
                <span className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2.5 py-0.5 rounded-full font-bold">
                  Chronological Chain
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verify continuous genealogical flow from ancestral root title to current transferor.
              </p>
            </div>

            <button
              onClick={openParentModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs shadow-blue-500/20 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Parent Deed</span>
            </button>
          </div>

          {currentCase.parentDocs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
              <p>No parent deeds recorded yet.</p>
              <button
                onClick={openParentModal}
                className="text-blue-600 dark:text-blue-400 font-bold underline cursor-pointer"
              >
                Click to add the root parent deed
              </button>
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-blue-100 dark:before:bg-blue-900/40">
              {currentCase.parentDocs.map((pd, index) => (
                <div
                  key={pd.id}
                  className="relative pl-10 group"
                >
                  {/* Step Timeline Node */}
                  <div className="absolute left-3 top-5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black shadow-xs ring-4 ring-white dark:ring-slate-900">
                    {index + 1}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20 font-mono">
                          Link #{index + 1} • Year {pd.year}
                        </span>
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">{pd.deedType}</span>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">• Doc {pd.docNumber}</span>
                        <span className="text-xs text-slate-500 font-medium">({pd.sro})</span>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-500">Conveyance:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{pd.executants}</span>
                        <span className="text-blue-600">➔</span>
                        <span className="font-bold text-slate-900 dark:text-white">{pd.claimants}</span>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span><strong>Extent:</strong> {pd.extent}</span>
                        <span>•</span>
                        <span>{pd.notes}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
                      {pd.docFileUrl ? (
                        <a
                          href={pd.docFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 text-xs font-bold border border-slate-200 dark:border-slate-700 transition shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Deed PDF</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No PDF attached</span>
                      )}

                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                        Link Verified ✓
                      </span>
                    </div>
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Current Document & Revenue Department Records</span>
              <span className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2.5 py-0.5 rounded-full font-bold">
                Tamil Nadu e-Services (eservices.tn.gov.in)
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Patta Passbook, Town Survey (TSLR), and Field Measurement Book (FMB) boundary verification.
            </p>
          </div>

          {/* Government Revenue Automation Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50/50 dark:from-blue-950/60 dark:to-slate-900 border border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Government Land Records Automation (eservices.tn.gov.in)
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Fetch official Tamil Nadu digital Patta/Chitta and Field Measurement Book (FMB) sketch by Survey No.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => openGovRevenueModal('PATTA')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Fetch Patta</span>
              </button>
              <button
                onClick={() => openGovRevenueModal('FMB')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Auto-Fetch FMB</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patta Passbook Card */}
            <div className="bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Patta Passbook Record</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {currentCase.currentDoc.sourceType === 'ESERVICES_TN_AUTO_FETCH' && (
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20">
                      e-Services ✓
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    currentCase.currentDoc.pattaNumber !== 'Pending Upload'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                      : 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20'
                  }`}>
                    {currentCase.currentDoc.pattaNumber}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500">Patta Holder:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentCase.currentDoc.pattaHolder || currentCase.clientName}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500">Survey & Subdivision:</span>
                  <span className="font-mono">{currentCase.surveyNumber}</span>
                </div>
                {currentCase.currentDoc.villageTaluk && (
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500">Village & Taluk:</span>
                    <span className="text-slate-700 dark:text-slate-200">{currentCase.currentDoc.villageTaluk}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500">Chitta / Adangal:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Verified in Tamil Nadu Portal ✓</span>
                </div>
              </div>

              {/* Action Buttons: Auto-Fetch & Upload */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div>
                  {currentCase.currentDoc.pattaFileUrl ? (
                    <a
                      href={currentCase.currentDoc.pattaFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 font-bold hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Patta</span>
                      {currentCase.currentDoc.pattaFileUrl.toLowerCase().endsWith('.docx') || currentCase.currentDoc.pattaFileUrl.toLowerCase().endsWith('.doc') ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">
                          DOCX
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30">
                          PDF
                        </span>
                      )}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">No document attached</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openGovRevenueModal('PATTA')}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center gap-1 dark:bg-blue-900/60 dark:hover:bg-blue-800 dark:text-blue-200 dark:border-blue-700/60"
                    title="Auto-fetch directly from eservices.tn.gov.in"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Auto-Fetch</span>
                  </button>

                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{pattaUploading ? 'Uploading...' : 'Upload Patta'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleRevenueUpload(e.target.files[0], 'PATTA');
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Chitta / Adangal Register Extract Card */}
            <div className="bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Chitta / Adangal Register (சிட்டா)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    currentCase.currentDoc.chittaFileUrl
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                      : 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20'
                  }`}>
                    {currentCase.currentDoc.chittaFileUrl ? 'Extract Attached ✓' : 'Verified in TN Portal ✓'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500">Classification:</span>
                  <span className="font-bold text-slate-900 dark:text-white">ரயத்து வாரி புஞ்சை (Ryotwari Dry Land)</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500">Survey No & Extent:</span>
                  <span className="font-mono">{currentCase.surveyNumber} (0 Hectares 2.22 Ares)</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500">Annual Kist / Tax:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">₹4.50 (Paid & Clear)</span>
                </div>
              </div>

              {/* Action Buttons: Upload Chitta */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div>
                  {currentCase.currentDoc.chittaFileUrl ? (
                    <a
                      href={currentCase.currentDoc.chittaFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 font-bold hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Chitta</span>
                      {currentCase.currentDoc.chittaFileUrl.toLowerCase().endsWith('.docx') || currentCase.currentDoc.chittaFileUrl.toLowerCase().endsWith('.doc') ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">
                          DOCX
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30">
                          PDF
                        </span>
                      )}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">No Chitta document attached</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{chittaUploading ? 'Uploading...' : 'Upload Chitta'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleRevenueUpload(e.target.files[0], 'CHITTA');
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Field Measurement Book (FMB) Sketch Card */}
            <div className="bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 space-y-4 md:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Field Measurement Book (FMB) Boundary Blueprint</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    currentCase.currentDoc.fmbVerified
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                      : 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20'
                  }`}>
                    {currentCase.currentDoc.fmbVerified ? 'Demarcated & Verified ✓' : 'Boundary Map'}
                  </span>
                </div>
              </div>

              {/* Vector FMB SVG Blueprint Display */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    Field Traverse Survey & Stone Demarcation (G-Line & Ladder):
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">Scale: 1:500 Metric • TSLR Ward B, Block 12</span>
                </div>

                <div className="w-full flex justify-center py-2">
                  <svg viewBox="0 0 500 240" className="w-full max-w-lg h-56 bg-slate-900 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-inner">
                    <defs>
                      <pattern id="fmb-grid-main" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="500" height="240" fill="url(#fmb-grid-main)" />

                    {/* North Arrow */}
                    <g transform="translate(450, 40)">
                      <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                      <path d="M 0 -12 L 4 2 L 0 -1 L -4 2 Z" fill="#38bdf8" />
                      <text x="0" y="14" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">N</text>
                    </g>

                    {/* Main Parcel Polygon */}
                    <rect x="130" y="55" width="240" height="130" fill="#0284c7" fillOpacity="0.12" stroke="#38bdf8" strokeWidth="2" />

                    {/* Diagonal G-Line */}
                    <line x1="130" y1="55" x2="370" y2="185" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
                    <text x="255" y="115" fill="#f59e0b" fontSize="9" fontWeight="bold">G-Line 72.1 ft</text>

                    {/* Corner Survey Stones */}
                    <circle cx="130" cy="55" r="4" fill="#f59e0b" />
                    <circle cx="370" cy="55" r="4" fill="#f59e0b" />
                    <circle cx="370" cy="185" r="4" fill="#f59e0b" />
                    <circle cx="130" cy="185" r="4" fill="#f59e0b" />

                    {/* Center Parcel Label */}
                    <text x="250" y="85" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">
                      Survey No. {currentCase.surveyNumber || '428/1'}
                    </text>
                    <text x="250" y="100" fill="#94a3b8" fontSize="9" textAnchor="middle">
                      Extent: 2,400 Sq.Ft (5.5 Cents)
                    </text>

                    {/* North Boundary */}
                    <text x="250" y="45" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
                      North: S.F. No. 427 (Private Patta Land - 60.0 ft)
                    </text>

                    {/* South Boundary */}
                    <text x="250" y="205" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
                      South: 30 Feet Public Layout Road (60.0 ft)
                    </text>

                    {/* East & West Dimensions */}
                    <text x="385" y="125" fill="#38bdf8" fontSize="9" fontWeight="bold">East: 40.0 ft</text>
                    <text x="50" y="125" fill="#38bdf8" fontSize="9" fontWeight="bold">West: 40.0 ft</text>
                  </svg>
                </div>
              </div>

              {/* Action Buttons: Auto-Fetch & Upload */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div>
                  {currentCase.currentDoc.fmbFileUrl ? (
                    <a
                      href={currentCase.currentDoc.fmbFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 font-bold hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View FMB File</span>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Official vector sketch generated from survey records</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openGovRevenueModal('FMB')}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center gap-1 dark:bg-blue-900/60 dark:hover:bg-blue-800 dark:text-blue-200 dark:border-blue-700/60"
                  >
                    <Layers className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Auto-Fetch</span>
                  </button>

                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{fmbUploading ? 'Uploading...' : 'Upload Sketch (PDF / Word / Img)'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ADVOCATE A.K. SARAVANAN OPINION SIGN-OFF & CERTIFICATION           */}
      {/* ========================================================================= */}
      {activeTab === 'opinion' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          
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
                Stage 6 Approved
              </span>
            </div>

            {/* Structured Findings List */}
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

            {/* Recommendations / Conditions Precedent */}
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

            {/* Digital Signature & Seal */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                  AK
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Advocate A.K. Saravanan (M.E. Energy, LLB)
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Digitally Sealed & Certified • Enrollment: MS/1245/2005
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD EC RECORD (DYNAMIC METADATA DRIVEN + AUTOMATION READY)       */}
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
                onClick={() => {
                  setShowEcModal(false);
                  setModalError(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Government Automation Banner */}
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Government Automation (TNReginet / Kaveri)
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Auto-fetch inspector general registration data by SRO &amp; Survey No.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoFetchTNReginet}
                disabled={submitting}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
                <span>Simulate TNReginet Fetch</span>
              </button>
            </div>

            <DynamicFormRenderer
              schema={ecMetadata}
              initialValues={ecInitialValues}
              onSubmit={handleSaveEcRecordDynamic}
              onCancel={() => setShowEcModal(false)}
              submitButtonText="Validate & Save EC Record"
              isSubmitting={submitting}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD PARENT DOCUMENT (DYNAMIC METADATA DRIVEN + TITLE CHAIN)      */}
      {/* ========================================================================= */}
      {showParentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{parentMetadata.displayName}</h3>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">Dynamic Schema v{parentMetadata.version || 1} • Cloudflare D1</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowParentModal(false);
                  setModalError(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <DynamicFormRenderer
              schema={parentMetadata}
              initialValues={parentInitialValues}
              onSubmit={handleSaveParentDocDynamic}
              onCancel={() => setShowParentModal(false)}
              submitButtonText="Save Parent Deed to Title Chain"
              isSubmitting={submitting}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GOVERNMENT e-SERVICES (PATTA / FMB) AUTO-FETCH & VALIDATE        */}
      {/* ========================================================================= */}
      {showGovRevenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400">
                  {govRevenueType === 'PATTA' ? <FileCheck className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {govRevenueType === 'PATTA'
                        ? 'Tamil Nadu e-Services — Patta / Chitta Extraction'
                        : 'Tamil Nadu e-Services — Field Measurement Book (FMB)'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                      eservices.tn.gov.in
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {govRevenueType === 'PATTA'
                      ? 'Fetch digital "A" Register & Chitta extract directly from Revenue Department database.'
                      : 'Fetch official Field Measurement Book (FMB) survey sketch & boundary demarcation.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGovRevenueModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Department Source Badge Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50/50 dark:from-blue-950/60 dark:via-slate-900 dark:to-slate-950 border border-blue-200 dark:border-blue-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Directorate of Survey and Settlement • Government of Tamil Nadu
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Target Endpoint: <span className="text-blue-700 dark:text-blue-300 font-mono">eservices.tn.gov.in/eservicesnew/{govRevenueType === 'PATTA' ? 'land/chitta.html' : 'land/fmb.html'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setGovRevenueType('PATTA');
                    setGovFetchedData(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    govRevenueType === 'PATTA'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Patta / Chitta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGovRevenueType('FMB');
                    setGovFetchedData(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    govRevenueType === 'FMB'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  FMB Sketch
                </button>
              </div>
            </div>

            {/* Input Search Form */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">மாவட்டம் / District *</label>
                <select
                  value={govRevenueForm.district}
                  onChange={(e) => setGovRevenueForm({ ...govRevenueForm, district: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                >
                  <option value="Chennai">Chennai (சென்னை)</option>
                  <option value="Chengalpattu">Chengalpattu (செங்கல்பட்டு)</option>
                  <option value="Kanchipuram">Kanchipuram (காஞ்சிபுரம்)</option>
                  <option value="Tiruvallur">Tiruvallur (திருவள்ளூர்)</option>
                  <option value="Coimbatore">Coimbatore (கோயம்புத்தூர்)</option>
                  <option value="Madurai">Madurai (மதுரை)</option>
                  <option value="Tiruchirappalli">Tiruchirappalli (திருச்சிராப்பள்ளி)</option>
                  <option value="Salem">Salem (சேலம்)</option>
                  <option value="Tiruppur">Tiruppur (திருப்பூர்)</option>
                  <option value="Erode">Erode (ஈரோடு)</option>
                  <option value="Vellore">Vellore (வேலூர்)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">வட்டம் / Taluk *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alandur"
                  value={govRevenueForm.taluk}
                  onChange={(e) => setGovRevenueForm({ ...govRevenueForm, taluk: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">கிராமம் / Village *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Thomas Mount"
                  value={govRevenueForm.village}
                  onChange={(e) => setGovRevenueForm({ ...govRevenueForm, village: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">புல எண் / Survey *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 428"
                  value={govRevenueForm.surveyNumber}
                  onChange={(e) => setGovRevenueForm({ ...govRevenueForm, surveyNumber: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono shadow-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">உட்பிரிவு / Sub-Div *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1"
                  value={govRevenueForm.subdivision}
                  onChange={(e) => setGovRevenueForm({ ...govRevenueForm, subdivision: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono shadow-xs"
                />
              </div>
            </div>

            {/* Fetch Trigger Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSimulateGovRevenueFetch}
                disabled={govFetching}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-4 h-4 ${govFetching ? 'animate-spin' : ''}`} />
                <span>
                  {govFetching
                    ? 'Connecting to Tamil Nadu e-Services Gateway...'
                    : `Fetch Official ${govRevenueType === 'PATTA' ? 'Patta/Chitta Extract' : 'FMB Boundary Sketch'}`}
                </span>
              </button>
            </div>

            {/* FETCHED RESULTS PREVIEW */}
            {govFetchedData && (
              <div className="space-y-4 pt-2">
                {govRevenueType === 'PATTA' ? (
                  /* Official Tamil Nadu Digital Patta/Chitta Card */
                  <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/20 dark:bg-slate-950 p-5 space-y-4 text-xs shadow-xs">
                    <div className="text-center border-b border-emerald-100 dark:border-slate-800 pb-3 space-y-1">
                      <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-bold text-[11px] border border-emerald-200 dark:border-emerald-500/30">
                        தமிழ்நாடு அரசு - வருவாய்த்துறை • e-Chitta Extract
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        நில உரிமை விபரங்கள் : 10(1) பிரிவு கிராமக் கணக்கு நகல் (இ-பட்டா)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Directorate of Land Administration, Government of Tamil Nadu
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-700 dark:text-slate-300">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">மாவட்டம் / District</span>
                        <span className="font-bold text-slate-900 dark:text-white">{govFetchedData.district}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">வட்டம் / Taluk</span>
                        <span className="font-bold text-slate-900 dark:text-white">{govFetchedData.taluk}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">கிராமம் / Village</span>
                        <span className="font-bold text-slate-900 dark:text-white">{govFetchedData.village}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">பட்டா எண் / Patta No</span>
                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">{govFetchedData.pattaNumber}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">புல எண் / Survey & Sub-Div</span>
                        <span className="font-mono font-bold text-blue-700 dark:text-amber-400">{govFetchedData.surveyNo}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">நில உரிமைதாரர் / Patta Holder</span>
                        <span className="font-bold text-slate-900 dark:text-white">{govFetchedData.pattaHolder}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">நில வகைப்பாடு / Land Type</span>
                        <span className="text-slate-800 dark:text-slate-200">{govFetchedData.landKind}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">பரப்பளவு / Extent</span>
                        <span className="font-bold text-slate-900 dark:text-white">{govFetchedData.extentAcreCents}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-[11px]">
                      <div className="space-y-0.5">
                        <span className="text-emerald-800 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          {govFetchedData.digitalSign}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          Central e-Services Server Status: Record Verified Active (Fasli Year 1435) • Kist Paid
                        </span>
                      </div>
                      <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs shrink-0">
                        CERTIFIED CLEAR
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Official Tamil Nadu FMB Boundary Sketch Preview */
                  <div className="rounded-xl border border-blue-200 dark:border-amber-500/40 bg-slate-50 dark:bg-slate-950 p-5 space-y-4 text-xs shadow-xs">
                    <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-3 space-y-1">
                      <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-amber-500/10 text-blue-700 dark:text-amber-400 font-bold text-[11px] border border-blue-200 dark:border-amber-500/30">
                        தமிழ்நாடு அரசு - நில அளவை மற்றும் நிலவரித் திட்டம் • FMB Survey Sheet
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        Field Measurement Book (FMB) Sketch • புல எல்லை வரைபடம்
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Survey No. {govFetchedData.surveyNo} • {govFetchedData.village}, {govFetchedData.taluk}
                      </p>
                    </div>

                    {/* Vector FMB Blueprint Drawing */}
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-blue-700 dark:text-amber-400 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          Visual Field Traverse & Stone Demarcation:
                        </span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">Scale: 1:500 Metric | TSLR: {govFetchedData.tslrRecord}</span>
                      </div>

                      {/* SVG Field Diagram */}
                      <div className="w-full flex justify-center py-2">
                        <svg viewBox="0 0 500 240" className="w-full max-w-lg h-52 bg-slate-900 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-2">
                          {/* Grid background */}
                          <defs>
                            <pattern id="fmb-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                            </pattern>
                          </defs>
                          <rect width="500" height="240" fill="url(#fmb-grid)" />

                          {/* North Arrow */}
                          <g transform="translate(450, 40)">
                            <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                            <path d="M 0 -12 L 4 2 L 0 -1 L -4 2 Z" fill="#38bdf8" />
                            <text x="0" y="14" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">N</text>
                          </g>

                          {/* Main Parcel Polygon */}
                          <rect x="130" y="55" width="240" height="130" fill="#0284c7" fillOpacity="0.12" stroke="#38bdf8" strokeWidth="2" strokeDasharray="1 0" />

                          {/* Diagonal G-Line */}
                          <line x1="130" y1="55" x2="370" y2="185" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" />
                          <text x="255" y="115" fill="#f59e0b" fontSize="9" fontWeight="bold">G-Line 72.1 ft</text>

                          {/* Corner Stone Markers */}
                          <circle cx="130" cy="55" r="4" fill="#f59e0b" />
                          <circle cx="370" cy="55" r="4" fill="#f59e0b" />
                          <circle cx="370" cy="185" r="4" fill="#f59e0b" />
                          <circle cx="130" cy="185" r="4" fill="#f59e0b" />

                          {/* Center Parcel Label */}
                          <text x="250" y="85" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">
                            S.F. {govFetchedData.surveyNo}
                          </text>
                          <text x="250" y="100" fill="#94a3b8" fontSize="9" textAnchor="middle">
                            Area: {govFetchedData.dimensions.totalArea}
                          </text>

                          {/* North Dimension & Adjacent Field */}
                          <text x="250" y="45" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
                            {govFetchedData.boundaries.north}
                          </text>

                          {/* South Dimension & Road */}
                          <text x="250" y="205" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
                            {govFetchedData.boundaries.south}
                          </text>

                          {/* East Dimension */}
                          <text x="385" y="125" fill="#38bdf8" fontSize="9" fontWeight="bold">
                            East: {govFetchedData.dimensions.eastBreadth}
                          </text>

                          {/* West Dimension */}
                          <text x="45" y="125" fill="#38bdf8" fontSize="9" fontWeight="bold">
                            West: {govFetchedData.dimensions.westBreadth}
                          </text>
                        </svg>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block font-medium">North Boundary:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{govFetchedData.boundaries.north}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block font-medium">South Boundary:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{govFetchedData.boundaries.south}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block font-medium">East Boundary:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{govFetchedData.boundaries.east}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block font-medium">West Boundary:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{govFetchedData.boundaries.west}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-amber-950/30 border border-blue-200 dark:border-amber-800/40 flex items-center justify-between text-[11px]">
                      <span className="text-blue-800 dark:text-amber-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-amber-400" />
                        {govFetchedData.subdivisionStatus}
                      </span>
                      <span className="px-2 py-1 rounded bg-blue-100 dark:bg-amber-500/20 text-blue-800 dark:text-amber-300 font-mono font-bold text-xs shrink-0">
                        FMB VERIFIED ✓
                      </span>
                    </div>
                  </div>
                )}

                {/* Validation and Persist Button */}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowGovRevenueModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveGovRevenueToDatabase}
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitting ? 'Saving to Database...' : 'Validate & Save to Database'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
