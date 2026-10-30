import { enquiryRepository, EnquiryFilterParams, EnquiryRecord } from '@/lib/repositories/enquiryRepository';
import { executeQueryOne } from '@/lib/db';

export interface RegisterEnquiryInput {
  client_name: string;
  client_phone: string;
  client_email?: string | null;
  service_package?: string;
  district?: string;
  property_address?: string;
  survey_number?: string;
  client_notes?: string;
  source?: string;
}

export interface PromoteEnquiryInput {
  enquiryId: string;
  customCaseId?: string;
  totalFee?: number;
  advanceAmount?: number;
  balanceAmount?: number;
  handlerName?: string;
}

export class EnquiryService {
  /**
   * Generates a unique, human-friendly sequential Enquiry ID for the calendar year.
   * Format: ENQ-YYYY-XXX (e.g. ENQ-2026-104)
   */
  private async generateEnquiryId(year: number): Promise<string> {
    const pattern = `ENQ-${year}-%`;
    const latest = await executeQueryOne<{ id: string }>(
      `SELECT id FROM enquiries WHERE id LIKE ? ORDER BY id DESC LIMIT 1;`,
      [pattern]
    );

    if (!latest) {
      return `ENQ-${year}-001`;
    }

    const parts = latest.id.split('-');
    if (parts.length === 3) {
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        return `ENQ-${year}-${(lastNum + 1).toString().padStart(3, '0')}`;
      }
    }

    const rand = Math.floor(100 + Math.random() * 900);
    return `ENQ-${year}-${rand}`;
  }

  /**
   * Generates a unique sequential Case ID for the calendar year.
   * Format: AK-YYYY-XXX (e.g. AK-2026-005)
   */
  private async generateCaseId(year: number): Promise<string> {
    const pattern = `AK-${year}-%`;
    const latest = await executeQueryOne<{ id: string }>(
      `SELECT id FROM cases WHERE id LIKE ? ORDER BY id DESC LIMIT 1;`,
      [pattern]
    );

    if (!latest) {
      return `AK-${year}-001`;
    }

    const parts = latest.id.split('-');
    if (parts.length === 3) {
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        return `AK-${year}-${(lastNum + 1).toString().padStart(3, '0')}`;
      }
    }

    const rand = Math.floor(100 + Math.random() * 900);
    return `AK-${year}-${rand}`;
  }

  /**
   * Registers an incoming public enquiry into the Tier 1 intake buffer.
   */
  async registerInbound(input: RegisterEnquiryInput): Promise<{
    id: string;
    isDuplicate: boolean;
    duplicateOf?: string;
  }> {
    if (!input.client_name || input.client_name.trim().length < 2) {
      throw new Error('Client name is required (minimum 2 characters).');
    }

    const rawPhone = input.client_phone || '';
    const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 10) {
      throw new Error('A valid 10-digit mobile phone number is required.');
    }

    const district = input.district?.trim() || 'Coimbatore';

    // Check for recent duplicate submission in last 24 hours
    const duplicate = await enquiryRepository.findRecentDuplicate(cleanDigits, district);
    if (duplicate) {
      return {
        id: duplicate.id,
        isDuplicate: true,
        duplicateOf: duplicate.id,
      };
    }

    const currentYear = new Date().getFullYear();
    const enquiryId = await this.generateEnquiryId(currentYear);

    await enquiryRepository.create({
      id: enquiryId,
      client_name: input.client_name.trim(),
      client_phone: input.client_phone.trim(),
      client_email: input.client_email?.trim() || null,
      service_package: input.service_package || 'Legal Opinion (Standard)',
      district,
      property_address: input.property_address?.trim() || '',
      survey_number: input.survey_number?.trim() || '',
      client_notes: input.client_notes?.trim() || '',
      source: input.source || 'website',
    });

    return {
      id: enquiryId,
      isDuplicate: false,
    };
  }

  /**
   * Retrieves enquiries and computes aggregate triage metrics.
   */
  async getTriageDeskData(filters: EnquiryFilterParams = {}): Promise<{
    enquiries: EnquiryRecord[];
    metrics: {
      total: number;
      newCount: number;
      contactedCount: number;
      acceptedCount: number;
      rejectedCount: number;
      conversionRate: number;
    };
  }> {
    const list = await enquiryRepository.findMany(filters);
    const all = await enquiryRepository.findMany(); // All records for metrics

    const newCount = all.filter((e) => e.status === 'new').length;
    const contactedCount = all.filter((e) => e.status === 'contacted').length;
    const acceptedCount = all.filter((e) => e.status === 'accepted').length;
    const rejectedCount = all.filter((e) => e.status === 'rejected' || e.status === 'spam').length;
    const conversionRate = all.length > 0 ? Math.round((acceptedCount / all.length) * 100) : 0;

    return {
      enquiries: list,
      metrics: {
        total: all.length,
        newCount,
        contactedCount,
        acceptedCount,
        rejectedCount,
        conversionRate,
      },
    };
  }

  /**
   * Retrieves a single enquiry by ID.
   */
  async getEnquiryById(id: string): Promise<EnquiryRecord | null> {
    return await enquiryRepository.findById(id);
  }

  /**
   * Updates an enquiry's status or rejection reason.
   */
  async updateStatus(
    id: string,
    status: 'new' | 'contacted' | 'accepted' | 'rejected' | 'spam',
    rejectionReason?: string,
    handlerId?: string
  ): Promise<boolean> {
    const existing = await enquiryRepository.findById(id);
    if (!existing) {
      throw new Error(`Enquiry ${id} was not found.`);
    }

    if (existing.status === 'accepted' && status !== 'accepted') {
      throw new Error(`Enquiry ${id} has already been promoted to Case ${existing.converted_case_id} and cannot be modified.`);
    }

    return await enquiryRepository.updateStatus(id, status, rejectionReason, handlerId);
  }

  /**
   * Promotes an enquiry into an active Tier 2 legal docket at Stage 1.
   * Strictly enforces atomic multi-table execution.
   */
  async promoteToCase(input: PromoteEnquiryInput): Promise<{
    caseId: string;
    enquiryId: string;
    totalFee: number;
    advanceAmount: number;
    balanceAmount: number;
    trackingUrl: string;
  }> {
    const enquiry = await enquiryRepository.findById(input.enquiryId);
    if (!enquiry) {
      throw new Error(`Enquiry ${input.enquiryId} does not exist in staging.`);
    }

    if (enquiry.status === 'accepted' && enquiry.converted_case_id) {
      throw new Error(`Enquiry ${input.enquiryId} was already accepted and promoted to Case ${enquiry.converted_case_id}.`);
    }

    // Determine fees: default to standard statutory rates if not provided
    let totalFee = input.totalFee;
    if (!totalFee || totalFee <= 0) {
      if (enquiry.service_package?.includes('Comprehensive')) {
        totalFee = 12500;
      } else if (enquiry.service_package?.includes('Express')) {
        totalFee = 9500;
      } else {
        totalFee = 6500;
      }
    }

    const advanceAmount = input.advanceAmount ?? Math.round(totalFee * 0.8);
    const balanceAmount = input.balanceAmount ?? totalFee - advanceAmount;

    // Generate Case ID
    const currentYear = new Date().getFullYear();
    const caseId = input.customCaseId || (await this.generateCaseId(currentYear));
    const handler = input.handlerName || 'Advocate A.K. Saravanan Legal Desk';

    const success = await enquiryRepository.promoteToCaseAtomic({
      enquiryId: input.enquiryId,
      caseId,
      clientName: enquiry.client_name,
      clientPhone: enquiry.client_phone,
      clientEmail: enquiry.client_email,
      servicePackage: enquiry.service_package,
      district: enquiry.district,
      propertyAddress: enquiry.property_address || undefined,
      surveyNumber: enquiry.survey_number || undefined,
      totalFee,
      advanceAmount,
      balanceAmount,
      handlerName: handler,
    });

    if (!success) {
      throw new Error('Atomic transaction failed while converting enquiry to legal case.');
    }

    return {
      caseId,
      enquiryId: input.enquiryId,
      totalFee,
      advanceAmount,
      balanceAmount,
      trackingUrl: `/track/${caseId}`,
    };
  }
}

export const enquiryService = new EnquiryService();
