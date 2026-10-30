-- =============================================================================
-- AKS LEGAL OPERATIONS PLATFORM - ENTERPRISE NOTIFICATION SERVICE SCHEMA
-- Migration: 0006_create_notification_service.sql
-- Target: Cloudflare D1 (APAC Edge SQLite)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. NOTIFICATION OUTBOX (Transactional Outbox Pattern)
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

-- -----------------------------------------------------------------------------
-- 2. NOTIFICATION TEMPLATES (Registry Header)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_templates (
    id VARCHAR(36) PRIMARY KEY,
    template_code VARCHAR(60) UNIQUE NOT NULL,
    template_name VARCHAR(120) NOT NULL,
    event_name VARCHAR(60) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP', 'IN_APP')),
    language_code VARCHAR(10) DEFAULT 'en' NOT NULL, -- 'en', 'ta' (Tamil)
    provider_template_name VARCHAR(120),            -- WhatsApp HSM approved name
    provider_template_id VARCHAR(100),              -- Meta template ID
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

-- -----------------------------------------------------------------------------
-- 3. NOTIFICATION TEMPLATE VERSIONS (Immutable Version Control)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_template_versions (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL REFERENCES notification_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    subject_template VARCHAR(255),
    body_html TEXT,
    body_text TEXT,
    body_json TEXT,                                  -- Structured Meta WhatsApp payload
    placeholder_schema_json TEXT NOT NULL,          -- JSON Schema of required {{variables}}
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

-- -----------------------------------------------------------------------------
-- 4. NOTIFICATION RULES (Event Routing Engine)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_rules (
    id VARCHAR(36) PRIMARY KEY,
    rule_code VARCHAR(60) UNIQUE NOT NULL,
    event_name VARCHAR(60) NOT NULL,
    source_module VARCHAR(50) NOT NULL,
    recipient_type VARCHAR(30) NOT NULL 
        CHECK(recipient_type IN ('CLIENT', 'STAFF', 'ASSIGNED_ADVOCATE', 'CHIEF_COUNSEL', 'ACCOUNTS', 'SUPER_ADMIN')),
    recipient_resolution VARCHAR(50) NOT NULL,      -- 'CASE_CLIENT', 'CASE_ADVOCATE', 'MODULE_ROLE'
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

-- -----------------------------------------------------------------------------
-- 5. NOTIFICATION DELIVERIES (Multi-Channel Delivery Records)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id VARCHAR(36) PRIMARY KEY,
    outbox_id VARCHAR(36) NOT NULL REFERENCES notification_outbox(id) ON DELETE CASCADE,
    event_id VARCHAR(64) NOT NULL,
    case_id VARCHAR(30) REFERENCES cases(id) ON DELETE SET NULL,
    recipient_type VARCHAR(30) NOT NULL,
    recipient_id VARCHAR(36),                       -- users(id) if staff
    recipient_address VARCHAR(150) NOT NULL,        -- Masked phone (+91 98***12345) or email
    recipient_address_hash VARCHAR(64) NOT NULL,    -- SHA-256 for exact query lookup without unmasking
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

-- -----------------------------------------------------------------------------
-- 6. NOTIFICATION DELIVERY ATTEMPTS (Immutable Provider Log)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 7. CLIENT COMMUNICATION CONSENTS (WhatsApp & Legal Opt-In)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_communication_consents (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(30) REFERENCES cases(id) ON DELETE CASCADE,
    client_phone VARCHAR(30) NOT NULL,
    client_email VARCHAR(150),
    channel VARCHAR(20) NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP')),
    consent_status VARCHAR(20) NOT NULL CHECK(consent_status IN ('OPTED_IN', 'OPTED_OUT', 'REVOKED')),
    consent_category VARCHAR(40) DEFAULT 'CASE_UPDATES' NOT NULL,
    consent_text_version VARCHAR(20) DEFAULT 'v1.0' NOT NULL,
    consent_source VARCHAR(50) NOT NULL,            -- 'PUBLIC_ENQUIRY_FORM', 'INTAKE_DESK', 'WHATSAPP_INBOUND'
    consent_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    withdrawn_at TIMESTAMP,
    captured_by VARCHAR(36) REFERENCES users(id),
    evidence_reference VARCHAR(100),                -- e.g. IP address or intake record ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consent_lookup ON client_communication_consents(client_phone, channel, consent_status);
CREATE INDEX IF NOT EXISTS idx_consent_case ON client_communication_consents(case_id);

-- -----------------------------------------------------------------------------
-- 8. NOTIFICATION PREFERENCES (User & Client Granular Controls)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    case_id VARCHAR(30) REFERENCES cases(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP', 'IN_APP')),
    event_category VARCHAR(40) NOT NULL,            -- 'MILESTONE_UPDATES', 'PAYMENT_ALERTS', 'DOCUMENT_REQUISITION'
    is_enabled BOOLEAN DEFAULT 1 NOT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pref_user_channel ON notification_preferences(user_id, channel, event_category) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pref_case_channel ON notification_preferences(case_id, channel, event_category) WHERE case_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 9. NOTIFICATION WEBHOOK EVENTS (Deduplication & Replay Protection)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_webhook_events (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(30) NOT NULL CHECK(provider IN ('RESEND', 'META_WHATSAPP')),
    provider_event_id VARCHAR(100),
    provider_message_id VARCHAR(100),
    event_type VARCHAR(50) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,              -- SHA-256 hash of raw webhook payload
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    processing_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL 
        CHECK(processing_status IN ('PENDING', 'PROCESSED', 'DUPLICATE', 'FAILED', 'IGNORED')),
    processing_error TEXT,
    UNIQUE(provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_dedup ON notification_webhook_events(provider, provider_message_id, event_type);

-- -----------------------------------------------------------------------------
-- 10. NOTIFICATION INBOX (Staff In-App Notifications)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_inbox (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_delivery_id VARCHAR(36) REFERENCES notification_deliveries(id) ON DELETE SET NULL,
    event_name VARCHAR(60) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50) NOT NULL,       -- 'CASE', 'PAYMENT', 'DOCUMENT', 'WELCOME_LETTER'
    related_entity_id VARCHAR(50) NOT NULL,
    action_url VARCHAR(255),                        -- e.g. '/admin/cases/AK-2026-0042/job-card'
    is_read BOOLEAN DEFAULT 0 NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inbox_user_read ON notification_inbox(user_id, is_read, created_at DESC);

-- -----------------------------------------------------------------------------
-- 11. NOTIFICATION SCHEDULED JOBS (Reminders & Escrow Escalation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_scheduled_jobs (
    id VARCHAR(36) PRIMARY KEY,
    job_type VARCHAR(40) NOT NULL,                  -- 'ADVANCE_PAYMENT_REMINDER', 'DISCOVERY_CALL_REMINDER'
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

