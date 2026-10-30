-- =============================================================================
-- AKS Property Checklist - Legal Operations Portal
-- Database Schema (Cloudflare D1 & PostgreSQL Compatible ANSI-SQL)
-- Generated from Liquibase Changelog Master
-- =============================================================================

-- 0. Users & Authentication Table (OWASP Compliant)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(40) DEFAULT 'RESEARCH_STAFF' NOT NULL, -- SUPER_ADMIN, ADVOCATE_ADMIN, RESEARCH_STAFF, ACCOUNTS_STAFF, CLIENT
    phone VARCHAR(30),
    bar_council_reg_no VARCHAR(60),
    is_active BOOLEAN DEFAULT 1 NOT NULL,
    is_email_verified BOOLEAN DEFAULT 0 NOT NULL,
    email_verified_at TIMESTAMP,
    failed_login_attempts INT DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT 0 NOT NULL,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 0b. User Sessions & Refresh Tokens
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    is_revoked BOOLEAN DEFAULT 0 NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);

-- 0c. Enquiries & Intake Staging Table (Tier 1 Buffer)
CREATE TABLE IF NOT EXISTS enquiries (
    id VARCHAR(36) PRIMARY KEY,
    client_name VARCHAR(150) NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    client_email VARCHAR(150),
    service_package VARCHAR(80) DEFAULT 'Legal Opinion (Standard)' NOT NULL,
    district VARCHAR(60) NOT NULL,
    property_address TEXT,
    survey_number VARCHAR(120),
    client_notes TEXT,
    source VARCHAR(50) DEFAULT 'website' NOT NULL, -- 'website', 'property_checklist_app', 'whatsapp'
    status VARCHAR(30) DEFAULT 'new' NOT NULL,     -- 'new', 'contacted', 'accepted', 'rejected', 'spam'
    assigned_handler_id VARCHAR(36) REFERENCES users(id),
    converted_case_id VARCHAR(30),                 -- Populated only when converted to cases(id)
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_phone ON enquiries(client_phone);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at);

-- 1. Cases Master Table (Tier 2 Legal Matters)
CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(30) PRIMARY KEY,
    source_enquiry_id VARCHAR(36) REFERENCES enquiries(id),
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
    doc_file_name VARCHAR(255),
    doc_file_url TEXT,
    source_type VARCHAR(50) DEFAULT 'MANUAL_UPLOAD', -- MANUAL_UPLOAD or TNREGINET_AUTO_FETCH
    verification_status VARCHAR(50) DEFAULT 'VERIFIED',
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
    gap_analysis_notes TEXT,
    doc_file_name VARCHAR(255),
    doc_file_url TEXT,
    source_type VARCHAR(50) DEFAULT 'MANUAL_UPLOAD'
);

CREATE INDEX IF NOT EXISTS idx_parent_case_id ON parent_documents(case_id);

-- 4. Revenue Records (Current Deed, Patta, Chitta, FMB, Guideline Value)
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
    guideline_value DECIMAL(10,2),
    patta_file_url TEXT,
    patta_file_name VARCHAR(255),
    chitta_file_url TEXT,
    chitta_file_name VARCHAR(255),
    fmb_file_url TEXT,
    fmb_file_name VARCHAR(255),
    source_type VARCHAR(50) DEFAULT 'MANUAL_UPLOAD'
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

-- 6. Case Documents (PDFs, Word Docs, Deeds, Watermarked Previews)
CREATE TABLE IF NOT EXISTS case_documents (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_category VARCHAR(50) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
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

-- 9. Case Welcome Letters (Stage 3 Engagement & Requisition)
CREATE TABLE IF NOT EXISTS case_welcome_letters (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) UNIQUE NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    letter_ref_no VARCHAR(60) UNIQUE NOT NULL,
    letter_date DATE NOT NULL,
    template_version VARCHAR(20) DEFAULT 'v1.0' NOT NULL,
    scope_summary TEXT NOT NULL,
    documents_required_json TEXT NOT NULL,
    delivery_timeline_days INT DEFAULT 7 NOT NULL,
    total_fee DECIMAL(10,2) NOT NULL,
    advance_amount DECIMAL(10,2) NOT NULL,
    balance_amount DECIMAL(10,2) NOT NULL,
    terms_and_conditions TEXT NOT NULL,
    custom_clauses TEXT,
    approval_status VARCHAR(30) DEFAULT 'draft' NOT NULL, -- draft, awaiting_approval, approved
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    sent_status VARCHAR(30) DEFAULT 'not_sent' NOT NULL,   -- not_sent, sent
    sent_at TIMESTAMP,
    sent_channel VARCHAR(40),                             -- email, whatsapp, courier, in_person
    sent_by VARCHAR(100),
    dispatch_ref VARCHAR(100),
    pdf_storage_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wl_case_id ON case_welcome_letters(case_id);
CREATE INDEX IF NOT EXISTS idx_wl_ref_no ON case_welcome_letters(letter_ref_no);
CREATE INDEX IF NOT EXISTS idx_wl_status ON case_welcome_letters(approval_status, sent_status);

-- -----------------------------------------------------------------------------
-- 10. Centralized Notification Service Tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_outbox (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(64) UNIQUE NOT NULL,
    event_name VARCHAR(60) NOT NULL,
    source_module VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    case_id VARCHAR(30) REFERENCES cases(id) ON DELETE CASCADE,
    docket_number VARCHAR(60),
    payload_json TEXT NOT NULL,
    correlation_id VARCHAR(64),
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL 
        CHECK(status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'COMPLETED', 'FAILED')),
    last_error TEXT,
    retry_count INT DEFAULT 0 NOT NULL,
    published_at TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON notification_outbox(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_outbox_event_name ON notification_outbox(event_name);
CREATE INDEX IF NOT EXISTS idx_outbox_case_id ON notification_outbox(case_id);

CREATE TABLE IF NOT EXISTS notification_templates (
    id VARCHAR(36) PRIMARY KEY,
    template_code VARCHAR(60) UNIQUE NOT NULL,
    template_name VARCHAR(120) NOT NULL,
    event_name VARCHAR(60) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP', 'IN_APP')),
    language_code VARCHAR(10) DEFAULT 'en' NOT NULL,
    provider_template_name VARCHAR(120),
    provider_template_id VARCHAR(100),
    category VARCHAR(40) DEFAULT 'TRANSACTIONAL' NOT NULL,
    description TEXT,
    active_version_id VARCHAR(36),
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK(status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
    is_active BOOLEAN DEFAULT 1 NOT NULL,
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_templates_event ON notification_templates(event_name, channel, language_code);
CREATE INDEX IF NOT EXISTS idx_templates_code ON notification_templates(template_code);

CREATE TABLE IF NOT EXISTS notification_template_versions (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL REFERENCES notification_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    subject_template VARCHAR(255),
    body_html TEXT,
    body_text TEXT,
    body_json TEXT,
    placeholder_schema_json TEXT NOT NULL,
    provider_approval_status VARCHAR(30) DEFAULT 'NOT_REQUIRED' NOT NULL 
        CHECK(provider_approval_status IN ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED')),
    approval_status VARCHAR(20) DEFAULT 'DRAFT' NOT NULL 
        CHECK(approval_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'RETIRED')),
    approved_by VARCHAR(36) REFERENCES users(id),
    approved_at TIMESTAMP,
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_tmpl_vers_lookup ON notification_template_versions(template_id, version_number);

CREATE TABLE IF NOT EXISTS notification_rules (
    id VARCHAR(36) PRIMARY KEY,
    rule_code VARCHAR(60) UNIQUE NOT NULL,
    event_name VARCHAR(60) NOT NULL,
    source_module VARCHAR(50) NOT NULL,
    recipient_type VARCHAR(30) NOT NULL 
        CHECK(recipient_type IN ('CLIENT', 'STAFF', 'ASSIGNED_ADVOCATE', 'CHIEF_COUNSEL', 'ACCOUNTS', 'SUPER_ADMIN')),
    recipient_resolution VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP', 'IN_APP')),
    template_id VARCHAR(36) NOT NULL REFERENCES notification_templates(id),
    language_code VARCHAR(10) DEFAULT 'en' NOT NULL,
    priority VARCHAR(10) DEFAULT 'NORMAL' NOT NULL CHECK(priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    is_enabled BOOLEAN DEFAULT 1 NOT NULL,
    delay_minutes INT DEFAULT 0 NOT NULL,
    business_hours_only BOOLEAN DEFAULT 0 NOT NULL,
    max_reminders INT DEFAULT 1 NOT NULL,
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rules_event ON notification_rules(event_name, is_enabled);

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id VARCHAR(36) PRIMARY KEY,
    outbox_id VARCHAR(36) NOT NULL REFERENCES notification_outbox(id) ON DELETE CASCADE,
    event_id VARCHAR(64) NOT NULL,
    case_id VARCHAR(30) REFERENCES cases(id) ON DELETE SET NULL,
    recipient_type VARCHAR(30) NOT NULL,
    recipient_id VARCHAR(36),
    recipient_address VARCHAR(150) NOT NULL,
    recipient_address_hash VARCHAR(64) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP', 'IN_APP')),
    template_id VARCHAR(36) NOT NULL REFERENCES notification_templates(id),
    template_version_id VARCHAR(36) NOT NULL REFERENCES notification_template_versions(id),
    provider VARCHAR(30) NOT NULL CHECK(provider IN ('RESEND', 'META_WHATSAPP', 'INTERNAL')),
    provider_message_id VARCHAR(100),
    subject VARCHAR(255),
    delivery_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL 
        CHECK(delivery_status IN ('PENDING', 'QUEUED', 'PROCESSING', 'SUBMITTED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'BOUNCED', 'REJECTED', 'CANCELLED', 'SUPPRESSED')),
    priority VARCHAR(10) DEFAULT 'NORMAL' NOT NULL,
    attempt_count INT DEFAULT 0 NOT NULL,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_code VARCHAR(50),
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(outbox_id, recipient_address_hash, channel)
);

CREATE INDEX IF NOT EXISTS idx_deliv_status ON notification_deliveries(delivery_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliv_case_id ON notification_deliveries(case_id);
CREATE INDEX IF NOT EXISTS idx_deliv_provider_msg ON notification_deliveries(provider, provider_message_id);

CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
    id VARCHAR(36) PRIMARY KEY,
    notification_delivery_id VARCHAR(36) NOT NULL REFERENCES notification_deliveries(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    provider VARCHAR(30) NOT NULL,
    request_reference VARCHAR(100),
    provider_message_id VARCHAR(100),
    attempt_status VARCHAR(20) NOT NULL CHECK(attempt_status IN ('SUCCESS', 'TRANSIENT_FAILURE', 'PERMANENT_FAILURE')),
    response_code INT,
    error_code VARCHAR(60),
    error_message TEXT,
    retry_after_seconds INT,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attempts_delivery_id ON notification_delivery_attempts(notification_delivery_id, attempt_number);

CREATE TABLE IF NOT EXISTS client_communication_consents (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) REFERENCES cases(id) ON DELETE CASCADE,
    client_phone VARCHAR(30) NOT NULL,
    client_email VARCHAR(150),
    channel VARCHAR(20) NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP')),
    consent_status VARCHAR(20) NOT NULL CHECK(consent_status IN ('OPTED_IN', 'OPTED_OUT', 'REVOKED')),
    consent_category VARCHAR(40) DEFAULT 'CASE_UPDATES' NOT NULL,
    consent_text_version VARCHAR(20) DEFAULT 'v1.0' NOT NULL,
    consent_source VARCHAR(50) NOT NULL,
    consent_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    withdrawn_at TIMESTAMP,
    captured_by VARCHAR(36) REFERENCES users(id),
    evidence_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consent_lookup ON client_communication_consents(client_phone, channel, consent_status);
CREATE INDEX IF NOT EXISTS idx_consent_case ON client_communication_consents(case_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    case_id VARCHAR(30) REFERENCES cases(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP', 'IN_APP')),
    event_category VARCHAR(40) NOT NULL,
    is_enabled BOOLEAN DEFAULT 1 NOT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pref_user_channel ON notification_preferences(user_id, channel, event_category) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pref_case_channel ON notification_preferences(case_id, channel, event_category) WHERE case_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notification_webhook_events (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(30) NOT NULL CHECK(provider IN ('RESEND', 'META_WHATSAPP')),
    provider_event_id VARCHAR(100),
    provider_message_id VARCHAR(100),
    event_type VARCHAR(50) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    processing_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL 
        CHECK(processing_status IN ('PENDING', 'PROCESSED', 'DUPLICATE', 'FAILED', 'IGNORED')),
    processing_error TEXT,
    UNIQUE(provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_dedup ON notification_webhook_events(provider, provider_message_id, event_type);

CREATE TABLE IF NOT EXISTS notification_inbox (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_delivery_id VARCHAR(36) REFERENCES notification_deliveries(id) ON DELETE SET NULL,
    event_name VARCHAR(60) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50) NOT NULL,
    related_entity_id VARCHAR(50) NOT NULL,
    action_url VARCHAR(255),
    is_read BOOLEAN DEFAULT 0 NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inbox_user_read ON notification_inbox(user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_scheduled_jobs (
    id VARCHAR(36) PRIMARY KEY,
    job_type VARCHAR(40) NOT NULL,
    event_name VARCHAR(60) NOT NULL,
    case_id VARCHAR(30) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    recipient_reference VARCHAR(150) NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' NOT NULL 
        CHECK(status IN ('SCHEDULED', 'EXECUTED', 'CANCELLED', 'SUPPRESSED')),
    execution_count INT DEFAULT 0 NOT NULL,
    max_execution_count INT DEFAULT 3 NOT NULL,
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    cancellation_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sched_next ON notification_scheduled_jobs(status, next_execution_at ASC);
CREATE INDEX IF NOT EXISTS idx_sched_case ON notification_scheduled_jobs(case_id);

-- =============================================================================
-- Initial Demonstration Seed Data
-- =============================================================================
INSERT OR IGNORE INTO users (id, username, email, password_hash, full_name, role, phone, bar_council_reg_no, is_active, is_email_verified)
VALUES 
('usr_adv_001', 'advocate.saravanan', 'akspropertychecklist77@gmail.com', '$2a$12$K1G2u4Hq/9N0vPZ2bJ8xGe1J4qD8yM6pA8wE1rT3yU5iO7pQ9sW0e', 'Advocate A.K. Saravanan', 'ADVOCATE_ADMIN', '+91 98400 12345', 'MS/1245/2005', 1, 1),
('usr_staff_002', 'research.ops', 'ops@akspropertychecklist.in', '$2a$12$K1G2u4Hq/9N0vPZ2bJ8xGe1J4qD8yM6pA8wE1rT3yU5iO7pQ9sW0e', 'Legal Research Desk', 'RESEARCH_STAFF', '+91 98400 54321', NULL, 1, 1);

INSERT OR IGNORE INTO cases (id, client_name, client_phone, client_email, service_package, current_stage, district, property_address, survey_number, total_fee, advance_amount, balance_amount, payment_status, case_status)
VALUES 
('AK-2026-001', 'K. Vellingiri', '+91 98422 12345', 'client.vel@example.com', 'Legal Opinion (Standard)', 8, 'Coimbatore', 'S.F. No. 342/1B, Saravanampatti Village, Coimbatore North Taluk', 'S.F. No. 342/1B', 6500.00, 5200.00, 1300.00, 'fully_paid', 'completed'),
('AK-2026-002', 'S. Sundaramurthy', '+91 94433 67890', 'sundar.s@example.com', 'Legal Opinion (Standard)', 7, 'Tiruppur', 'Plot No. 44, Sri Krishna Nagar, Kangeyam Road, Tiruppur', 'R.S. No. 189/3', 6500.00, 5200.00, 1300.00, 'advance_paid', 'active'),
('AK-2026-003', 'Dr. M. Radhakrishnan', '+91 98840 55443', 'm.radha@example.com', 'Comprehensive Due Diligence', 4, 'Chennai', 'Flat 3B, Emerald Towers, 2nd Main Road, Anna Nagar, Chennai', 'T.S. No. 45, Block 12', 12500.00, 10000.00, 2500.00, 'advance_paid', 'active'),
('AK-2026-004', 'Anandhi Parthiban', '+91 97900 88776', 'anandhi.p@example.com', 'Legal Opinion (Standard)', 2, 'Erode', 'Thindal Village, S.F. No. 82/4A, Erode Taluk', 'S.F. No. 82/4A', 6500.00, 5200.00, 1300.00, 'advance_pending', 'active');

