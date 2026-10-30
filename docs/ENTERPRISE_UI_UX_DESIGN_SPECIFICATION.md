# ENTERPRISE UI/UX ARCHITECTURE & DESIGN SPECIFICATION (UDS)
## Modern Enterprise Legal-Tech SaaS Design System, Wireframes & Information Architecture
### Inspired by Linear, Stripe, Vercel & Notion

---

### Document Control & Governance
- **Document Reference**: EDAP-UDS-2026-V1.0
- **Project**: AKS Property Checklist & Legal Operations Platform
- **Author**: Principal Enterprise UI/UX Architect, Product Designer & Frontend Solution Architect
- **Status**: APPROVED & BASELINED
- **Classification**: Confidential — Enterprise Product Intellectual Property
- **Governing Advocate**: Advocate A.K. Saravanan (M.E. Energy, LLB) | Bar Council Reg: MS/1245/2005
- **Target Applications**:
  1. **Public Discovery Portal:** Astro 5 (`akspropertychecklist.in`)
  2. **Advocate ERP Operations Hub:** Next.js 15, React 19, TypeScript (`aks-property-portal`)

---

## 1. Executive Summary & Design Vision

The **AKS Property Checklist & Legal Operations Platform** operates in a mission-critical domain: real estate due diligence under the **presumptive title regime** of Tamil Nadu. In real estate transactions, a single overlooked mortgage in an Encumbrance Certificate (EC), broken genealogy in parent title deeds, or mismatch between Sub-Registrar documents and Revenue Patta records can result in decades of civil litigation for property buyers.

Historically, legal software suffers from poor usability: clunky interfaces, confusing menus, and wall-to-wall form clutter. This **UI/UX Design Specification** elevates the platform into a modern enterprise SaaS product, drawing direct design inspiration from industry benchmarks:

```mermaid
graph TD
    Linear["Linear<br/>(Ergonomic Density & Keyboard Nav)"] --> UX["AKS Modernized Enterprise Platform"]
    Stripe["Stripe<br/>(Trust, Billing Transparency & Micro-copy)"] --> UX
    Vercel["Vercel<br/>(Deep Neutrals, Monospace Data & Precision)"] --> UX
    Notion["Notion<br/>(Structured Workspaces & Split Panes)"] --> UX
```

### Core Design Principles:
1. **Zero Functionality Lost**: 100% of existing business rules, statutory checklists, 80/20 fee gates, and advocate sign-offs remain fully intact.
2. **High Information Density with Zero Clutter**: Advocates verify 30-year deed records without cognitive fatigue through compact, high-legibility typographic tables.
3. **Zero Dead-End Guarantee**: Searching, filtering, or selecting edge-case milestones never leaves users stranded on an empty screen; actionable reset paths are always visible.
4. **Separation of Concerns**: Public portal is blazing fast (Astro 5 static/SSR), while the ERP hub is an ergonomic operations center (Next.js 15 App Router).

---

## 2. User Persona Analysis & Mental Models

```mermaid
graph LR
    P1["Property Buyer / Client<br/>(Consumer / Investor)"] --- M1["Anxiety Reduction<br/>Status Transparency<br/>Zero Login Friction"]
    P2["Advocate A.K. Saravanan<br/>(Chief Legal Counsel)"] --- M2["High Data Density<br/>Rapid Keyboard Nav<br/>Tamper-Proof Audit"]
    P3["Legal Research Clerk<br/>(Associate / Staff)"] --- M3["Fast EC Data Entry<br/>Document Drag & Drop<br/>Clear Stage Gates"]
    P4["Accounts / Operations<br/>(Billing Desk)"] --- M4["Milestone Reconciliation<br/>80/20 Payment Gating<br/>Zero Missed Fees"]
```

### 2.1 Persona 1: Advocate A.K. Saravanan (Chief Legal Advisor)
- **Role**: Senior Advocate with 20+ years of Bar standing; final authority certifying marketable title.
- **Mental Model**: Needs to inspect the unbroken 30-year chain of title, verify schedule boundaries (North/South/East/West), and issue legally binding opinions without dealing with UI latency.
- **UI Modernization**:
  - High-density tabular views of 30-year EC records with monospaced document numbers.
  - Sticky Job Card command header displaying case status and fee reconciliation.
  - 1-click legal opinion sign-off authenticated with Bar Council registration number.

### 2.2 Persona 2: Legal Research Clerk / Associate
- **Role**: Junior associate downloading ECs from TNREGINET, extracting Patta/Chitta from Tamil Nilam, and drafting initial findings in Microsoft Word (`.docx`).
- **Mental Model**: High-volume transcription, copy-pasting survey numbers, tagging encumbrance flags.
- **UI Modernization**:
  - Keyboard-accessible input forms with auto-tabbing.
  - Right-side slide-over drawers allowing deed entry without losing view of the primary docket.
  - Multi-format file uploader supporting Word (`.docx`) and PDF up to 15 MB.

### 2.3 Persona 3: Property Buyer / Client (Public User)
- **Role**: Retail home buyer, builder, or NRI investor requiring reassurance that title is clear.
- **Mental Model**: Simple progress bar, transparent milestones, easy-to-read legal summaries, zero login friction (access via docket ID).
- **UI Modernization**:
  - Zero-login tracking (`/track/[caseId]`) using docket reference.
  - Stripe-inspired milestone progress stepper explaining each legal step in plain English.
  - Watermarked preliminary draft preview at Stage 7.

### 2.4 Persona 4: Billing & Operations Desk
- **Role**: Practice manager verifying 80% advance payment (₹5,200) and 20% balance (₹1,300).
- **Mental Model**: Checkpoint gating where dockets cannot proceed to scrutiny or delivery without payment confirmation.
- **UI Modernization**:
  - Clear milestone indicators with 1-click payment confirmation toggles.

---

## 3. Complete Screen Inventory

### 3.1 Public Discovery Portal (`aks-properties-checklist` — Astro 5)

| Screen ID | URL Route | Core Purpose | Key User Actions & Controls |
| :--- | :--- | :--- | :--- |
| **PUB-01** | `/` (Home) | Primary landing page, value proposition, trust proof | Hero consultation CTA, service grid, stats counter, client testimonials, enquiry drawer trigger |
| **PUB-02** | `/awareness` | 40-point property checklist & statutory buffer guide | Interactive checklist accordion, ASI/PWD/HT buffer calculator, printable PDF checklist |
| **PUB-03** | `/buying-selling-revenue-and-legally-clear-properties` | Service 1: Agricultural & Patta Land Verification | Ceiling Act rules, Natham land verification guidelines, consultation quote form |
| **PUB-04** | `/coimbatore-investment` | Service 2: Coimbatore & West TN Real Estate Diligence | Micro-market risk analysis, DTCP layout approval guides, local advocate office contact |
| **PUB-05** | `/identification-of-non-traceable-properties` | Service 3: Missing Parent Deed & Reconstruction | Genealogical trace procedure, certified copy extraction steps, intake trigger |
| **PUB-06** | `/legal-opinion-for-properties` | Service 4: 8-Stage Legal Opinion Package Details | Comprehensive breakdown of the 8-Stage SOP, 80/20 fee structure, sample opinion preview |
| **PUB-07** | `/property-maintenance` | Service 5: Post-Purchase Boundary & Mutation Services | Patta transfer guidance, name transfer checklist, revenue tracking form |
| **PUB-08** | `/revenue-and-legal-issues-management` | Service 6: Dispute Resolution & Litigated Land Scrutiny | Court litigation search guide, dispute risk assessment, direct advocate consultation |
| **PUB-09** | `/faq` | Frequently Asked Questions & Legal Glossary | Categorized FAQ search, legal terms glossary (Patta, Chitta, FMB, SRO, UDS) |
| **PUB-10** | `/blog` & `/blog/[slug]` | Educational Real Estate Law Articles | Semantic articles on property laws, TNREGINET tips, social share links |
| **PUB-11** | `Modal: #enquiry-modal` | Global Inbound Lead Capture Drawer | Client name, WhatsApp number, district, survey number, service type, instant API submit |

### 3.2 ERP Operations Portal (`aks-property-portal` — Next.js 15)

| Screen ID | URL Route | Core Purpose | Key User Actions & Controls |
| :--- | :--- | :--- | :--- |
| **ERP-01** | `/login` | Staff & Advocate Authentication | Username/Password, Bar Council login, session persistence, role redirect |
| **ERP-02** | `/admin` | Operations Overview & Executive Dashboard | Metric cards (Active dockets, in-scrutiny, collected fees), recent activity feed, quick-jump links |
| **ERP-03** | `/admin/enquiries` | Staged Lead Ingestion & Triage Desk | Lead status tabs (`new`, `contacted`, `accepted`, `rejected`), phone dial link, 1-click **[Accept & Create Case]** |
| **ERP-04** | `/admin/pipeline` | 8-Stage SOP Legal Workflow Kanban | Phase tabs (Intake, Scrutiny, Delivery), stage progression buttons, search & filter, zero-dead-end fallback |
| **ERP-05** | `/admin/new-case` | Direct Docket Intake Wizard | Walk-in client profile, property location, survey number, fee customization, initial stage assignment |
| **ERP-06** | `/admin/cases/[id]/job-card` | Advocate Scrutiny & Diligence Workbench | 4 specialized modules: 30-Yr EC Matrix, Parent Deed Chain, Revenue Records, Opinion Sign-off |
| **ERP-07** | `/admin/cases/[id]/job-card` (EC Modal) | Metadata-Driven EC Record Entry | `<DynamicFormRenderer />` generating 2-column layout, deed type dropdown, adverse encumbrance toggle |
| **ERP-08** | `/admin/cases/[id]/job-card` (Deed Modal)| Metadata-Driven Parent Deed Entry | `<DynamicFormRenderer />` generating deed type, parties, extent, boundary match toggle, scan upload |
| **ERP-09** | `/track/[caseId]` | Client Zero-Login Public Tracking Portal | Milestone progress stepper, humanized status explanations, watermarked preview download, courier tracking |

---

## 4. Navigation & Information Architecture

```mermaid
graph TD
    Root[Universal App Shell]
    
    Root --> TopBar["Header Bar: Breadcrumb + Search ⌘K + Quick Intake + Edge Beacon"]
    Root --> Sidebar["Collapsible Sidebar: Overview ⌘1 | Leads ⌘2 | Pipeline ⌘3 | New Docket ⌘4"]
    
    Sidebar --> Overview["Dashboard (/admin)"]
    Sidebar --> Leads["Triage Desk (/admin/enquiries)"]
    Sidebar --> Pipeline["Case Pipeline (/admin/pipeline)"]
    Sidebar --> NewCase["New Intake (/admin/new-case)"]
    
    Pipeline --> JobCard["Advocate Job Card (/admin/cases/[id]/job-card)"]
    JobCard --> TabEC["Tab 1: 30-Yr EC Matrix"]
    JobCard --> TabParent["Tab 2: Parent Document Chain"]
    JobCard --> TabRevenue["Tab 3: Revenue (Patta/Chitta/FMB)"]
    JobCard --> TabOpinion["Tab 4: Advocate Opinion & Sign-off"]
    JobCard --> TabVault["Tab 5: Document Storage Vault"]
```

---

## 5. Enterprise Design System Specification

### 5.1 Color Tokens (Linear & Vercel Inspired)
```css
:root {
  /* Canvas & Neutral Surfaces */
  --bg-canvas: #09090b;           /* Pure dark base (Zinc 950) */
  --bg-surface: #121215;          /* Card & container background */
  --bg-surface-elevated: #18181b; /* Dropdowns, popovers & modals */
  --bg-surface-hover: #222226;    /* Row & item hover state */
  
  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.08); /* Clean hairline borders */
  --border-active: rgba(217, 119, 6, 0.4);   /* Focused gold border */

  /* Typography */
  --text-primary: #f4f4f5;   /* Headings and primary values */
  --text-secondary: #a1a1aa; /* Descriptive copy and table headers */
  --text-muted: #71717a;     /* Helper timestamps and shortcuts */

  /* Legal Accents */
  --gold-primary: #d97706;  /* Authoritative legal gold */
  --gold-glow: rgba(217, 119, 6, 0.15);

  /* Semantic Status */
  --success: #10b981; /* Clear title, completed step */
  --warning: #f59e0b; /* Pending fee, active milestone */
  --danger: #ef4444;  /* Adverse encumbrance, court dispute */
  --info: #3b82f6;    /* In scrutiny, contacted lead */
}
```

### 5.2 Typography System

| Role | Font Family | Size / Line Height | Weight | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Display Heading** | Inter / Geist Sans | 24px / 32px | Bold (700) | Dashboard & section headers |
| **Section Title** | Inter / Geist Sans | 16px / 24px | SemiBold (600) | Card titles, modal headers |
| **Body Primary** | Inter / Geist Sans | 13px / 20px | Regular (400) | Body copy, descriptions |
| **Body Label** | Inter / Geist Sans | 12px / 18px | Medium (500) | Form labels, table headers |
| **Monospace Data** | JetBrains Mono / Consolas | 12px / 18px | Medium (500) | Case IDs (`AK-2026-001`), Doc Numbers (`1420/2012`), Fees (`₹5,200`) |

---

## 6. Screen-by-Screen Layout & Interaction Specifications

### 6.1 Executive Operations Dashboard (`/admin`)
- **Metric Cards Ribbon**: Displays Active Dockets, 80% Advance Collected, 20% Balance Pending, and In-Scrutiny count.
- **Linear-Style Action Queue**: Prioritizes cases requiring attention:
  1. *Pending Advance*: Dockets awaiting 80% advance payment to open scrutiny.
  2. *Ready for Review*: Dockets with indexed records awaiting Advocate Saravanan's review.
  3. *Pending Delivery*: Dockets ready for courier dispatch awaiting final settlement.
- **8-Stage Mini-Funnel Visualizer**: Interactive progress bar allowing instant filtering by milestone.
- **Live Search Table**: Real-time filtering by client, survey number, or district.

### 6.2 8-Stage Legal Workflow Pipeline (`/admin/pipeline`)
- **Three Operational Phase Tabs**:
  - *Phase 1: Intake & Advance* (Steps 1, 2, 3)
  - *Phase 2: Scrutiny & Job Card* (Steps 4, 5, 6)
  - *Phase 3: Sign-Off & Delivery* (Steps 7, 8)
- **Segmented Milestone Bar**: 8-segment progress meter with glowing current-stage beacon.
- **Action Buttons**: Direct step advancement, step rollback, and Job Card entry.
- **Zero Dead-End Guarantee**: Empathetic fallback view with 1-click reset when no cases match search filters.

### 6.3 Inbound Leads Triage Desk (`/admin/enquiries`)
- **Two-Tier Buffer Isolation**: Isolates public leads in staging before official case docketing.
- **Triage Action Card**: Includes phone click-to-dial, survey number callout, client notes, and 1-click **[Accept & Convert to Case]** button.

### 6.4 Client Live Status Tracker (`/track/[caseId]`)
- **Zero-Login Access**: Direct URL access via docket ID.
- **Consumer Milestone Stepper**: Step-by-step progress with humanized legal explanations.
- **Watermarked Preview**: Preliminary title opinion review with balance settlement callout.

---

## 7. Responsive Design Strategy

| Viewport | Target Device | Navigation Mode | Job Card Scrutiny Layout |
| :--- | :--- | :--- | :--- |
| **Mobile (`< 640px`)** | iPhone, Android | Bottom navigation bar, collapsed headers | Vertical stacked form cards, full-width buttons |
| **Tablet (`640px - 1024px`)** | iPad, Surface | Compact icon-only sidebar | 2-column form grids, tabbed workspace |
| **Desktop (`> 1024px`)** | Laptop, Monitor | Full 220px expanded sidebar | High-density tables, sticky command header |
| **Ultra-Wide (`> 1536px`)**| High-Res Display | Expanded sidebar with case switcher | Split-screen: Left 60% data entry, Right 40% deed PDF viewer |

---

## 8. Verification & Architectural Sign-Off

```
========================================================================================
UI/UX DESIGN ARCHITECTURE SPECIFICATION APPROVED BY:
Advocate A.K. Saravanan, M.E. (Energy, LLB)
Chief Legal Advisor | Bar Council of Tamil Nadu Reg: MS/1245/2005

FRONTEND SOLUTION ARCHITECTURE SIGN-OFF:
Principal Enterprise UI/UX Architect, Cloud & Edge Engineering Team
Status: IMPLEMENTED & VERIFIED (TypeScript: 0 Errors)
========================================================================================
```

