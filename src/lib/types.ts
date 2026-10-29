export type ProcessStage = 
  | '1_ENQUIRY'
  | '2_CALL'
  | '3_WELCOME_ADVANCE'
  | '4_JOB_CARD'
  | '5_PROVISIONAL_VERIFICATION'
  | '6_FINAL_REPORT'
  | '7_LOW_RES_PREVIEW'
  | '8_DELIVERED';

export interface StageInfo {
  id: ProcessStage;
  stepNumber: number;
  title: string;
  shortName: string;
  description: string;
  clientVisibleTitle: string;
  clientVisibleDesc: string;
  sopUrl?: string;
}

export interface ECRecord {
  id: string;
  period: string; // e.g. "1994 - 2024 (30 Years)"
  sro: string; // e.g. "Gandhipuram SRO"
  surveyNumber: string;
  docNumber: string;
  parties: string;
  natureOfDeed: string;
  verified: boolean;
  docFileName?: string;
  docFileUrl?: string;
  sourceType?: 'MANUAL_UPLOAD' | 'TNREGINET_AUTO_FETCH';
  verificationStatus?: 'VERIFIED' | 'PENDING_VALIDATION' | 'FLAGGED';
}

export interface ParentDocument {
  id: string;
  docNumber: string;
  year: string;
  deedType: string; // Sale Deed, Partition Deed, Settlement
  executants: string;
  claimants: string;
  extent: string;
  scheduleMatches: boolean;
  notes: string;
  docFileName?: string;
  docFileUrl?: string;
  sourceType?: 'MANUAL_UPLOAD' | 'TNREGINET_AUTO_FETCH';
}

export interface CurrentDocument {
  id: string;
  pattaNumber: string;
  pattaType: 'Individual' | 'Joint' | 'Town Survey';
  pattaHolder: string;
  chittaVerified?: boolean;
  fmbVerified: boolean;
  tslrVerified: boolean;
  revenueStatus: 'Clear' | 'Mismatch' | 'Under Revenue Query';
  notes: string;
  pattaFileUrl?: string;
  pattaFileName?: string;
  chittaFileUrl?: string;
  chittaFileName?: string;
  fmbFileUrl?: string;
  fmbFileName?: string;
  sourceType?: 'MANUAL_UPLOAD' | 'ESERVICES_TN_AUTO_FETCH';
  subDivision?: string;
  villageTaluk?: string;
}

export interface LegalOpinionSummary {
  marketableTitle: 'Clear' | 'Conditional' | 'Defective' | 'Pending Verification';
  encumbranceStatus: 'Nil Encumbrance' | 'Mortgaged' | 'Litigation / Court Order';
  revenueCompliance: 'Full Patta Available' | 'Subdivision Required' | 'Patta Transfer Pending';
  keyFindings: string[];
  recommendations: string[];
  advocateSignoff: boolean;
  advocateName?: string;
  signoffDate?: string;
}

export interface ClientCase {
  id: string; // e.g. "AK-2026-001"
  sourceEnquiryId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceRequired: string;
  district: string;
  taluk?: string;
  village?: string;
  surveyNumber: string;
  totalAgreedCost: number;
  advanceAmount: number; // 80%
  advancePaid: boolean;
  advancePaymentRef?: string;
  balanceAmount: number; // 20%
  balancePaid: boolean;
  balancePaymentRef?: string;
  reviewCompleted?: boolean;
  courierAwb?: string;
  
  currentStage: ProcessStage;
  createdAt: string;
  updatedAt: string;
  
  // Job Card Details
  ecRecords: ECRecord[];
  parentDocs: ParentDocument[];
  currentDoc: CurrentDocument;
  legalOpinion: LegalOpinionSummary;
  
  // Uploaded docs by client
  uploadedFiles: {
    id: string;
    fileName: string;
    category: 'Deed' | 'Patta' | 'Chitta' | 'FMB' | 'EC' | 'ID Proof' | 'Other';
    uploadedAt: string;
    fileSize: string;
    mimeType?: string;
  }[];
}

export type EnquiryStatus = 'new' | 'contacted' | 'accepted' | 'rejected' | 'spam';

export interface ClientEnquiry {
  id: string; // e.g. "ENQ-2026-101"
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  servicePackage: string;
  district: string;
  propertyAddress?: string;
  surveyNumber?: string;
  clientNotes?: string;
  source: 'website' | 'property_checklist_app' | 'whatsapp' | string;
  status: EnquiryStatus;
  assignedHandlerId?: string;
  convertedCaseId?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}


