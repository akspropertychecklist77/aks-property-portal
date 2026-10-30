'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Inbox, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  PhoneCall, 
  ArrowRight, 
  Filter, 
  MapPin, 
  Tag, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Check, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles
} from 'lucide-react';
import { ClientEnquiry, EnquiryStatus } from '@/lib/types';

export default function EnquiriesInboxPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'contacted' | 'accepted' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (actionSuccess || actionError) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
        setActionError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess, actionError]);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enquiries');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEnquiries(data.data);
      }
    } catch (err) {
      console.error('Failed to load enquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleAcceptToCase = async (enquiry: any) => {
    if (!confirm(`Promote enquiry from "${enquiry.client_name}" to an official Active Legal Case (Stage 1)?`)) {
      return;
    }

    setAcceptingId(enquiry.id);
    setActionSuccess(null);
    setActionError(null);

    try {
      const res = await fetch(`/api/enquiries/${enquiry.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handler_name: 'Advocate A.K. Saravanan Legal Desk',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccess(`✓ Enquiry successfully promoted to official Case ${data.caseId}!`);
        setEnquiries(prev =>
          prev.map(item =>
            item.id === enquiry.id
              ? { ...item, status: 'accepted', converted_case_id: data.caseId }
              : item
          )
        );
      } else {
        setActionError(`Failed to promote enquiry: ${data.error || 'Server rejected request.'}`);
      }
    } catch (err: any) {
      setActionError(`Error promoting enquiry: ${err.message || 'Network exception.'}`);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: EnquiryStatus) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(`✓ Enquiry status updated to "${newStatus}".`);
        setEnquiries(prev =>
          prev.map(item => (item.id === id ? { ...item, status: newStatus } : item))
        );
      } else {
        setActionError(`Status update failed: ${data.error || 'Server error.'}`);
      }
    } catch (err: any) {
      setActionError(`Status update failed: ${err.message || 'Network exception.'}`);
    }
  };

  const filteredEnquiries = enquiries.filter(item => {
    const matchesTab = activeTab === 'all' || item.status === activeTab;
    const matchesSearch = 
      item.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.client_phone?.includes(searchTerm) ||
      item.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.survey_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const countNew = enquiries.filter(e => e.status === 'new').length;
  const countContacted = enquiries.filter(e => e.status === 'contacted').length;
  const countAccepted = enquiries.filter(e => e.status === 'accepted').length;
  const countRejected = enquiries.filter(e => e.status === 'rejected' || e.status === 'spam').length;
  const conversionRate = enquiries.length > 0 ? Math.round((countAccepted / enquiries.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Inbound Leads &amp; Enquiries Triage Desk
            </h1>
            {countNew > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-mono font-bold text-xs border border-blue-200 dark:border-blue-800 animate-pulse">
                {countNew} New
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Two-Tier Buffer Isolation: Public leads staged in isolated Cloudflare D1 storage before advocate promotion to active cases
          </p>
        </div>

        <button
          onClick={fetchEnquiries}
          className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Staging</span>
        </button>
      </div>

      {/* Action Notices */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{actionError}</span>
        </div>
      )}

      {/* KPI Triage Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Inbound</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">{enquiries.length}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">New (Uncontacted)</span>
          <span className="text-xl font-bold font-mono text-blue-600 mt-1 block">{countNew}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">Contacted</span>
          <span className="text-xl font-bold font-mono text-slate-700 dark:text-slate-200 mt-1 block">{countContacted}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Promoted to Case</span>
          <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">{countAccepted}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Conversion Rate</span>
          <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1 block">{conversionRate}%</span>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Leads', count: enquiries.length },
            { id: 'new', label: 'New', count: countNew },
            { id: 'contacted', label: 'Contacted', count: countContacted },
            { id: 'accepted', label: 'Promoted', count: countAccepted },
            { id: 'rejected', label: 'Closed / Rejected', count: countRejected },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search leads, phone, district... (⌘K)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs">Loading inbound leads from Cloudflare D1...</p>
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center space-y-2 shadow-xs">
          <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No leads in this view</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? `No leads match "${searchTerm}".` : 'No enquiries currently waiting in this status.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEnquiries.map(enquiry => {
            const isNew = enquiry.status === 'new';
            const isContacted = enquiry.status === 'contacted';
            const isAccepted = enquiry.status === 'accepted';
            const isRejected = enquiry.status === 'rejected' || enquiry.status === 'spam';

            return (
              <div
                key={enquiry.id}
                className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition-all shadow-xs ${
                  isNew
                    ? 'border-blue-300 dark:border-blue-800/80'
                    : isAccepted
                    ? 'border-emerald-300 dark:border-emerald-800/60'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Lead Information */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {enquiry.id}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {enquiry.service_package || 'Legal Opinion'}
                      </span>
                      {isNew && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 uppercase tracking-wider">
                          New Lead
                        </span>
                      )}
                      {isContacted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Contacted
                        </span>
                      )}
                      {isAccepted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Promoted to Case
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          Closed / Rejected
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto">
                        <Calendar className="w-3 h-3" />
                        {new Date(enquiry.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{enquiry.client_name}</span>
                        <span className="text-xs text-slate-500 font-normal">
                          ({enquiry.source === 'website' ? 'Website Portal' : enquiry.source})
                        </span>
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 mt-1">
                        <a
                          href={`tel:${enquiry.client_phone}`}
                          className="hover:text-blue-600 font-mono flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400"
                        >
                          <PhoneCall className="w-3 h-3 text-slate-400" />
                          <span>{enquiry.client_phone}</span>
                        </a>
                        {enquiry.client_email && (
                          <span className="text-slate-500 font-mono">
                            {enquiry.client_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          <span>{enquiry.district}</span>
                        </span>
                      </div>
                    </div>

                    {/* Property & Survey Details */}
                    <div className="bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 text-xs space-y-1">
                      {enquiry.survey_number && (
                        <div>
                          <span className="text-slate-500">Survey / Plot No: </span>
                          <span className="text-slate-900 dark:text-white font-mono font-semibold">{enquiry.survey_number}</span>
                        </div>
                      )}
                      {enquiry.property_address && (
                        <div>
                          <span className="text-slate-500">Property Location: </span>
                          <span className="text-slate-700 dark:text-slate-300">{enquiry.property_address}</span>
                        </div>
                      )}
                      {enquiry.client_notes && (
                        <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 mt-1">
                          <span className="text-slate-500">Client Notes: </span>
                          <span className="text-slate-800 dark:text-slate-200 italic">"{enquiry.client_notes}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Case Promotion & Actions */}
                  <div className="lg:w-72 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-4">
                    {isAccepted ? (
                      <div className="space-y-2.5">
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Official Case Active</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                            {enquiry.converted_case_id}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                            Operating under 8-Stage Scrutiny
                          </span>
                        </div>

                        <Link
                          href={`/track/${enquiry.converted_case_id}`}
                          target="_blank"
                          className="w-full py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                        >
                          <span>Open Tracking URL</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Case Handler Actions</span>
                        
                        {/* Primary Action: 1-Click Accept & Move to Cases Table */}
                        <button
                          onClick={() => handleAcceptToCase(enquiry)}
                          disabled={acceptingId === enquiry.id}
                          className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs shadow-blue-500/20 disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            {acceptingId === enquiry.id ? 'Promoting...' : 'Accept & Convert to Case'}
                          </span>
                        </button>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {isNew && (
                            <button
                              onClick={() => handleUpdateStatus(enquiry.id, 'contacted')}
                              className="py-1 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-all flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>Contacted</span>
                            </button>
                          )}
                          {!isRejected && (
                            <button
                              onClick={() => handleUpdateStatus(enquiry.id, 'rejected')}
                              className="py-1 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-all flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject / Spam</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
