"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, ShieldCheck, User, Phone, Mail, MapPin, IndianRupee, FileText } from "lucide-react";
import { TAMIL_NADU_DISTRICTS } from "@/lib/constants";

export default function NewCasePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    propertyAddress: "",
    district: "Chennai",
    surveyNumber: "",
    servicePackage: "Legal Opinion (Standard)",
    totalFee: 6500,
    advancePaid: 5200, // 80%
    paymentRef: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);

  const handlePackageChange = (pkg: string) => {
    let fee = 6500;
    if (pkg === "Title Search Report") fee = 4500;
    if (pkg === "Comprehensive Due Diligence") fee = 12500;
    setFormData((prev) => ({
      ...prev,
      servicePackage: pkg,
      totalFee: fee,
      advancePaid: Math.round(fee * 0.8),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      // In production this writes to database/API; for demo we route to the active job card
      router.push("/admin/cases/AK-2026-003/job-card");
    }, 700);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">New Legal Opinion Case Intake</h1>
            <p className="text-sm text-slate-400">Initiate Stage 1 (Enquiry) & Stage 2/3 (Discovery & 80% Advance)</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-semibold border-b border-slate-800 pb-3">
            <User className="w-5 h-5" />
            <span>1. Client Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Client Full Name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Ramesh Kumar S."
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp / Phone Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  required
                  type="tel"
                  placeholder="+91 98400 12345"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  required
                  type="email"
                  placeholder="client@gmail.com"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-semibold border-b border-slate-800 pb-3">
            <MapPin className="w-5 h-5" />
            <span>2. Property Particulars</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">District (Tamil Nadu) *</label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {TAMIL_NADU_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Survey No. / Flat No. *</label>
              <input
                required
                type="text"
                placeholder="e.g. S.F. No. 428/2A, Flat 3B"
                value={formData.surveyNumber}
                onChange={(e) => setFormData({ ...formData, surveyNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Detailed Property Address / Location</label>
              <textarea
                rows={2}
                placeholder="Village / Taluk, Layout Name, Landmark..."
                value={formData.propertyAddress}
                onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Commercial & 80% Advance Terms */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-semibold border-b border-slate-800 pb-3">
            <IndianRupee className="w-5 h-5" />
            <span>3. Commercials & 80% Advance Policy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Service Tier</label>
              <select
                value={formData.servicePackage}
                onChange={(e) => handlePackageChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Legal Opinion (Standard)">Legal Opinion (Standard)</option>
                <option value="Title Search Report">Title Search Report</option>
                <option value="Comprehensive Due Diligence">Comprehensive Due Diligence</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Total Agreed Fee (₹)</label>
              <input
                type="number"
                value={formData.totalFee}
                onChange={(e) => setFormData({ ...formData, totalFee: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">80% Advance Required (₹)</label>
              <input
                type="number"
                value={formData.advancePaid}
                onChange={(e) => setFormData({ ...formData, advancePaid: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-200 font-medium">Standard Operating Procedure Reminder:</span>{" "}
              Stage 4 (Job Card EC & Deed Indexing) is triggered once the 80% advance is received. The remaining 20% balance is collected after the watermarked provisional draft is shared in Stage 7.
            </div>
          </div>
        </div>

        {/* Initial Intake Notes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-semibold border-b border-slate-800 pb-3">
            <FileText className="w-5 h-5" />
            <span>4. Initial Documents / Client Request Notes</span>
          </div>

          <div>
            <textarea
              rows={3}
              placeholder="e.g. Client shared Sale Deed copies from 2018; EC requested for 34 years from SRO Tambaram; Bank loan approval requirement..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/admin"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-sm shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Generating Case..." : "Generate Case & Open Job Card"}
          </button>
        </div>
      </form>
    </div>
  );
}
