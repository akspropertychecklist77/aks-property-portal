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
  Search
} from 'lucide-react';
import { ClientEnquiry, EnquiryStatus } from '@/lib/types';

export default function EnquiriesInboxPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'contacted' | 'accepted' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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
        setActionSuccess(`Enquiry successfully promoted! Case ${data.caseId} created.`);
        // Update local list
        setEnquiries(prev =>
          prev.map(item =>
            item.id === enquiry.id
              ? { ...item, status: 'accepted', converted_case_id: data.caseId }
              : item
          )
        );
      } else {
        alert(`Failed to accept: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error promoting enquiry: ${err.message}`);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: EnquiryStatus) => {
    try {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setEnquiries(prev =>
          prev.map(item => (item.id === id ? { ...item, status: newStatus } : item))
        );
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">Client Intake &amp; Enquiries</h1>
            {countNew > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-extrabold text-xs border border-amber-500/30">
                {countNew} New
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tier 1 Intake Staging: Review prospective leads from the website &amp; property checklist. Qualified leads are converted into official cases.
          </p>
        </div>

        <button
          onClick={fetchEnquiries}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Funnel */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Inquiries</span>
          <span className="text-xl font-black text-white mt-1 block">{enquiries.length}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">All incoming leads</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 bg-amber-950/10">
          <span className="text-[10px] font-bold uppercase text-amber-400 block">Pending Review</span>
          <span className="text-xl font-black text-amber-400 mt-1 block">{countNew}</span>
          <span className="text-[10px] text-slate-400 mt-1 block">Requires staff triage</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/30 bg-blue-950/10">
          <span className="text-[10px] font-bold uppercase text-blue-400 block">In Discussion</span>
          <span className="text-xl font-black text-blue-400 mt-1 block">{countContacted}</span>
          <span className="text-[10px] text-slate-400 mt-1 block">Client contacted</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[10px] font-bold uppercase text-emerald-400 block">Promoted Cases</span>
          <span className="text-xl font-black text-emerald-400 mt-1 block">{countAccepted}</span>
          <span className="text-[10px] text-slate-400 mt-1 block">Active in legal ops</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Conversion Rate</span>
          <span className="text-xl font-black text-white mt-1 block">{conversionRate}%</span>
          <span className="text-[10px] text-emerald-400 mt-1 block">Lead-to-case ratio</span>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <Link
            href="/admin/pipeline"
            className="font-bold underline text-emerald-300 hover:text-white"
          >
            View in Kanban &rarr;
          </Link>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center overflow-x-auto gap-1">
          {[
            { id: 'all', label: 'All', count: enquiries.length },
            { id: 'new', label: 'New Leads', count: countNew },
            { id: 'contacted', label: 'Contacted', count: countContacted },
            { id: 'accepted', label: 'Promoted to Cases', count: countAccepted },
            { id: 'rejected', label: 'Spam / Closed', count: countRejected },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, survey..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Enquiries List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          Loading incoming enquiries...
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800">
          <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-300">No enquiries found</p>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'all'
              ? 'Prospective clients submitting the website form will appear here.'
              : `There are currently no enquiries under the "${activeTab}" filter.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEnquiries.map((enquiry) => {
            const isNew = enquiry.status === 'new';
            const isContacted = enquiry.status === 'contacted';
            const isAccepted = enquiry.status === 'accepted';
            const isRejected = enquiry.status === 'rejected' || enquiry.status === 'spam';

            return (
              <div
                key={enquiry.id}
                className={`p-5 rounded-2xl bg-slate-900 border transition-all ${
                  isNew
                    ? 'border-amber-500/50 shadow-md shadow-amber-500/5'
                    : isAccepted
                    ? 'border-emerald-500/30'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Lead Information */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                        {enquiry.id}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {enquiry.service_package || 'Legal Opinion'}
                      </span>
                      {isNew && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-500 text-slate-950 uppercase tracking-wider">
                          New Lead
                        </span>
                      )}
                      {isContacted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Contacted
                        </span>
                      )}
                      {isAccepted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Promoted to Case
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Closed / Rejected
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 ml-auto">
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
                      <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                        <span>{enquiry.client_name}</span>
                        <span className="text-xs text-slate-400 font-normal">
                          ({enquiry.source === 'website' ? 'Website Portal' : enquiry.source})
                        </span>
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-1">
                        <a
                          href={`tel:${enquiry.client_phone}`}
                          className="hover:text-amber-400 font-mono flex items-center gap-1 font-semibold text-amber-300"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>{enquiry.client_phone}</span>
                        </a>
                        {enquiry.client_email && (
                          <span className="text-slate-400 font-mono">
                            {enquiry.client_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-amber-500" />
                          <span>{enquiry.district}</span>
                        </span>
                      </div>
                    </div>

                    {/* Property & Survey Details */}
                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                      {enquiry.survey_number && (
                        <div>
                          <span className="text-slate-500 font-medium">Survey / Plot No: </span>
                          <span className="text-white font-mono font-semibold">{enquiry.survey_number}</span>
                        </div>
                      )}
                      {enquiry.property_address && (
                        <div>
                          <span className="text-slate-500 font-medium">Property Location: </span>
                          <span className="text-slate-300">{enquiry.property_address}</span>
                        </div>
                      )}
                      {enquiry.client_notes && (
                        <div className="pt-1 border-t border-slate-800/60 mt-1">
                          <span className="text-slate-500 font-medium">Client Notes: </span>
                          <span className="text-amber-200/90 italic">"{enquiry.client_notes}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Case Promotion & Actions */}
                  <div className="lg:w-72 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-5">
                    {isAccepted ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block">Official Case Active</span>
                          <span className="text-sm font-black text-white font-mono mt-0.5 block">
                            {enquiry.converted_case_id}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Operating under 8-Stage Scrutiny
                          </span>
                        </div>

                        <Link
                          href={`/track/${enquiry.converted_case_id}`}
                          target="_blank"
                          className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700"
                        >
                          <span>Open Tracking URL</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Case Handler Actions</span>
                        
                        {/* Primary Action: Accept & Move to Cases Table */}
                        <button
                          onClick={() => handleAcceptToCase(enquiry)}
                          disabled={acceptingId === enquiry.id}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>
                            {acceptingId === enquiry.id ? 'Promoting...' : 'Accept & Convert to Case'}
                          </span>
                        </button>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {isNew && (
                            <button
                              onClick={() => handleUpdateStatus(enquiry.id, 'contacted')}
                              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold transition-all flex items-center justify-center gap-1 border border-slate-700"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>Contacted</span>
                            </button>
                          )}
                          {!isRejected && (
                            <button
                              onClick={() => handleUpdateStatus(enquiry.id, 'rejected')}
                              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-1 border border-slate-700"
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

