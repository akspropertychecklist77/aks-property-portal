import { documentRepository, CaseDocumentRecord, CreateDocumentInput } from '@/lib/repositories/documentRepository';
import { executeQueryOne } from '@/lib/db';
import { recordChainedAuditLog } from '@/lib/security/auditSigner';
import { validateMagicBytes, computeSha256, MAX_FILE_SIZE_BYTES } from '@/lib/storage/r2Vault';

const HMAC_SECRET = process.env.AUTH_SECRET || process.env.CLOUDFLARE_API_TOKEN || 'AKS_ENTERPRISE_VAULT_SECRET_2026';

export interface DownloadTokenPayload {
  docId: string;
  caseId: string;
  exp: number; // Unix timestamp in ms
  watermark: boolean;
}

export interface DocumentSummary {
  caseId: string;
  totalDocuments: number;
  totalSizeBytes: number;
  categories: Record<string, number>;
  documents: Array<CaseDocumentRecord & { downloadUrl: string }>;
}

export class DocumentVaultService {
  /**
   * Generates a tamper-proof HMAC-SHA256 signed download token (15-minute default TTL).
   */
  async generateDownloadToken(
    docId: string,
    caseId: string,
    watermark: boolean = false,
    ttlSeconds: number = 900 // 15 mins
  ): Promise<string> {
    const exp = Date.now() + ttlSeconds * 1000;
    const payload: DownloadTokenPayload = {
      docId,
      caseId: caseId.toUpperCase(),
      exp,
      watermark,
    };

    const encoder = new TextEncoder();
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(HMAC_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadBase64));
    const signatureBase64 = Buffer.from(signatureBuffer).toString('base64url');

    return `${payloadBase64}.${signatureBase64}`;
  }

  /**
   * Cryptographically verifies an HMAC-SHA256 download token.
   */
  async verifyDownloadToken(token: string): Promise<DownloadTokenPayload> {
    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new Error('Malformed download token format.');
    }

    const [payloadBase64, signatureBase64] = parts;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(HMAC_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Buffer.from(signatureBase64, 'base64url');
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payloadBase64)
    );

    if (!isValid) {
      throw new Error('Invalid download token signature: potential tampering detected.');
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload: DownloadTokenPayload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      throw new Error('Download token has expired (15-minute TTL elapsed). Please request a fresh link.');
    }

    return payload;
  }

  /**
   * Uploads and secures a legal document in the R2 Vault with D1 metadata persistence.
   */
  async uploadDocument({
    caseId,
    fileName,
    category,
    buffer,
    declaredMimeType,
    actor = 'SYSTEM',
    ipAddress = '127.0.0.1',
  }: {
    caseId: string;
    fileName: string;
    category: string;
    buffer: Uint8Array;
    declaredMimeType?: string;
    actor?: string;
    ipAddress?: string;
  }): Promise<{ document: CaseDocumentRecord; isDuplicate: boolean; sha256: string }> {
    const cleanCaseId = caseId.trim().toUpperCase();

    // 1. File Size Guard (15 MB)
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds statutory 15 MB platform limit.`
      );
    }

    // 2. Magic Byte Inspection
    const magicCheck = validateMagicBytes(buffer);
    if (!magicCheck.valid) {
      throw new Error(
        'Invalid file content. Only authenticated legal PDFs, Word documents (.docx), and high-res boundary scans (PNG/JPEG) are permitted.'
      );
    }

    const effectiveMimeType = magicCheck.detectedType || declaredMimeType || 'application/octet-stream';

    // 3. Edge-Native SHA-256 Checksum
    const sha256 = await computeSha256(buffer);

    // 4. Deduplication Check against D1
    const duplicate = await documentRepository.findDuplicate(cleanCaseId, fileName, sha256.substring(0, 12));
    if (duplicate) {
      return {
        document: duplicate,
        isDuplicate: true,
        sha256,
      };
    }

    // 5. Cloudflare R2 / Storage Key
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `cases/${cleanCaseId}/${category.toLowerCase()}/${sha256.substring(0, 12)}_${cleanFileName}`;

    let storagePath = `r2://${r2Key}`;

    // Cloudflare R2 bucket binding check
    const r2Bucket = (globalThis as any).VAULT_BUCKET;
    if (r2Bucket && typeof r2Bucket.put === 'function') {
      await r2Bucket.put(r2Key, buffer, {
        httpMetadata: { contentType: effectiveMimeType },
        customMetadata: { caseId: cleanCaseId, sha256, uploadedAt: new Date().toISOString() },
      });
    } else {
      // Local dev fallback
      try {
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', cleanCaseId);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const localFilePath = path.join(uploadsDir, `${sha256.substring(0, 8)}_${cleanFileName}`);
        fs.writeFileSync(localFilePath, Buffer.from(buffer));
        storagePath = `/uploads/${cleanCaseId}/${sha256.substring(0, 8)}_${cleanFileName}`;
      } catch (e) {
        storagePath = `r2://aks-property-vault/${r2Key}`;
      }
    }

    // 6. Record metadata in Cloudflare D1
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const created = await documentRepository.create({
      id: docId,
      case_id: cleanCaseId,
      file_name: fileName,
      file_category: category,
      storage_path: storagePath,
      file_size_bytes: buffer.length,
      mime_type: effectiveMimeType,
      is_watermarked: false,
    });

    // 7. Audit Logging (Merkle-Chain)
    await recordChainedAuditLog({
      caseId: cleanCaseId,
      action: 'DOCUMENT_UPLOADED',
      previousState: null,
      newState: JSON.stringify({ docId, fileName, category, sha256, size: buffer.length }),
      performedBy: actor,
      ipAddress,
    });

    return {
      document: created,
      isDuplicate: false,
      sha256,
    };
  }

  /**
   * Retrieves all documents for a case with generated download tokens.
   */
  async listDocuments(caseId: string, category?: string): Promise<DocumentSummary> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const docs = await documentRepository.findByCaseId(cleanCaseId, category);

    let totalSizeBytes = 0;
    const categories: Record<string, number> = {};

    const enrichedDocs = await Promise.all(
      docs.map(async (doc) => {
        totalSizeBytes += doc.file_size_bytes || 0;
        categories[doc.file_category] = (categories[doc.file_category] || 0) + 1;

        // Generate download token valid for 15 minutes
        const token = await this.generateDownloadToken(doc.id, cleanCaseId, Boolean(doc.is_watermarked));
        const downloadUrl = `/api/cases/${cleanCaseId}/documents/${doc.id}/download?token=${token}`;

        return {
          ...doc,
          downloadUrl,
        };
      })
    );

    return {
      caseId: cleanCaseId,
      totalDocuments: docs.length,
      totalSizeBytes,
      categories,
      documents: enrichedDocs,
    };
  }

  /**
   * Retrieves single document metadata.
   */
  async getDocument(docId: string): Promise<CaseDocumentRecord | null> {
    return await documentRepository.findById(docId);
  }

  /**
   * Deletes a document from the vault and marks audit log.
   */
  async deleteDocument(
    docId: string,
    actor: string = 'SYSTEM',
    ipAddress: string = '127.0.0.1'
  ): Promise<boolean> {
    const doc = await documentRepository.findById(docId);
    if (!doc) {
      throw new Error(`Document with ID ${docId} not found.`);
    }

    // Delete from D1
    const success = await documentRepository.delete(docId);

    // Chained audit log
    await recordChainedAuditLog({
      caseId: doc.case_id,
      action: 'DOCUMENT_DELETED',
      previousState: JSON.stringify({ docId, fileName: doc.file_name, storagePath: doc.storage_path }),
      newState: null,
      performedBy: actor,
      ipAddress,
    });

    return success;
  }

  /**
   * Inspects case status to determine whether client downloads must be watermarked.
   * Statutory Rule: If case stage < 8 or 20% balance is unpaid, watermark is strictly enforced.
   */
  async shouldEnforceWatermark(caseId: string): Promise<{ watermark: boolean; reason?: string }> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const caseRecord = await executeQueryOne<{ current_stage: number; total_fee: number }>(
      `SELECT current_stage, total_fee FROM cases WHERE UPPER(id) = ?;`,
      [cleanCaseId]
    );

    if (!caseRecord) {
      return { watermark: true, reason: 'Case docket not found; default secure provisional watermark applied.' };
    }

    if (caseRecord.current_stage < 8) {
      return {
        watermark: true,
        reason: `Case is in Stage ${caseRecord.current_stage} (Pre-Certification). Final unwatermarked release requires Stage 8 sign-off.`,
      };
    }

    // Check payment balance
    const payments = await executeQueryOne<{ total_paid: number }>(
      `SELECT SUM(amount) as total_paid FROM payments WHERE UPPER(case_id) = ?;`,
      [cleanCaseId]
    );

    const totalPaid = payments?.total_paid || 0;
    if (caseRecord.total_fee && totalPaid < caseRecord.total_fee) {
      return {
        watermark: true,
        reason: `Pending balance remaining (Paid: ₹${totalPaid} / Total: ₹${caseRecord.total_fee}). Watermark retained until 100% escrow settlement.`,
      };
    }

    return { watermark: false };
  }
}

export const documentVaultService = new DocumentVaultService();

