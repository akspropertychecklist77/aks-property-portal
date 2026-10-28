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
}

export interface CurrentDocument {
  id: string;
  pattaNumber: string;
  pattaType: 'Individual' | 'Joint' | 'Town Survey';
  pattaHolder: string;
  fmbVerified: boolean;
  tslrVerified: boolean;
  revenueStatus: 'Clear' | 'Mismatch' | 'Under Revenue Query';
  notes: string;
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
    category: 'Deed' | 'Patta' | 'EC' | 'ID Proof' | 'Other';
    uploadedAt: string;
    fileSize: string;
  }[];
}

