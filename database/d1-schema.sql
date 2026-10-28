-- =============================================================================
-- AKS Property Checklist - Legal Operations Portal
-- Database Schema (Cloudflare D1 & PostgreSQL Compatible ANSI-SQL)
-- Generated from Liquibase Changelog Master
-- =============================================================================

-- 1. Cases Master Table
CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(30) PRIMARY KEY,
    client_name VARCHAR(150) NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    client_email VARCHAR(150),
    service_package VARCHAR(80) DEFAULT 'Legal Opinion (Standard)' NOT NULL,
    current_stage INT DEFAULT 1 NOT NULL,
    district VARCHAR(60) NOT NULL,
    property_address TEXT,
    survey_number VARCHAR(120),
    total_fee DECIMAL(10,2) DEFAULT 6500.00 NOT NULL,
    advance_amount DECIMAL(10,2) DEFAULT 5200.00 NOT NULL,
    balance_amount DECIMAL(10,2) DEFAULT 1300.00 NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'advance_pending' NOT NULL,
    case_status VARCHAR(30) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_phone ON cases(client_phone);
CREATE INDEX IF NOT EXISTS idx_cases_stage ON cases(current_stage);

-- 2. EC Records (Encumbrance Certificate Index)
CREATE TABLE IF NOT EXISTS ec_records (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    serial_no INT NOT NULL,
    search_period VARCHAR(80),
    doc_number VARCHAR(60) NOT NULL,
    sro_name VARCHAR(120) NOT NULL,
    deed_nature VARCHAR(100) NOT NULL,
    executant TEXT,
    claimant TEXT,
    is_encumbrance_flag BOOLEAN DEFAULT 0 NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ec_case_id ON ec_records(case_id);

-- 3. Parent Documents (Chain of Title Genealogy)
CREATE TABLE IF NOT EXISTS parent_documents (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    deed_type VARCHAR(100) NOT NULL,
    doc_number VARCHAR(60) NOT NULL,
    sro_name VARCHAR(120),
    registration_date VARCHAR(30),
    seller_name VARCHAR(150),
    buyer_name VARCHAR(150),
    extent VARCHAR(100),
    link_verified BOOLEAN DEFAULT 1 NOT NULL,
    gap_analysis_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_parent_case_id ON parent_documents(case_id);

-- 4. Revenue Records (Current Deed, Patta, Guideline Value)
CREATE TABLE IF NOT EXISTS revenue_records (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) UNIQUE NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    current_sale_deed_no VARCHAR(60),
    patta_number VARCHAR(60),
    patta_holder_name VARCHAR(150),
    field_survey_no VARCHAR(80),
    sub_division VARCHAR(60),
    village_taluk VARCHAR(120),
    chitta_adangal_verified BOOLEAN DEFAULT 0 NOT NULL,
    fmb_sketch_verified BOOLEAN DEFAULT 0 NOT NULL,
    guideline_value DECIMAL(10,2)
);

-- 5. Legal Opinions (Advocate A.K. Saravanan Scrutiny)
CREATE TABLE IF NOT EXISTS legal_opinions (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) UNIQUE NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    advocate_name VARCHAR(120) DEFAULT 'Advocate A.K. Saravanan' NOT NULL,
    bar_council_reg_no VARCHAR(60),
    root_of_title TEXT,
    marketable_title_certified BOOLEAN DEFAULT 0 NOT NULL,
    encumbrance_status VARCHAR(60) DEFAULT 'Clear' NOT NULL,
    legal_scrutiny_summary TEXT,
    special_conditions TEXT,
    sign_off_status VARCHAR(30) DEFAULT 'draft' NOT NULL,
    signed_at TIMESTAMP
);

-- 6. Case Documents (PDFs, Deeds, Watermarked Previews)
CREATE TABLE IF NOT EXISTS case_documents (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_category VARCHAR(50) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    is_watermarked BOOLEAN DEFAULT 0 NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_docs_case_id ON case_documents(case_id);

-- 7. Payments (80% Advance & 20% Balance)
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    payment_stage VARCHAR(30) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(40) NOT NULL,
    transaction_ref VARCHAR(100),
    verified_by VARCHAR(100),
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_case_id ON payments(case_id);

-- 8. Case Milestone Audit Logs (Stages 1-8 Movement)
CREATE TABLE IF NOT EXISTS case_milestone_logs (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    from_stage INT,
    to_stage INT NOT NULL,
    action_notes TEXT,
    triggered_by VARCHAR(100) DEFAULT 'system' NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_case_id ON case_milestone_logs(case_id);

-- =============================================================================
-- Initial Demonstration Seed Data
-- =============================================================================
INSERT OR IGNORE INTO cases (id, client_name, client_phone, client_email, service_package, current_stage, district, property_address, survey_number, total_fee, advance_amount, balance_amount, payment_status, case_status)
VALUES 
('AK-2026-001', 'K. Vellingiri', '+91 98422 12345', 'client.vel@example.com', 'Legal Opinion (Standard)', 8, 'Coimbatore', 'S.F. No. 342/1B, Saravanampatti Village, Coimbatore North Taluk', 'S.F. No. 342/1B', 6500.00, 5200.00, 1300.00, 'fully_paid', 'completed'),
('AK-2026-002', 'S. Sundaramurthy', '+91 94433 67890', 'sundar.s@example.com', 'Legal Opinion (Standard)', 7, 'Tiruppur', 'Plot No. 44, Sri Krishna Nagar, Kangeyam Road, Tiruppur', 'R.S. No. 189/3', 6500.00, 5200.00, 1300.00, 'advance_paid', 'active'),
('AK-2026-003', 'Dr. M. Radhakrishnan', '+91 98840 55443', 'm.radha@example.com', 'Comprehensive Due Diligence', 4, 'Chennai', 'Flat 3B, Emerald Towers, 2nd Main Road, Anna Nagar, Chennai', 'T.S. No. 45, Block 12', 12500.00, 10000.00, 2500.00, 'advance_paid', 'active'),
('AK-2026-004', 'Anandhi Parthiban', '+91 97900 88776', 'anandhi.p@example.com', 'Legal Opinion (Standard)', 2, 'Erode', 'Thindal Village, S.F. No. 82/4A, Erode Taluk', 'S.F. No. 82/4A', 6500.00, 5200.00, 1300.00, 'advance_pending', 'active');
