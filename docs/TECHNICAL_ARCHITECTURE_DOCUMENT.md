# Technical Architecture Document (TAD)
## AKS Property Checklist & Legal Operations Platform

**Document Version:** 1.0.0  
**Status:** Approved / Active Baseline  
**Classification:** Confidential — Legal Practice Intellectual Property  
**Target Systems:**
1. **Public Discovery & Lead Intake Portal:** `aks-properties-checklist` (`akspropertychecklist.in`)
2. **Advocate ERP & Legal Scrutiny Hub:** `aks-property-portal` (`aks-property-portal.akspropertychecklist77.workers.dev`)  
**Lead Architect:** Engineering Team in collaboration with Advocate A.K. Saravanan (M.E., LLB)  
**Date of Release:** October 2026  

---

## 1. Executive Summary & Architectural Goals

The **AKS Property Checklist & Legal Operations Platform** is a cloud-native, edge-first legal technology ecosystem purpose-built for property due diligence and title verification across Tamil Nadu, India. 

Real estate transactions in Tamil Nadu operate under a dual-authority regulatory regime:
1. **The Registration Department (TNREGINET):** Governs deeds, registered encumbrances, and transactions under the *Registration Act, 1908*.
2. **The Revenue Department (Tamil Nilam / e-Services):** Governs ownership records, Patta, Chitta, Town Survey Land Register (TSLR), and Field Measurement Book (FMB) sketches under the *Tamil Nadu Patta Pass Book Act, 1983*.

Due to the lack of title guarantee in India (presumptive titling), verifying real property demands a rigorous multi-tier audit covering 30+ years of sub-registrar transactions, root of title genealogy, physical boundary alignment, and revenue compliance.

The platform provides an end-to-end digital lifecycle:
- **Client Acquisition & Assessment:** High-speed client-facing web application delivering interactive checklist audits, quote calculations, and automated lead staging.
- **Advocate Operations Management:** Serverless Enterprise Resource Planning (ERP) platform implementing an 8-Stage Standard Operating Procedure (SOP), digital Job Cards, 30-year EC matrixing, multi-format document management (PDF & Word `.docx`), automated stage tracking, and client self-service docket inspection.

```mermaid
graph LR
    subgraph Public Tier
        A[Client / Buyer] -->|Explores Services & Checklist| B[Astro 5 Web App<br/>akspropertychecklist.in]
        B -->|Submits Lead / Quote| C[Staging Buffer<br/>Cloudflare D1: enquiries]
    end

    subgraph Legal ERP Tier
        D[Advocate Admin / Clerks] -->|Reviews & Converts| E[Next.js 15 Edge App<br/>aks-property-portal]
        C -->|1-Click Intake| E
        E -->|Executes 8-Stage SOP| F[Active Cases Docket<br/>Cloudflare D1: cases]
        E -->|Indexes 30-Yr Records| G[Job Card Scrutiny Engine]
        E -->|Stores PDFs & Docx| H[Storage Layer<br/>R2 Object Store / Local Vault]
    end

    subgraph Client Transparency
        F -->|Live Stage Tracking| I[Client Tracker<br/>/track/caseId]
        I -->|Zero-Login Progress| A
    end
```

---

## 2. Architecture Principles & Core Patterns

1. **Edge-First Computation (Zero Cold-Starts):**
   - Public front-end and ERP application run globally on Cloudflare's Edge Network (`workerd` runtime) with execution latencies under 50ms across Asia-Pacific (APAC).
2. **Two-Tier Staging Pattern (Intake Isolation):**
   - Unverified leads from public forms arrive in an isolated `enquiries` staging buffer. Only after human assessment and advocate validation are records converted into official docket entries (`cases` table) with a unique reference number (`AK-YYYY-XXX`).
3. **Polyglot Storage Separation:**
   - **Structured Metadata & State:** Stored in Cloudflare D1 distributed SQLite database with strict ACID compliance.
   - **Unstructured Heavy Binaries (up to 15 MB):** Document scans, registered sale deeds, Patta, Chitta, and `.docx` legal opinions are stored in Cloudflare R2 / Local Disk Vaults, leaving relational tables lightweight.
4. **Zero-Dead-End UX Architecture:**
   - Human-centered ergonomics: Filtering, searching, or selecting milestones never strands legal practitioners on an empty void. Empty states always supply context, caseload distribution, and 1-click reset paths.
5. **Duality of Execution (Cloud Edge vs. Local Box):**
   - The platform supports seamless offline/local development where the local Node.js server (`localhost:3000`) communicates directly with the live Cloudflare D1 database via authenticated HTTPS REST APIs, bypassing local database sync drift.

---

## 3. C4 Architectural Viewpoints

### 3.1 C4 Level 1: System Context Diagram

```mermaid
C4Context
    title System Context Diagram - AKS Property Due Diligence Platform

    Person(client, "Property Buyer / Client", "Prospective property buyer, NRI investor, or real estate developer seeking title clearance.")
    Person(advocate, "Advocate A.K. Saravanan", "Chief Legal Advisor conducting title scrutiny and signing legal opinions.")
    Person(staff, "Legal Research Clerk", "Staff indexing 30-year EC records, parent deeds, and revenue entries.")

    System(publicSite, "Public Web Platform", "Astro 5 responsive web portal offering property verification guides, buffer zone checks, and enquiry intake.")
    System(portal, "Advocate ERP & Ops Portal", "Next.js 15 enterprise operations platform managing 8-stage case pipelines, job cards, and opinions.")

    System_Ext(cloudflareD1, "Cloudflare D1 SQL", "Serverless edge database storing dockets, leads, EC entries, and revenue records.")
    System_Ext(r2Storage, "Cloudflare R2 / Storage Vault", "High-capacity object storage for legal deeds, PDFs, and Word documents.")
    System_Ext(tnreginet, "TNREGINET Portal", "Government of Tamil Nadu Inspector General of Registration sub-registrar records.")
    System_Ext(eservices, "AnyTamilNadu e-Services", "Government of Tamil Nadu Revenue Department Patta, Chitta, and FMB register.")

    Rel(client, publicSite, "Submits verification enquiry, reads checklists", "HTTPS")
    Rel(client, portal, "Tracks case status and reviews watermarked preview", "HTTPS /track/[id]")
    Rel(advocate, portal, "Reviews title chain, drafts legal opinion, signs off", "HTTPS /admin")
    Rel(staff, portal, "Indexes EC, uploads Patta/Chitta, updates stages", "HTTPS /admin")

    Rel(publicSite, cloudflareD1, "Streams leads into enquiries table", "HTTPS REST API")
    Rel(portal, cloudflareD1, "Executes transactional queries and updates", "D1 Binding / HTTPS")
    Rel(portal, r2Storage, "Uploads and streams case documents (PDF, DOCX)", "Edge Stream API")
    Rel(staff, tnreginet, "Extracts 30-year Encumbrance Certificates & Certified Copies", "Manual / Web")
    Rel(staff, eservices, "Validates Patta extract, Chitta, and FMB sketch", "Manual / Web")
```

---

### 3.2 C4 Level 2: Container Architecture

```mermaid
graph TB
    subgraph Client Tier
        BrowserUser[Browser: Client / Buyer]
        BrowserAdmin[Browser: Advocate & Clerks]
    end

    subgraph Edge CDN & Ingress Layer
        CloudflareEdge[Cloudflare Global Edge Anycast Network]
    end

    subgraph Container 1: Public Web Portal
        AstroApp["Astro 5 Web Platform<br/>(Astro Static + SSR Islands)<br/>Node.js / Cloudflare Pages<br/>Port: 4321 / Live: akspropertychecklist.in"]
    end

    subgraph Container 2: Advocate ERP & Scrutiny Portal
        NextApp["Next.js 15 App Router<br/>(OpenNext Cloudflare Worker Runtime)<br/>Node.js / workerd<br/>Port: 3000 / Live: workers.dev"]
        APIRoutes["Next.js Serverless API Handlers<br/>/api/cases, /api/enquiries, /api/upload"]
    end

    subgraph Container 3: Data & Storage
        D1DB[("Cloudflare D1 Database<br/>'aks-portal-db'<br/>SQLite Engine (APAC)")]
        DocVault[("Document Storage Vault<br/>Cloudflare R2 / Local Disk<br/>PDF, DOCX, Images <= 15MB")]
    end

    BrowserUser -->|HTTPS :443| CloudflareEdge
    BrowserAdmin -->|HTTPS :443| CloudflareEdge

    CloudflareEdge -->|Route: / | AstroApp
    CloudflareEdge -->|Route: /admin, /api, /track| NextApp

    AstroApp -->|POST /api/enquiries| APIRoutes
    NextApp --> APIRoutes
    APIRoutes -->|SQL Transactions| D1DB
    APIRoutes -->|Multi-part Binary Stream| DocVault
```

---

### 3.3 C4 Level 3: Component Architecture (Advocate ERP Engine)

```mermaid
graph TD
    subgraph UI Controller Layer
        P1[Enquiry Inbox Component<br/>admin/enquiries]
        P2[Case Pipeline Component<br/>admin/pipeline]
        P3[Job Card Scrutiny Component<br/>admin/cases/id/job-card]
        P4[Public Tracker Component<br/>track/caseId]
    end

    subgraph Domain Services Layer
        S1[Enquiry Triage Service<br/>Accepts / Rejects / Promotes to Case]
        S2[SOP Stage Engine<br/>8-Stage Progression State Machine]
        S3[Scrutiny & Indexing Engine<br/>EC Matrix, Parent Chain, Revenue Sync]
        S4[Document Vault Engine<br/>Uploads, Mime Validation, Watermarking]
        S5[Financial Accounting Service<br/>80% Advance & 20% Balance Verification]
    end

    subgraph Persistence Gateway
        DBClient["Universal DB Runner (db.ts)<br/>Native D1 Worker Binding / D1 HTTPS REST API / Local SQLite"]
    end

    P1 --> S1
    P2 --> S2
    P3 --> S3
    P3 --> S4
    P2 --> S5
    P4 --> DBClient

    S1 --> DBClient
    S2 --> DBClient
    S3 --> DBClient
    S4 --> DBClient
    S5 --> DBClient
```

---

## 4. Data Architecture & Relational Schema

The data model is engineered in ANSI-SQL and optimized for SQLite under Cloudflare D1. It enforces strict relational integrity with foreign keys, cascading deletions, and comprehensive indexes.

### 4.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ user_sessions : creates
    users ||--o{ enquiries : assigned_to
    enquiries ||--o| cases : converted_to
    cases ||--o{ ec_records : contains
    cases ||--o{ parent_documents : genealogizes
    cases ||--|| revenue_records : verifies
    cases ||--|| legal_opinions : concludes
    cases ||--o{ case_documents : archives
    cases ||--o{ payments : accounts
    cases ||--o{ case_milestone_logs : audits

    users {
        string id PK
        string username UK
        string email UK
        string password_hash
        string full_name
        string role
        string phone
        string bar_council_reg_no
        boolean is_active
        timestamp created_at
    }

    enquiries {
        string id PK
        string client_name
        string client_phone
        string client_email
        string service_package
        string district
        string property_address
        string survey_number
        string source
        string status
        string converted_case_id FK
        timestamp created_at
    }

    cases {
        string id PK
        string source_enquiry_id FK
        string client_name
        string client_phone
        string client_email
        string service_package
        int current_stage
        string district
        string property_address
        string survey_number
        decimal total_fee
        decimal advance_amount
        decimal balance_amount
        string payment_status
        string case_status
        timestamp created_at
        timestamp updated_at
    }

    ec_records {
        string id PK
        string case_id FK
        int serial_no
        string search_period
        string doc_number
        string sro_name
        string deed_nature
        string executant
        string claimant
        boolean is_encumbrance_flag
        string doc_file_name
        string doc_file_url
        string verification_status
    }

    parent_documents {
        string id PK
        string case_id FK
        int sequence_order
        string deed_type
        string doc_number
        string sro_name
        string registration_date
        string seller_name
        string buyer_name
        string extent
        boolean link_verified
        text gap_analysis_notes
        string doc_file_url
    }

    revenue_records {
        string id PK
        string case_id FK
        string current_sale_deed_no
        string patta_number
        string patta_holder_name
        string field_survey_no
        string sub_division
        string village_taluk
        boolean chitta_adangal_verified
        boolean fmb_sketch_verified
        decimal guideline_value
        string patta_file_url
        string chitta_file_url
        string fmb_file_url
    }

    legal_opinions {
        string id PK
        string case_id FK
        string advocate_name
        string bar_council_reg_no
        text root_of_title
        boolean marketable_title_certified
        string encumbrance_status
        text legal_scrutiny_summary
        text special_conditions
        string sign_off_status
        timestamp signed_at
    }

    case_documents {
        string id PK
        string case_id FK
        string file_name
        string file_category
        string storage_path
        bigint file_size_bytes
        string mime_type
        boolean is_watermarked
        timestamp uploaded_at
    }

    payments {
        string id PK
        string case_id FK
        string payment_stage
        decimal amount
        string payment_mode
        string transaction_ref
        string verified_by
        timestamp paid_at
    }

    case_milestone_logs {
        string id PK
        string case_id FK
        int from_stage
        int to_stage
        text action_notes
        string triggered_by
        timestamp logged_at
    }
```

---

## 5. Integration & API Specifications

The platform provides a unified RESTful interface designed for edge execution with full CORS and JSON support.

### 5.1 Endpoints Matrix

| HTTP Method | Route | Description | Auth Required | Runtime / Target |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Authenticates advocate/clerk and generates session token | Public | Edge Worker |
| **GET** | `/api/cases` | Retrieves list of active dockets with filtering | Yes (Session/Cookie) | D1 SQL Edge |
| **POST** | `/api/cases` | Creates new legal case docket directly | Yes (Advocate/Staff) | D1 SQL Edge |
| **GET** | `/api/cases/[id]` | Fetches full case details, ECs, parent deeds, revenue | Public (via token) / Admin | D1 SQL Edge |
| **PATCH**| `/api/cases/[id]` | Advances or rolls back 8-stage SOP milestone | Yes (Advocate/Staff) | D1 SQL Edge |
| **POST** | `/api/cases/[id]/job-card` | Appends individual EC or Parent Deed record | Yes (Advocate/Staff) | D1 SQL Edge |
| **PUT**  | `/api/cases/[id]/job-card` | Upserts Revenue Records (Patta, Chitta, FMB) & Opinion | Yes (Advocate/Staff) | D1 SQL Edge |
| **GET**  | `/api/enquiries` | Lists incoming leads submitted from public website | Yes (Advocate/Staff) | D1 SQL Edge |
| **POST** | `/api/enquiries` | Ingestion endpoint for public web checklist form | Public (CORS Enabled) | D1 SQL Edge |
| **POST** | `/api/enquiries/[id]/accept`| Converts staging enquiry into active Case Docket | Yes (Advocate/Staff) | D1 Transaction |
| **POST** | `/api/upload` | Multipart file upload handler for PDF & Word docs | Yes (Advocate/Staff) | Disk Vault / R2 |
| **GET**  | `/track/[caseId]` | Client self-service live verification status | Public | Edge SSR Page |

---

## 6. Document & Binary File Architecture

Real-world legal diligence requires handling multiple proprietary document formats:
- **PDF Documents (`application/pdf`):** Standard for e-Pattas, certified copies of registered deeds, and Encumbrance Certificates.
- **Word Documents (`.docx`, `.doc`):** The universal drafting format used by legal typists and advocates in Madras High Court and district bar associations for drafting title scrutiny reports, annexures, and formal opinions.
- **Image Scans (`image/jpeg`, `image/png`):** High-resolution photographs of Field Measurement Book (FMB) sketches and ancient settlement registers.

### 6.1 Upload Pipeline & Storage Routing

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Legal Research Staff
    participant UI as Job Card Browser
    participant API as /api/upload
    participant Vault as Storage Vault (Local Disk / R2)
    participant D1 as Cloudflare D1 SQL

    Staff->>UI: Selects file (PDF / DOCX up to 15MB)
    UI->>UI: Validates format & file size constraint (<= 15MB)
    UI->>API: POST multipart/form-data with caseId & category
    API->>API: Sanitizes filename & prepends timestamp
    API->>Vault: Writes binary stream to case directory
    Vault-->>API: Returns storage path (/uploads/caseId/file)
    API->>D1: Inserts metadata into case_documents (filename, mime, size)
    D1-->>API: Transaction committed
    API-->>UI: Returns JSON (storedName, fileUrl, mimeType)
    UI->>UI: Displays Document Format Badge [DOCX] / [PDF]
```

---

## 7. Security, Compliance & Data Governance

1. **Role-Based Access Control (RBAC):**
   - `ADVOCATE_ADMIN`: Advocate A.K. Saravanan. Full rights to assign cases, sign opinions, delete records, adjust agreed fees, and override title clearance.
   - `RESEARCH_STAFF`: Legal clerks and typists. Restricted to indexing EC records, inputting parent deed parameters, uploading revenue files, and drafting findings.
   - `CLIENT / PUBLIC`: Read-only zero-login access strictly scoped to `/track/[caseId]` for their specific case ID.
2. **Document Watermarking & Preview Security:**
   - Previews issued at **Step 7 (Watermarked Preview)** are dynamically stamped with diagonal watermarks: *"CONFIDENTIAL PROVISIONAL PREVIEW — FOR VERIFICATION ONLY — NOT VALID FOR REGISTRATION"*. High-resolution clean legal opinions are only released at **Step 8** upon receipt of the 20% balance payment.
3. **Bar Council of India Ethical Adherence:**
   - In compliance with *Rule 36, Section IV of the Bar Council of India Rules*, the platform does not engage in touting or solicitation. The public web portal provides objective consumer educational checklists, statutory buffer zone parameters, and a voluntary consultation intake gateway.
4. **Credential Isolation & Push Protection:**
   - Cloudflare API tokens and environment secrets are managed via `.env.local` and Cloudflare Secret Management. GitHub Secret Scanning and Push Protection guard against credential exposure.

---

## 8. Deployment & Infrastructure Architecture

```mermaid
graph LR
    subgraph Development Environment
        DevBox["Developer Local Box<br/>Node.js v24.20 / Windows<br/>C:\aks-property-portal"]
        LocalDisk["Local Uploads Vault<br/>public/uploads/"]
    end

    subgraph GitHub Source Control
        GitRepo["GitHub Repository<br/>branch: main<br/>Push Protection Active"]
    end

    subgraph Production Cloudflare Edge
        WorkerBuild["OpenNext Compiler<br/>opennextjs-cloudflare"]
        ProdWorker["Cloudflare Worker<br/>aks-property-portal.workers.dev<br/>Memory: 128MB / Time: 50ms"]
        ProdD1["Cloudflare D1<br/>aks-portal-db<br/>Region: APAC (Singapore)"]
        ProdAssets["Cloudflare Static Assets<br/>Binding: env.ASSETS"]
    end

    DevBox -->|Reads & Writes| LocalDisk
    DevBox -->|Direct HTTPS REST Queries| ProdD1
    DevBox -->|git push (Approved)| GitRepo
    GitRepo -->|Trigger Deploy| WorkerBuild
    WorkerBuild --> ProdWorker
    ProdWorker --> ProdD1
    ProdWorker --> ProdAssets
```

### 8.1 Production Environment Manifest

| Resource Component | Identifier / Binding | Hosting Environment | Region |
| :--- | :--- | :--- | :--- |
| **Web Framework** | Next.js 15.5.28 (App Router) | Cloudflare Workers (`workerd`) | Global Edge |
| **Build Wrapper** | `@opennextjs/cloudflare` v1.20 | OpenNext Serverless Pipeline | Local / CI |
| **Relational Database** | `env.DB` (`aks-portal-db`) | Cloudflare D1 Distributed SQLite | Asia-Pacific (APAC) |
| **Database UUID** | `c987d1f0-a579-4e4c-8482-36482bebfd7f` | Cloudflare Serverless Engine | APAC / Singapore Colo |
| **Static Assets CDN** | `env.ASSETS` | Cloudflare Global CDN | Edge (300+ Cities) |
| **Account Reference** | `c4806076a4b169eb610eb15cc0fbaee4` | Cloudflare Enterprise Account | Global |

---

## 9. Non-Functional Requirements (NFRs) & Quality Attributes

| Attribute | Specification | Implementation Strategy |
| :--- | :--- | :--- |
| **Edge Response Latency** | $< 80\text{ ms}$ for 95th percentile | OpenNext server-side rendering directly in V8 isolates on edge nodes. |
| **Database Query Speed** | $< 15\text{ ms}$ for relational lookups | Distributed D1 SQLite with composite indexes on `case_id`, `client_phone`, `current_stage`. |
| **File Processing Limit** | Up to $15\text{ MB}$ per file | Streaming multi-part payload parser handling PDF, DOCX, and high-res imagery. |
| **Availability (SLA)** | $99.9\%$ monthly uptime | Multi-zone Cloudflare Edge infrastructure with automated health monitoring. |
| **Recovery Point (RPO)** | $< 15\text{ minutes}$ | Automated point-in-time recovery via Cloudflare D1 continuous replication. |
| **Recovery Time (RTO)** | $< 1\text{ hour}$ | Declarative IaC (`wrangler.toml`) + Liquibase ANSI-SQL schema migrations. |

---

## 10. Technology Stack Summary

```
========================================================================================
APPLICATION LAYER:        Next.js 15 (React 19, TypeScript 5.7, Tailwind CSS 3.4)
PUBLIC WEB LAYER:         Astro 5 (Static Site Generation, Tailwind CSS, Island Arch)
RUNTIME ENVIRONMENT:      Cloudflare Workers (workerd / V8 Engine)
COMPILATION FRAMEWORK:    OpenNext (@opennextjs/cloudflare v1.20)
RELATIONAL DATABASE:      Cloudflare D1 (Serverless Distributed SQLite Engine)
BINARY DOCUMENT STORAGE:  Cloudflare R2 Object Store / Local Multi-Part Disk Vault
VERSION CONTROL:          Git (GitHub Private Repository with Push Protection)
OPERATING SYSTEM DEV:     Windows PowerShell (Node.js v24.20 LTS)
========================================================================================
```

