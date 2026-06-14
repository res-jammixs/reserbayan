'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, User, FileText, Calendar, Clock, Paperclip, Download, CheckCircle, XCircle, PackageCheck, ClipboardCheck, ClipboardList, Mail, Phone, MapPin } from 'lucide-react';
import AiReviewAssistant from '@/shared/components/ai/AiReviewAssistant';
import NotificationModal from '@/app/components/NotificationModal';
import RequestProgressTracker from '@/app/components/requests/RequestProgressTracker';

export default function RequestDetailsModal({
  isOpen,
  onClose,
  requestDetails,
  loading = false,
  onApprove,
  onReject,
  onHardCopySubmitted,
  onReadyForPickup,
  onComplete
}) {
  const [isDownloading, setIsDownloading] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [notification, setNotification] = useState(null);

  // Fetch attachments when requestDetails changes
  useEffect(() => {
    if (requestDetails?.requestId) {
      fetchAttachments();
    }
  }, [requestDetails]);

  const fetchAttachments = async () => {
    if (!requestDetails?.requestId) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Fetch the full request details including attachments
      const response = await fetch(
        `/api/document-requests/${requestDetails.requestId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const fullRequestData = await response.json();
        setAttachments(fullRequestData.attachments || []);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  // Secure file download handler
  const handleDownloadAttachment = async (file) => {
    if (!requestDetails?.requestId || !file?.id) return;
    
    // Set downloading state for this specific file
    setIsDownloading(prev => ({ ...prev, [file.id]: true }));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setNotification({
          type: 'warning',
          title: 'Login Required',
          message: 'Please log in again to download files.',
        });
        return;
      }

      const response = await fetch(
        `/api/document-requests/${requestDetails.requestId}/attachments/${file.id}/download`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.fileName || 'document';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (response.status === 401) {
        setNotification({
          type: 'warning',
          title: 'Login Required',
          message: 'Please log in again to download files.',
        });
      } else if (response.status === 403) {
        setNotification({
          type: 'error',
          title: 'Access Denied',
          message: 'You do not have permission to download this file.',
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      setNotification({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to download file. Please try again.',
      });
    } finally {
      // Clear downloading state
      setIsDownloading(prev => ({ ...prev, [file.id]: false }));
    }
  };

  if (!isOpen || !requestDetails) return null;
  const normalizedStatus = requestDetails.status?.toLowerCase().replace(/[\s_-]+/g, '-') || '';
  const footerButtonBase = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold shadow-sm transition-colors';
  const footerButtonGhost = `${footerButtonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
  const footerButtonDanger = `${footerButtonBase} border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100`;
  const footerButtonPrimary = `${footerButtonBase} bg-gradient-to-r from-[#243b8e] to-[#2f84c0] text-white hover:from-[#122361] hover:to-[#2f84c0]`;
  const residentName = requestDetails.resident
    || requestDetails.residentName
    || requestDetails.residentFullName
    || 'N/A';
  const residentInfoItems = [
    { label: 'Name', value: residentName, icon: User },
    { label: 'Contact Number', value: requestDetails.phoneNumber || requestDetails.residentPhoneNumber, icon: Phone },
    { label: 'Email', value: requestDetails.email || requestDetails.residentEmail, icon: Mail },
    { label: 'Address', value: requestDetails.address || requestDetails.residentAddress, icon: MapPin },
  ].filter(({ value }) => value);
  const parseRequirements = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value || typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  };
  const hardCopyRequirements = parseRequirements(requestDetails.hardCopyRequirements);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase().replace(/[\s_-]+/g, '-')) {
      case 'pending':
        return 'bg-[#d8def2] text-[#122361] border-[#c2cbea]';
      case 'approved':
        return 'bg-[#c2cbea] text-[#00114e] border-[#9eaddd]';
      case 'ready-for-pickup':
        return 'bg-[#eef3ff] text-[#122361] border-[#c2cbea]';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0" onClick={handleBackdropClick}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative mx-auto flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Request Details</h2>
                <p className="text-sm text-slate-600">View detailed information about this document request</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
              <span className="ml-3 text-slate-600">Loading request details...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <RequestProgressTracker request={requestDetails} />

              {/* Request Header */}
              <div className="bg-gradient-to-r from-[#122361] to-[#2f84c0] rounded-xl p-6 border border-[#d8def2]">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-xl text-[#122361]">
                    {requestDetails.resident?.charAt(0) || 'R'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">
                      {requestDetails.documentName}
                    </h3>
                    <p className="text-[#d8def2] flex items-center gap-2 mt-1">
                      <User className="w-4 h-4" />
                      {requestDetails.resident}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(requestDetails.status)}`}>
                        {requestDetails.status}
                      </span>
                      {(attachments.length > 0 || requestDetails.attachmentCount > 0) && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                          <Paperclip className="w-3 h-3 mr-1" />
                          {attachments.length || requestDetails.attachmentCount} attachment{((attachments.length || requestDetails.attachmentCount) !== 1) ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(220px,0.85fr)_minmax(0,1.35fr)_minmax(240px,1fr)]">
                <aside className="flex flex-col space-y-2 opacity-90">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                    <User className="h-3.5 w-3.5 text-[#243b8e] opacity-70" />
                    Resident Basic Information
                  </h4>
                  <div className="flex-1 space-y-2 rounded-xl border border-slate-100/80 bg-slate-50/60 p-2">
                    {residentInfoItems.map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex min-w-0 items-start gap-2 rounded-lg bg-white/80 p-2 ring-1 ring-slate-100/80">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eef3ff]/70">
                          <Icon className="h-3.5 w-3.5 text-[#243b8e] opacity-75" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                          <p className="break-words text-xs font-semibold leading-snug text-slate-800" title={value}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>

                <div className="flex flex-col space-y-2">
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                      <FileText className="h-4 w-4 text-[#243b8e]" />
                      Document Information
                    </h4>
                    <div className="grid gap-2">
                      <div className="relative overflow-hidden rounded-lg border border-[#c2cbea] bg-gradient-to-br from-[#eef3ff] via-white to-white p-3 shadow-sm">
                        <div className="absolute inset-y-0 left-0 w-1 bg-[#243b8e]" aria-hidden="true" />
                        <div className="flex items-start gap-2 pl-1">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-[#243b8e] ring-1 ring-[#d8def2]">
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#243b8e]">Document Name</p>
                            <p className="mt-0.5 font-[family-name:var(--font-montserrat)] text-sm font-extrabold leading-none text-[#00114e]">{requestDetails.documentName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Request ID</p>
                          <p className="mt-1 text-sm font-bold text-slate-900">#{requestDetails.id || requestDetails.requestId}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</p>
                          <span className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(requestDetails.status)}`}>
                            {requestDetails.status}
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date Submitted</p>
                          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Calendar className="h-4 w-4 text-[#243b8e]" />
                            {requestDetails.submittedAt ? formatDate(requestDetails.submittedAt) : 'Unknown'}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Time Submitted</p>
                          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Clock className="h-4 w-4 text-[#243b8e]" />
                            {requestDetails.submittedAt ? formatTime(requestDetails.submittedAt) : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                      <ClipboardList className="h-4 w-4 text-[#243b8e]" />
                      Purpose & Details
                    </h4>
                    <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {requestDetails.details || 'No purpose provided.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-3">
                  {hardCopyRequirements.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                        <ClipboardCheck className="h-4 w-4 text-[#243b8e]" />
                        Hard Copy Requirements
                      </h4>
                      <div className="grid gap-2">
                        {hardCopyRequirements.map((requirement, index) => (
                          <div key={`shared-hard-copy-${requirement}-${index}`} className="flex gap-2 rounded-lg border border-[#c2cbea] bg-[#eef3ff]/70 px-3 py-2 text-xs font-semibold text-slate-700">
                            <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                            <span className="break-words">{requirement}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Paperclip className="h-4 w-4 text-[#243b8e]" />
                      Attached Requirements
                    </h4>

                  {attachments.length > 0 ? (
                    <div className="grid gap-2">
                      {attachments.map((file) => (
                        <div 
                          key={file.id} 
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 transition-colors hover:bg-slate-50"
                        >
                          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                            <div className="flex-shrink-0 rounded-md bg-[#eef3ff] p-2">
                              <FileText className="h-4 w-4 text-[#243b8e]" />
                            </div>
                            <div className="min-w-0 overflow-hidden">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {file.fileName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {isDownloading[file.id] ? 'Downloading...' : 'Click to download'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadAttachment(file)}
                            disabled={isDownloading[file.id]}
                            className="flex-shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-[#eef3ff] hover:text-[#243b8e] disabled:cursor-not-allowed disabled:opacity-50"
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : requestDetails.attachmentCount > 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-500">
                      {requestDetails.attachmentCount} attached requirement{requestDetails.attachmentCount !== 1 ? 's' : ''}.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-500">
                      No attached requirements.
                    </div>
                  )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!loading && (
          <div className="sticky bottom-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/95 px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
            {/* Action buttons based on status */}
            <div className="flex min-w-0 flex-1 justify-start">
              <AiReviewAssistant requestId={requestDetails.id || requestDetails.requestId} />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
            {normalizedStatus === 'pending' && (
              <>
                <button
                  onClick={() => onReject(requestDetails.id || requestDetails.requestId)}
                  className={footerButtonDanger}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject Request
                </button>
                <button
                  onClick={() => onApprove(requestDetails.id || requestDetails.requestId)}
                  className={footerButtonPrimary}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approve Request
                </button>
              </>
            )}
            {normalizedStatus === 'awaiting-hard-copy-submission' && onHardCopySubmitted && (
              <button
                onClick={() => onHardCopySubmitted(requestDetails.id || requestDetails.requestId)}
                className={footerButtonPrimary}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Mark Hard Copy Received
              </button>
            )}
            {(normalizedStatus === 'approved' || normalizedStatus === 'hard-copy-submitted') && onReadyForPickup && (
              <button
                onClick={() => onReadyForPickup(requestDetails.id || requestDetails.requestId)}
                className={footerButtonPrimary}
              >
                <PackageCheck className="w-3.5 h-3.5" />
                Mark Ready for Pick Up
              </button>
            )}
            {normalizedStatus === 'ready-for-pickup' && onComplete && (
              <button
                onClick={() => onComplete(requestDetails.id || requestDetails.requestId)}
                className={footerButtonPrimary}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark as Completed
              </button>
            )}
            <button
              onClick={onClose}
              className={footerButtonGhost}
            >
              <XCircle className="w-3.5 h-3.5" />
              Close
            </button>
            </div>
          </div>
        )}
      </motion.div>

      <NotificationModal
        isOpen={!!notification}
        onClose={() => setNotification(null)}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        zIndexClass="z-[70]"
      />
    </div>
  );
}
