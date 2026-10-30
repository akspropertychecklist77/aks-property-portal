# Cloudflare D1 Database Engineering Specification & Review
### AKS Property Checklist & Legal Operations Platform
**Document Reference:** AKS-D1-SPEC-2026-V2.1  
**Database Engine:** Cloudflare D1 (Distributed SQLite at Edge) & Cloudflare R2 (Object Storage)  
**Governing Standard:** ISO/IEC 11179 / DAMA-DMBOK / ACID on Serverless Edge  
**Date:** October 2026  

---

## 1. Executive Assessment & Platform Analysis

### 1.1 Structural Review of Existing Schemas
The current database comprises 11 core tables in `d1-schema.sql` plus metadata catalog tables in `sys_entities`. The architectural assessment identified:
1. **Enquiry-to-Case Provenance**: `enquiries.converted_case_id` maps to `cases.id` when promoted.
2. **Naming Alignment**: Reconciled `ec_records` and `parent_documents` with metadata catalog schemas.
3. **Monetary Precision**: All fees standardized to integer paise (`total_fee_cents`, `advance_amount_cents`, `balance_amount_cents`) to eliminate IEEE 754 floating-point inaccuracies in SQLite.
4. **Optimistic Concurrency Control**: Added `version INTEGER NOT NULL DEFAULT 1` to `cases` to prevent concurrent write collisions during Job Card legal scrutiny.
5. **Merkle Audit Chaining**: Chained cryptographic hashes (`prev_merkle_hash` -> `merkle_hash`) on `case_milestone_logs`.
6. **Binary Vault Offloading**: Zero binary blobs stored in D1. All files offloaded to Cloudflare R2 with SHA-256 checksums and presigned temporary access URLs.

---

## 2. Cloudflare D1 & R2 Architecture

```
Cloudflare D1 (Database UUID: c987d1f0-a579-4e4c-8482-36482bebfd7f)
├── Primary Instance: APAC (Singapore) - Handles all ACID writes via db.batch()
└── Read Replicas: Chennai / Mumbai / Tokyo - Sub-15ms edge read queries

Cloudflare R2 Bucket: aks-property-vault
└── S3-Compatible Object Store - Zero egress fees, SHA-256 verified binary deeds <= 15MB
```

---

## 3. Complete DDL Schema

```sql
PRAGMA foreign_keys = ON;

-- 1. Security & Identity
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    bar_council_reg_no TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    is_email_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_email_verified IN (0, 1)),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    last_login_at TEXT,
    last_login_ip TEXT,
    password_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    is_revoked INTEGER NOT NULL DEFAULT 0 CHECK (is_revoked IN (0, 1)),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Metadata Catalog
CREATE TABLE IF NOT EXISTS sys_modules (
    id TEXT PRIMARY KEY,
    module_key TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    icon_name TEXT NOT NULL DEFAULT 'Folder',
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sys_entities (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL REFERENCES sys_modules(id) ON DELETE CASCADE,
    entity_key TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    storage_table TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Core Legal Operations
CREATE TABLE IF NOT EXISTS enquiries (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    service_package TEXT NOT NULL DEFAULT 'Legal Opinion (Standard)',
    district TEXT NOT NULL,
    property_address TEXT,
    survey_number TEXT,
    client_notes TEXT,
    source TEXT NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'property_checklist_app', 'whatsapp', 'office')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'accepted', 'rejected', 'spam')),
    assigned_handler_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    converted_case_id TEXT,
    rejection_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    source_enquiry_id TEXT REFERENCES enquiries(id) ON DELETE RESTRICT,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    service_package TEXT NOT NULL DEFAULT 'Legal Opinion (Standard)',
    current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 8),
    district TEXT NOT NULL,
    property_address TEXT,
    survey_number TEXT,
    total_fee_cents INTEGER NOT NULL DEFAULT 650000,
    advance_amount_cents INTEGER NOT NULL DEFAULT 520000,
    balance_amount_cents INTEGER NOT NULL DEFAULT 130000,
    payment_status TEXT NOT NULL DEFAULT 'advance_pending' CHECK (payment_status IN ('advance_pending', 'advance_paid', 'fully_paid')),
    case_status TEXT NOT NULL DEFAULT 'active' CHECK (case_status IN ('active', 'on_hold', 'completed', 'cancelled')),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ec_records (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    serial_no INTEGER NOT NULL DEFAULT 1,
    search_period TEXT NOT NULL,
    doc_number TEXT NOT NULL,
    sro_name TEXT NOT NULL,
    survey_number TEXT,
    deed_nature TEXT NOT NULL,
    executant TEXT,
    claimant TEXT,
    is_encumbrance_flag INTEGER NOT NULL DEFAULT 0 CHECK (is_encumbrance_flag IN (0, 1)),
    remarks TEXT,
    doc_file_name TEXT,
    doc_file_url TEXT,
    source_type TEXT NOT NULL DEFAULT 'MANUAL_UPLOAD' CHECK (source_type IN ('MANUAL_UPLOAD', 'TNREGINET_AUTO_FETCH')),
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('VERIFIED', 'FLAGGED', 'PENDING_VALIDATION')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parent_documents (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    deed_type TEXT NOT NULL,
    doc_number TEXT NOT NULL,
    sro_name TEXT,
    year TEXT NOT NULL,
    executants TEXT,
    claimants TEXT,
    extent TEXT,
    schedule_matches INTEGER NOT NULL DEFAULT 1 CHECK (schedule_matches IN (0, 1)),
    link_verified INTEGER NOT NULL DEFAULT 1 CHECK (link_verified IN (0, 1)),
    notes TEXT,
    doc_file_name TEXT,
    doc_file_url TEXT,
    source_type TEXT NOT NULL DEFAULT 'MANUAL_UPLOAD',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS revenue_records (
    id TEXT PRIMARY KEY,
    case_id TEXT UNIQUE NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    current_sale_deed_no TEXT,
    patta_number TEXT,
    patta_holder_name TEXT,
    field_survey_no TEXT,
    sub_division TEXT,
    village_taluk TEXT,
    chitta_adangal_verified INTEGER NOT NULL DEFAULT 0 CHECK (chitta_adangal_verified IN (0, 1)),
    fmb_sketch_verified INTEGER NOT NULL DEFAULT 0 CHECK (fmb_sketch_verified IN (0, 1)),
    tslr_verified INTEGER NOT NULL DEFAULT 0 CHECK (tslr_verified IN (0, 1)),
    guideline_value_cents INTEGER,
    patta_file_url TEXT,
    patta_file_name TEXT,
    chitta_file_url TEXT,
    chitta_file_name TEXT,
    fmb_file_url TEXT,
    fmb_file_name TEXT,
    source_type TEXT NOT NULL DEFAULT 'MANUAL_UPLOAD' CHECK (source_type IN ('MANUAL_UPLOAD', 'ESERVICES_TN_AUTO_FETCH')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS legal_opinions (
    id TEXT PRIMARY KEY,
    case_id TEXT UNIQUE NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    advocate_name TEXT NOT NULL DEFAULT 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
    bar_council_reg_no TEXT NOT NULL DEFAULT 'MS/1245/2005',
    marketable_title_certified INTEGER NOT NULL DEFAULT 0 CHECK (marketable_title_certified IN (0, 1)),
    encumbrance_status TEXT NOT NULL DEFAULT 'Clear' CHECK (encumbrance_status IN ('Clear', 'Mortgaged', 'Litigation_Pending', 'Defective')),
    root_of_title TEXT,
    key_findings_json TEXT NOT NULL DEFAULT '[]',
    recommendations_json TEXT NOT NULL DEFAULT '[]',
    sign_off_status TEXT NOT NULL DEFAULT 'draft' CHECK (sign_off_status IN ('draft', 'reviewed', 'certified')),
    opinion_hash TEXT,
    signed_at TEXT,
    signed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS case_documents (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_category TEXT NOT NULL CHECK (file_category IN ('EC_CERTIFICATE', 'PARENT_DEED', 'PATTA_COPY', 'CHITTA_EXTRACT', 'FMB_SKETCH', 'LEGAL_OPINION', 'PROVISIONAL_DRAFT', 'MISC')),
    storage_bucket TEXT NOT NULL DEFAULT 'aks-property-vault',
    storage_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 15728640),
    mime_type TEXT NOT NULL,
    sha256_checksum TEXT NOT NULL,
    is_watermarked INTEGER NOT NULL DEFAULT 0 CHECK (is_watermarked IN (0, 1)),
    uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    payment_stage TEXT NOT NULL CHECK (payment_stage IN ('80_ADVANCE', '20_BALANCE')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('UPI', 'NEFT', 'IMPS', 'BANK_TRANSFER', 'CASH', 'CHEQUE')),
    transaction_ref TEXT,
    receipt_doc_id TEXT REFERENCES case_documents(id) ON DELETE SET NULL,
    verified_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    paid_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (case_id, payment_stage)
);

CREATE TABLE IF NOT EXISTS case_milestone_logs (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    from_stage INTEGER CHECK (from_stage BETWEEN 1 AND 8),
    to_stage INTEGER NOT NULL CHECK (to_stage BETWEEN 1 AND 8),
    action_notes TEXT,
    triggered_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    prev_merkle_hash TEXT,
    merkle_hash TEXT NOT NULL,
    logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

