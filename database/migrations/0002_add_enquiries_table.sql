-- =============================================================================
-- Migration 0002: Add Enquiries Intake Staging Table & Case Reference
-- Purpose: Two-Tier Architecture (Lead Intake Staging -> Active Legal Matters)
-- =============================================================================

-- 1. Create Enquiries Staging Table
CREATE TABLE IF NOT EXISTS enquiries (
    id VARCHAR(36) PRIMARY KEY,                         -- e.g. 'ENQ-2026-101'
    client_name VARCHAR(150) NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    client_email VARCHAR(150),
    service_package VARCHAR(80) DEFAULT 'Legal Opinion (Standard)' NOT NULL,
    district VARCHAR(60) NOT NULL,
    property_address TEXT,
    survey_number VARCHAR(120),
    client_notes TEXT,
    source VARCHAR(50) DEFAULT 'website' NOT NULL,      -- 'website', 'property_checklist_app', 'whatsapp'
    status VARCHAR(30) DEFAULT 'new' NOT NULL,          -- 'new', 'contacted', 'accepted', 'rejected', 'spam'
    assigned_handler_id VARCHAR(36),
    converted_case_id VARCHAR(30),                      -- Populated only when converted to cases(id)
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_phone ON enquiries(client_phone);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at);

-- 2. Link cases table to source enquiry
-- Note: In SQLite/D1, run this statement if source_enquiry_id column is not already present:
-- ALTER TABLE cases ADD COLUMN source_enquiry_id VARCHAR(36);

