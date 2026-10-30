'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  ShieldCheck, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  IndianRupee, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { TAMIL_NADU_DISTRICTS } from '@/lib/constants';

export default function NewCasePage() {
  const router = useRouter();

  // Form Fields
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    propertyAddress: '',
    district: 'Coimbatore',
    surveyNumber: '',
    servicePackage: 'Legal Opinion (Standard)',
    totalFee: 6500,
    advancePaid: 5200, // 80%
    paymentRef: '',
    notes: '',
  });

  // Validation States
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  // Validate single field on blur or change
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'clientName':
        if (!value || value.trim().length < 2) {
          return 'Client full name is required (minimum 2 characters).';
        }
        return null;
      case 'clientPhone': {
        const clean = value.replace(/[^0-9]/g, '');
        if (!clean || clean.length < 10) {
          return 'Enter a valid 10-digit mobile number (e.g. 9840012345).';
        }
        return null;
      }
      case 'clientEmail':
        if (value && value.trim().length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value.trim())) {
            return 'Please enter a valid email address (e.g. client@example.com).';
          }
        }
        return null;
      case 'district':
        if (!value || value.trim().length === 0) {
          return 'Please select a Tamil Nadu district.';
        }
        return null;
      case 'surveyNumber':
        if (!value || value.trim().length < 2) {
          return 'Survey number or Door/Flat no. is required for title scrutiny.';
        }
        return null;
      case 'totalFee':
        if (!value || Number(value) <= 0) {
          return 'Total agreed fee must be greater than zero.';
        }
        return null;
      case 'advancePaid':
        if (value === undefined || Number(value) < 0) {
          return 'Advance amount cannot be negative.';
        }
        if (Number(value) > Number(formData.totalFee)) {
          return 'Advance cannot exceed the total agreed fee.';
        }
        return null;
      default:
        return null;
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error as user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (generalError) setGeneralError(null);
  };

  const handlePackageChange = (pkg: string) => {
    let fee = 6500;
    if (pkg === 'Title Search Report') fee = 4500;
    if (pkg === 'Comprehensive Due Diligence') fee = 12500;
    setFormData((prev) => ({
      ...prev,
      servicePackage: pkg,
      totalFee: fee,
      advancePaid: Math.round(fee * 0.8),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Validate all fields before submission
    const errors: Record<string, string> = {};
    const nameErr = validateField('clientName', formData.clientName);
    if (nameErr) errors.clientName = nameErr;

    const phoneErr = validateField('clientPhone', formData.clientPhone);
    if (phoneErr) errors.clientPhone = phoneErr;

    const emailErr = validateField('clientEmail', formData.clientEmail);
    if (emailErr) errors.clientEmail = emailErr;

    const districtErr = validateField('district', formData.district);
    if (districtErr) errors.district = districtErr;

    const surveyErr = validateField('surveyNumber', formData.surveyNumber);
    if (surveyErr) errors.surveyNumber = surveyErr;

    const feeErr = validateField('totalFee', formData.totalFee);
    if (feeErr) errors.totalFee = feeErr;

    const advErr = validateField('advancePaid', formData.advancePaid);
    if (advErr) errors.advancePaid = advErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError('Please correct the highlighted fields before submitting.');
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: formData.clientName.trim(),
          client_phone: formData.clientPhone.trim(),
          client_email: formData.clientEmail.trim() || null,
          service_package: formData.servicePackage,
          district: formData.district,
          property_address: formData.propertyAddress.trim(),
          survey_number: formData.surveyNumber.trim(),
          total_fee: formData.totalFee,
          advance_amount: formData.advancePaid,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server rejected case creation.');
      }

      // Success: Show confirmation modal with direct links
      setCreatedCaseId(data.caseId);
    } catch (err: any) {
      console.error('Case creation exception:', err);
      setGeneralError(err.message || 'Failed to connect to database. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pipeline"
            className="p-2.5 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 dark:text-slate-400 dark:hover:text-white dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 rounded-xl transition shadow-xs"
            title="Return to Case Pipeline"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              New Legal Docket Intake
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Initiate Stage 1 (Enquiry) and register property verification requirements in the database.
            </p>
          </div>
        </div>

        <Link
          href="/admin/pipeline"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 self-start sm:self-center"
        >
          <span>View All Active Cases</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* SUCCESS CONFIRMATION MODAL / BANNER */}
      {createdCaseId && (
        <div className="bg-emerald-50 dark:bg-gradient-to-br dark:from-emerald-950/60 dark:to-slate-900 border border-emerald-200 dark:border-emerald-500/60 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 animate-in fade-in zoom-in duration-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Case Successfully Created in Database
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Docket Assigned: <span className="font-mono text-blue-700 dark:text-blue-400">{createdCaseId}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Matter has been registered for <strong className="text-slate-900 dark:text-white">{formData.clientName}</strong> in{' '}
                <strong className="text-slate-900 dark:text-white">{formData.district}</strong>. Initial audit log has been saved, and the case is ready for 30-year EC and Parent Deed indexing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/admin/cases/${createdCaseId}/job-card`}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Open Job Card Workspace &rarr;</span>
            </Link>

            <Link
              href="/admin/pipeline"
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition flex items-center gap-2 shadow-xs"
            >
              <span>Go to Case Pipeline</span>
            </Link>

            <button
              onClick={() => {
                setCreatedCaseId(null);
                setFormData({
                  clientName: '',
                  clientPhone: '',
                  clientEmail: '',
                  propertyAddress: '',
                  district: 'Coimbatore',
                  surveyNumber: '',
                  servicePackage: 'Legal Opinion (Standard)',
                  totalFee: 6500,
                  advancePaid: 5200,
                  paymentRef: '',
                  notes: '',
                });
              }}
              className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-semibold"
            >
              + Create Another Case
            </button>
          </div>
        </div>
      )}

      {/* ERROR SUMMARY ALERT BANNER */}
      {generalError && (
        <div className="bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/40 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-rose-800 dark:text-rose-300 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">Unable to Submit Case Form</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">{generalError}</p>
          </div>
        </div>
      )}

      {/* MAIN INTAKE FORM */}
      {!createdCaseId && (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Section 1: Client Information */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <span>Client Identification</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">* Required fields</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-700 dark:text-slate-200 mb-1.5">
                  Client Full Name <span className="text-blue-600 dark:text-blue-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Senthil Kumar R."
                    value={formData.clientName}
                    onChange={(e) => handleFieldChange('clientName', e.target.value)}
                    onBlur={() => {
                      const err = validateField('clientName', formData.clientName);
                      if (err) setFieldErrors(prev => ({ ...prev, clientName: err }));
                    }}
                    className={`w-full bg-white dark:bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 shadow-xs focus:outline-none transition-all ${
                      fieldErrors.clientName
                        ? 'border-rose-500 bg-rose-500/5 focus:border-rose-500 ring-1 ring-rose-500/40'
                        : formData.clientName.trim().length >= 2
                        ? 'border-emerald-500/50 focus:border-emerald-400'
                        : 'border-slate-200 dark:border-slate-800 focus:border-blue-500'
                    }`}
                  />
                </div>
                {fieldErrors.clientName && (
                  <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.clientName}</span>
                  </p>
                )}
              </div>

              {/* Client Mobile / WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Mobile / WhatsApp Number <span className="text-blue-600 dark:text-blue-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    placeholder="e.g. 98400 12345"
                    value={formData.clientPhone}
                    onChange={(e) => handleFieldChange('clientPhone', e.target.value)}
                    onBlur={() => {
                      const err = validateField('clientPhone', formData.clientPhone);
                      if (err) setFieldErrors(prev => ({ ...prev, clientPhone: err }));
                    }}
                    className={`w-full bg-white dark:bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 shadow-xs focus:outline-none transition-all ${
                      fieldErrors.clientPhone
                        ? 'border-rose-500 bg-rose-500/5 focus:border-rose-500 ring-1 ring-rose-500/40'
                        : formData.clientPhone.replace(/[^0-9]/g, '').length >= 10
                        ? 'border-emerald-500/50 focus:border-emerald-400'
                        : 'border-slate-200 dark:border-slate-800 focus:border-blue-500'
                    }`}
                  />
                </div>
                {fieldErrors.clientPhone && (
                  <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.clientPhone}</span>
                  </p>
                )}
              </div>

              {/* Client Email */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Client Email Address <span className="text-slate-500">(Optional for digital dispatch)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={formData.clientEmail}
                    onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
                    onBlur={() => {
                      const err = validateField('clientEmail', formData.clientEmail);
                      if (err) setFieldErrors(prev => ({ ...prev, clientEmail: err }));
                    }}
                    className={`w-full bg-white dark:bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 shadow-xs focus:outline-none transition-all ${
                      fieldErrors.clientEmail
                        ? 'border-rose-500 bg-rose-500/5 focus:border-rose-500'
                        : 'border-slate-200 dark:border-slate-800 focus:border-blue-500'
                    }`}
                  />
                </div>
                {fieldErrors.clientEmail && (
                  <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.clientEmail}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Property & Revenue Location */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <span>Property Schedule & Revenue Particulars</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* District */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  District (Tamil Nadu) <span className="text-blue-600 dark:text-blue-400">*</span>
                </label>
                <select
                  value={formData.district}
                  onChange={(e) => handleFieldChange('district', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white shadow-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {TAMIL_NADU_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {fieldErrors.district && (
                  <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.district}</span>
                  </p>
                )}
              </div>

              {/* Survey Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Survey No. / T.S. No. / Flat No. <span className="text-blue-600 dark:text-blue-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. S.F. No. 142/3A, Plot 4"
                    value={formData.surveyNumber}
                    onChange={(e) => handleFieldChange('surveyNumber', e.target.value)}
                    onBlur={() => {
                      const err = validateField('surveyNumber', formData.surveyNumber);
                      if (err) setFieldErrors(prev => ({ ...prev, surveyNumber: err }));
                    }}
                    className={`w-full bg-white dark:bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 shadow-xs focus:outline-none transition-all ${
                      fieldErrors.surveyNumber
                        ? 'border-rose-500 bg-rose-500/5 focus:border-rose-500 ring-1 ring-rose-500/40'
                        : 'border-slate-200 dark:border-slate-800 focus:border-blue-500'
                    }`}
                  />
                </div>
                {fieldErrors.surveyNumber && (
                  <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.surveyNumber}</span>
                  </p>
                )}
              </div>

              {/* Full Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Village, Taluk & Detailed Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Saravanampatti Village, Coimbatore North Taluk, near KGISL Tech Park"
                  value={formData.propertyAddress}
                  onChange={(e) => handleFieldChange('propertyAddress', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white shadow-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Legal Scope & Statutory 80/20 Fee Calculation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <span>Service Package &amp; 80% Advance Calculation</span>
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">Auto-calculated</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Package Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Service Tier
                </label>
                <select
                  value={formData.servicePackage}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white shadow-xs focus:outline-none focus:border-blue-500 transition-colors font-semibold"
                >
                  <option value="Legal Opinion (Standard)">Legal Opinion (Standard)</option>
                  <option value="Title Search Report">Title Search Report</option>
                  <option value="Comprehensive Due Diligence">Comprehensive Due Diligence</option>
                </select>
              </div>

              {/* Total Fee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Total Agreed Fee (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="number"
                    value={formData.totalFee}
                    onChange={(e) => {
                      const newFee = Number(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        totalFee: newFee,
                        advancePaid: Math.round(newFee * 0.8),
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              {/* 80% Advance Fee */}
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1.5">
                  80% Advance Fee (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-amber-400 absolute left-3.5 top-3" />
                  <input
                    type="number"
                    value={formData.advancePaid}
                    onChange={(e) => handleFieldChange('advancePaid', Number(e.target.value))}
                    className="w-full w-full bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-500/40 rounded-xl pl-9 pr-4 py-2.5 text-xs text-blue-800 dark:text-blue-300 focus:outline-none focus:border-blue-500 font-bold shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Visual Fee Reconciliation Box */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  Balance Payable on Final Delivery (Step 7/8):{' '}
                  <strong className="text-slate-900 dark:text-white font-bold">
                    ₹{Math.max(0, formData.totalFee - formData.advancePaid).toLocaleString()}
                  </strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                80% Advance unlocks 30-Year EC Indexing &amp; Scrutiny
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/admin/pipeline"
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-xs"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Creating Docket...' : 'Create Case & Open Docket'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
