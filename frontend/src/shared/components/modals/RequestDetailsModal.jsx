'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, User, FileText, Calendar, Clock, Info, Paperclip, Download, CheckCircle, XCircle, PackageCheck } from 'lucide-react';
import AiReviewPanel from '@/shared/components/ai/AiReviewPanel';
import NotificationModal from '@/app/components/NotificationModal';
import RequestProgressTracker from '@/app/components/requests/RequestProgressTracker';

export default function RequestDetailsModal({
  isOpen,
  onClose,
  requestDetails,
  loading = false,
  onApprove,
  onReject,
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
        className="relative bg-white rounded-2xl shadow-sm max-w-4xl w-full mx-auto overflow-hidden ring-1 ring-black/5"
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
        <div className="p-6 max-h-[70vh] overflow-y-auto">
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

              {/* Request Information */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Request Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Document Type</label>
                      <p className="text-sm font-medium text-slate-900">{requestDetails.documentName}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Request ID</label>
                      <p className="text-sm font-medium text-slate-900">#{requestDetails.id || requestDetails.requestId}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</label>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(requestDetails.status)}`}>
                          {requestDetails.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date Submitted</label>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {requestDetails.submittedAt ? formatDate(requestDetails.submittedAt) : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Time Submitted</label>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {requestDetails.submittedAt ? formatTime(requestDetails.submittedAt) : 'Unknown'}
                      </p>
                    </div>
                    {requestDetails.updatedAt && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last Updated</label>
                        <p className="text-sm font-medium text-slate-900">
                          {formatDate(requestDetails.updatedAt)} at {formatTime(requestDetails.updatedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resident Information */}
              {requestDetails.resident && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Resident Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Full Name</label>
                      <p className="text-sm font-medium text-slate-900">{requestDetails.resident}</p>
                    </div>
                    {requestDetails.email && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email Address</label>
                        <p className="text-sm font-medium text-slate-900">{requestDetails.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Request Details/Purpose */}
              {requestDetails.details && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Purpose/Details
                  </h4>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{requestDetails.details}</p>
                  </div>
                </div>
              )}

              <AiReviewPanel requestId={requestDetails.id || requestDetails.requestId} />

              {/* Attachments - NEW SECURE DOWNLOAD SECTION */}
              {(attachments.length > 0 || requestDetails.attachmentCount > 0) && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Paperclip className="w-5 h-5" />
                    Attachments
                  </h4>
                  
                  {attachments.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600 mb-4">
                        {attachments.length} attachment{attachments.length !== 1 ? 's' : ''} available for download.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {attachments.map((file) => (
                          <div 
                            key={file.id} 
                            className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="bg-[#d8def2] p-2 rounded-md flex-shrink-0">
                                <FileText className="w-4 h-4 text-[#243b8e]" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-medium text-slate-900 truncate">
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
                              className="p-2 text-slate-400 hover:text-[#243b8e] hover:bg-[#eef3ff] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              title="Download file"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">
                        This request has {requestDetails.attachmentCount} attachment{requestDetails.attachmentCount !== 1 ? 's' : ''}.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: requestDetails.attachmentCount }, (_, i) => (
                          <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#d8def2] text-[#122361] border border-[#c2cbea]">
                            <Paperclip className="w-3 h-3 mr-1" />
                            Attachment {i + 1}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!loading && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3">
            {/* Action buttons based on status */}
            {normalizedStatus === 'pending' && (
              <>
                <button
                  onClick={() => onReject(requestDetails.id || requestDetails.requestId)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium border border-red-200 bg-red-50 text-red-700 shadow-sm transition-colors hover:border-red-300 hover:bg-red-100"
                >
                  <XCircle className="w-5 h-5" />
                  Reject Request
                </button>
                <button
                  onClick={() => onApprove(requestDetails.id || requestDetails.requestId)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-[#243b8e] to-[#2f84c0] text-white shadow-sm transition-colors hover:from-[#122361] hover:to-[#2f84c0]"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve Request
                </button>
              </>
            )}
            {normalizedStatus === 'approved' && onReadyForPickup && (
              <button
                onClick={() => onReadyForPickup(requestDetails.id || requestDetails.requestId)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-[#243b8e] to-[#2f84c0] text-white shadow-sm transition-colors hover:from-[#122361] hover:to-[#2f84c0]"
              >
                <PackageCheck className="w-5 h-5" />
                Mark Ready for Pick Up
              </button>
            )}
            {normalizedStatus === 'ready-for-pickup' && onComplete && (
              <button
                onClick={() => onComplete(requestDetails.id || requestDetails.requestId)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-[#243b8e] to-[#2f84c0] text-white shadow-sm transition-colors hover:from-[#122361] hover:to-[#2f84c0]"
              >
                <CheckCircle className="w-5 h-5" />
                Mark as Completed
              </button>
            )}
            {/* For completed requests, show close button only */}
            {normalizedStatus === 'completed' && (
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700"
              >
                Close
              </button>
            )}
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
