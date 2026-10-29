-- =============================================================================
-- Migration 0003: Add Chitta Document Storage & File Metadata
-- Purpose: Support PDF and Word (.docx / .doc) documents for EC, Patta, Chitta, FMB
-- =============================================================================

-- 1. Add Chitta, Patta and FMB file columns to revenue_records
ALTER TABLE revenue_records ADD COLUMN chitta_file_url TEXT;
ALTER TABLE revenue_records ADD COLUMN chitta_file_name VARCHAR(255);
ALTER TABLE revenue_records ADD COLUMN patta_file_name VARCHAR(255);
ALTER TABLE revenue_records ADD COLUMN fmb_file_name VARCHAR(255);

-- 2. Add mime_type to case_documents
ALTER TABLE case_documents ADD COLUMN mime_type VARCHAR(100);
