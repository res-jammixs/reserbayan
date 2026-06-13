import { useState, useEffect } from 'react';
import { Ban, FileText, Calendar, XCircle, Paperclip, Edit2, Save, Trash2, Plus, RotateCcw, Mail, MapPin, Phone, User, CheckCircle, PackageCheck } from 'lucide-react';
import NotificationModal from '@/app/components/NotificationModal';
import ConfirmationModal from '@/shared/components/modals/ConfirmationModal';
import RejectionReasonModal from '@/shared/components/modals/RejectionReasonModal';
import AiReviewPanel from '@/shared/components/ai/AiReviewPanel';
import RequestProgressTracker from './RequestProgressTracker';
import { motion } from 'framer-motion';

function RequestModal({ request, user, onClose, cancelRequest, completeRequest, readyForPickupRequest, approveRequest, rejectRequest, onReRequest, onUpdateRequest }) {
  const [notification, setNotification] = useState(null);
  
  // --- LOCAL DISPLAY STATE ---
  // We use this state to render the UI. It starts with the prop data, 
  // but we can update it immediately after a successful API call.
  const [displayRequest, setDisplayRequest] = useState(request);

  // Sync with prop if parent updates it externally
  useEffect(() => {
    setDisplayRequest(request);
  }, [request]);

  // --- EDIT STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editDetails, setEditDetails] = useState(request?.details || '');
  const [filesToRemove, setFilesToRemove] = useState([]); 
  const [newFiles, setNewFiles] = useState([]); 
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!displayRequest) return null;
  const normalizedStatus = displayRequest.status?.toLowerCase().replace(/[\s_-]+/g, '-') || '';

  // --- HELPERS ---
  const residentFullName = displayRequest.residentName
    || displayRequest.residentFullName
    || displayRequest.resident?.fullName
    || [displayRequest.residentFirstName || displayRequest.resident?.firstName, displayRequest.residentMiddleName, displayRequest.residentLastName || displayRequest.resident?.lastName]
      .filter(Boolean)
      .join(' ')
    || 'N/A';
  const residentEmail = displayRequest.residentEmail || displayRequest.resident?.email || 'N/A';
  const residentPhoneNumber = displayRequest.residentPhoneNumber || displayRequest.resident?.phoneNumber || 'N/A';
  const residentAddress = displayRequest.residentAddress || displayRequest.resident?.address || 'N/A';
  const processingTime = displayRequest.processingTime
    || displayRequest.processing_time
    || displayRequest.estimatedProcessingTime
    || displayRequest.document?.processingTime
    || displayRequest.documentType?.processingTime;
  const infoItems = [
    { label: 'Name', value: residentFullName, icon: User },
    { label: 'Contact Number', value: residentPhoneNumber, icon: Phone },
    { label: 'Email', value: residentEmail, icon: Mail },
    { label: 'Address', value: residentAddress, icon: MapPin },
  ];

  const getStatusIcon = (status) => {
    const statusLower = status ? status.toLowerCase().replace(/[\s_-]+/g, '-') : '';
    switch (statusLower) {
      case 'approved':
        return <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">✓</span></div>;
      case 'ready-for-pickup':
        return <div className="w-5 h-5 bg-[#2f84c0] rounded-full flex items-center justify-center"><PackageCheck className="h-3 w-3 text-white" /></div>;
      case 'completed':
        return <div className="w-5 h-5 bg-[#2f84c0] rounded-full flex items-center justify-center"><span className="text-white text-xs">✓</span></div>;
      case 'pending':
        return <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">○</span></div>;
      case 'rejected':
        return <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">✗</span></div>;
      default:
        return <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">○</span></div>;
    }
  };

  // --- SECURE FILE DOWNLOAD HANDLER ---
  const handleDownloadAttachment = async (file) => {
    if (!displayRequest?.requestId || !file?.id) return;
    
    // Set downloading state for this specific file
    setIsDownloading(prev => ({ ...prev, [file.id]: true }));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setNotification({ 
          type: 'error', 
          title: 'Authentication Error', 
          message: 'Please log in again to download files.' 
        });
        return;
      }

      const response = await fetch(
        `/api/document-requests/${displayRequest.requestId}/attachments/${file.id}/download`,
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
        
        setNotification({
          type: 'success',
          title: 'Download Complete',
          message: 'File downloaded successfully.',
          autoClose: true
        });
      } else if (response.status === 401) {
        setNotification({ 
          type: 'error', 
          title: 'Unauthorized', 
          message: 'Please log in again to download files.' 
        });
      } else if (response.status === 403) {
        setNotification({ 
          type: 'error', 
          title: 'Access Denied', 
          message: 'You do not have permission to download this file.' 
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      setNotification({ 
        type: 'error', 
        title: 'Download Failed', 
        message: 'Failed to download file. Please try again.' 
      });
    } finally {
      // Clear downloading state
      setIsDownloading(prev => ({ ...prev, [file.id]: false }));
    }
  };

  // --- ACTIONS ---

  const handleCancelRequest = async () => {
    setConfirmation({
      type: 'delete',
      title: 'Cancel Request',
      message: 'Are you sure you want to cancel this request?',
      confirmText: 'Cancel Request',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600',
      onConfirm: async () => {
        const result = await cancelRequest(displayRequest.requestId);
        if (result.success) {
          setNotification({
              type: 'success',
              title: 'Cancelled',
              message: 'Request cancelled successfully.',
              autoClose: true
          });
          setTimeout(onClose, 2000);
        } else {
          setNotification({ type: 'error', title: 'Error', message: result.error });
        }
      },
    });
  };

  const handleApproveRequest = async () => {
    setConfirmation({
      type: 'approve',
      title: 'Approve Request',
      message: 'Are you sure you want to approve this request?',
      confirmText: 'Approve',
      confirmButtonClass: 'bg-green-600 hover:bg-green-700',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/document-requests/${displayRequest.requestId}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
              setNotification({
                  type: 'success',
                  title: 'Approved',
                  message: 'Request approved successfully.',
                  autoClose: true
              });
              setTimeout(onClose, 2000);
          } else {
              setNotification({ type: 'error', title: 'Error', message: 'Failed to approve request.' });
          }
        } catch (err) {
          setNotification({ type: 'error', title: 'Network Error', message: err.message });
        }
      },
    });
  };

  const handleRejectRequest = async () => {
    setRejectionModalOpen(true);
  };

  const handleRejectSubmit = async (rejectionReason) => {
    setIsRejecting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/document-requests/${displayRequest.requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      if (res.ok) {
          setRejectionModalOpen(false);
          setNotification({
              type: 'success',
              title: 'Rejected',
              message: 'Request rejected successfully.',
              autoClose: true
          });
          setTimeout(onClose, 2000);
      } else {
          setNotification({ type: 'error', title: 'Error', message: 'Failed to reject request.' });
      }
    } catch (err) {
      setNotification({ type: 'error', title: 'Network Error', message: err.message });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleReadyForPickupRequest = async () => {
    setConfirmation({
      type: 'complete',
      title: 'Mark Ready for Pick Up',
      message: 'Mark this request as ready for pick up? The resident will be notified that the document can be claimed.',
      confirmText: 'Mark Ready',
      confirmButtonClass: 'bg-[#243b8e] hover:bg-[#122361]',
      onConfirm: async () => {
        setIsMarkingReady(true);
        try {
          if (!readyForPickupRequest) {
            throw new Error('Marking requests ready for pickup is not available in this view.');
          }

          const updatedRequest = await readyForPickupRequest(displayRequest.requestId);

          setDisplayRequest((current) => ({
            ...current,
            ...(updatedRequest || {}),
            status: 'Ready for Pickup',
            updatedAt: updatedRequest?.updatedAt || new Date().toISOString(),
          }));

          setNotification({
            type: 'success',
            title: 'Ready for Pick Up',
            message: 'Document request has been marked ready for pick up.',
            autoClose: true
          });

          if (onUpdateRequest) onUpdateRequest();
        } catch (err) {
          setNotification({ type: 'error', title: 'Update Failed', message: err.message });
        } finally {
          setIsMarkingReady(false);
        }
      },
    });
  };

  const handleCompleteRequest = async () => {
    setConfirmation({
      type: 'complete',
      title: 'Mark Request Complete',
      message: 'Mark this request as complete? Use this once the resident has claimed the document.',
      confirmText: 'Mark Complete',
      confirmButtonClass: 'bg-[#243b8e] hover:bg-[#122361]',
      onConfirm: async () => {
        setIsCompleting(true);
        try {
          if (!completeRequest) {
            throw new Error('Completing requests is not available in this view.');
          }

          const updatedRequest = await completeRequest(displayRequest.requestId);

          setDisplayRequest((current) => ({
            ...current,
            ...(updatedRequest || {}),
            status: 'Completed',
            updatedAt: updatedRequest?.updatedAt || new Date().toISOString(),
          }));

          setNotification({
            type: 'success',
            title: 'Marked Complete',
            message: 'Document request has been marked as completed.',
            autoClose: true
          });

          if (onUpdateRequest) onUpdateRequest();
        } catch (err) {
          setNotification({ type: 'error', title: 'Completion Failed', message: err.message });
        } finally {
          setIsCompleting(false);
        }
      },
    });
  };

  // --- RE-REQUEST LOGIC ---
  const handleReRequest = async () => {
    setConfirmation({
      type: 'warning',
      title: 'Create New Request',
      message: 'Do you want to create a new request with the same details?',
      confirmText: 'Create Request',
      confirmButtonClass: 'bg-[#243b8e] hover:bg-[#122361]',
      onConfirm: async () => {
        try {
            const token = localStorage.getItem('token');
            const dataPayload = {
                documentId: displayRequest.documentId, 
                documentName: displayRequest.documentName,
                residentId: user.residentId,
                details: displayRequest.details,
            };

            const formData = new FormData();
            formData.append('data', JSON.stringify(dataPayload));

            const res = await fetch('/api/document-requests', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                setNotification({
                    type: 'success',
                    title: 'Request Submitted',
                    message: 'A new request has been created successfully.',
                    autoClose: true
                });
                setTimeout(() => {
                    if (onReRequest) onReRequest();
                    onClose();
                }, 2000);
            } else {
                const err = await res.text();
                setNotification({ type: 'error', title: 'Error', message: err });
            }
        } catch (error) {
            setNotification({ type: 'error', title: 'Error', message: 'Network error occurred.' });
        }
      },
    });
  };

  // --- EDITING LOGIC ---
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeExistingFile = (fileId) => {
    setFilesToRemove(prev => [...prev, fileId]);
  };

  const removeNewFile = (index) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        
        const dataPayload = {
            details: editDetails,
            filesToRemove: filesToRemove
        };
        formData.append('data', JSON.stringify(dataPayload));
        
        newFiles.forEach(file => {
            formData.append('files', file);
        });

        const res = await fetch(`/api/document-requests/${displayRequest.requestId}`, {
            method: 'PUT', 
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            // 1. Get the updated object from the backend
            const updatedData = await res.json();

            // 2. Update local state IMMEDIATELY so the UI reflects changes
            setDisplayRequest(updatedData);
            
            // 3. Reset edit states
            setNewFiles([]);
            setFilesToRemove([]);
            setEditDetails(updatedData.details);
            
            setNotification({
                type: 'success',
                title: 'Updated',
                message: 'Request details updated successfully.',
                autoClose: true
            });
            
            // 4. Close edit mode (user sees new data now)
            setIsEditing(false);
            
            // 5. Notify parent to refresh list in background
            if(onUpdateRequest) onUpdateRequest(); 
        } else {
            throw new Error('Update failed');
        }
    } catch (error) {
        setNotification({ type: 'error', title: 'Error', message: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true"></div>

      <div className="relative mx-auto flex h-full max-w-7xl items-center justify-center p-2">
        <motion.div
          className="w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-sm max-h-[97vh] sm:max-h-[94vh]"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
         
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-gradient-to-r from-[#eef3ff] to-white p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-gradient-to-r from-[#122361] to-[#2f84c0] text-white rounded-lg p-2 w-10 h-10 flex-shrink-0 flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="modal-title" className="text-xl font-bold leading-tight text-[#00114e] sm:text-2xl">
                    {isEditing ? 'Edit Request' : 'Request Details'}
                  </h2>
                  {!isEditing && (
                    <>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c2cbea] bg-white/80 px-2.5 py-1 text-xs font-bold text-[#122361]">
                      {getStatusIcon(displayRequest.status)}
                      {displayRequest.status}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800">
                      <Calendar className="h-3.5 w-3.5 text-[#243b8e]" aria-hidden="true" />
                      {new Date(displayRequest.submittedAt).toLocaleDateString('en-US', {
                        timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c2cbea] bg-[#eef3ff] px-2.5 py-1 text-xs font-bold text-[#00114e]">
                      <FileText className="h-3.5 w-3.5 text-[#243b8e]" aria-hidden="true" />
                      #{displayRequest.requestId}
                    </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"
              aria-label="Close modal"
            >
              <XCircle className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          {!isEditing && (
            <div className="space-y-2">
              <RequestProgressTracker request={displayRequest} />

            <div className="hidden">
              <div className="flex items-center gap-2 rounded-lg border border-[#c2cbea] bg-gradient-to-r from-[#eef3ff] to-[#d8def2] px-3 py-2">
                {getStatusIcon(displayRequest.status)}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#122361]">Status</p>
                  <p className="text-sm font-bold leading-tight text-[#00114e]">{displayRequest.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <Calendar className="h-4 w-4 shrink-0 text-[#243b8e]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-green-800">Submitted</p>
                  <p className="truncate text-xs font-semibold text-green-700">
                    {new Date(displayRequest.submittedAt).toLocaleDateString('en-US', {
                      timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric'
                    })}
                    {' • '}
                    {new Date(displayRequest.submittedAt).toLocaleTimeString('en-US', {
                      timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  {displayRequest.updatedAt && (
                    <p className="truncate text-xs text-[#122361]">
                      Updated {new Date(displayRequest.updatedAt).toLocaleDateString('en-US', {
                        timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-[#c2cbea] bg-[#eef3ff] px-3 py-2 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#122361]">Request ID</p>
                <p className="text-sm font-bold leading-tight text-[#00114e]">#{displayRequest.requestId}</p>
              </div>
            </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <div className="space-y-2">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <FileText className="h-4 w-4 text-[#243b8e]" aria-hidden="true" />
                  Document Information
                </h3>
                <div className={`grid gap-2 ${processingTime ? 'md:grid-cols-[minmax(0,1fr)_180px]' : ''}`}>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Document Name</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{displayRequest.documentName}</p>
                  </div>
                  {processingTime && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Processing Time</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">{processingTime}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Purpose & Details</h3>
                  {!isEditing && user !== null && displayRequest.status === 'Pending' && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 text-xs font-semibold text-[#243b8e] hover:text-[#122361]"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Details
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    className="w-full rounded-lg border-2 border-[#d8def2] bg-white p-3 focus:border-[#2f84c0] focus:ring-2 focus:ring-[#2f84c0]"
                    rows="3"
                    value={editDetails}
                    onChange={(e) => setEditDetails(e.target.value)}
                  />
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-3">
                    <p className="line-clamp-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{displayRequest.details}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Paperclip className="h-4 w-4 text-[#243b8e]" aria-hidden="true" />
                  Attached Requirements
                </h3>

                {displayRequest.attachments && displayRequest.attachments.length > 0 ? (
                  <div className="mb-1 grid gap-2 sm:grid-cols-2">
                    {displayRequest.attachments
                      .filter(f => !filesToRemove.includes(f.id))
                      .map((file) => (
                        <div
                          key={file.id}
                          className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2"
                        >
                          <button
                            onClick={() => handleDownloadAttachment(file)}
                            disabled={isDownloading[file.id]}
                            className="flex flex-1 items-center gap-3 overflow-hidden rounded-lg p-1 -m-1 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Click to download"
                          >
                            <div className="rounded-md bg-[#eef3ff] p-2">
                              <FileText className="h-4 w-4 text-[#243b8e]" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="truncate text-sm font-medium text-gray-700">
                                {file.fileName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isDownloading[file.id] ? 'Downloading...' : 'Click to download'}
                              </p>
                            </div>
                          </button>

                          {isEditing && (
                            <button
                              onClick={() => removeExistingFile(file.id)}
                              className="rounded-full p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="mb-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-500">
                    No attached requirements.
                  </div>
                )}

                {isEditing && (
                  <div className="mt-3">
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-3">
                      <input
                        type="file"
                        id="edit-upload"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <label htmlFor="edit-upload" className="flex cursor-pointer flex-col items-center gap-2 text-gray-500 hover:text-[#243b8e]">
                        <Plus className="w-6 h-6" />
                        <span className="text-sm">Click to add more files</span>
                      </label>
                    </div>
                    {newFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {newFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 p-2">
                            <span className="truncate px-2 text-sm text-green-800">{file.name} (New)</span>
                            <button onClick={() => removeNewFile(index)} className="p-1 text-green-600">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!isEditing && user === null && (
                <AiReviewPanel requestId={displayRequest.requestId} />
              )}
            </div>

            <aside className="space-y-2">
              <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-900">
                <User className="h-4 w-4 text-[#243b8e]" aria-hidden="true" />
                Resident Basic Information
              </h3>
              <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-2">
                {infoItems.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex min-w-0 items-start gap-2 rounded-lg bg-white p-2 ring-1 ring-gray-100">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eef3ff]">
                      <Icon className="h-4 w-4 text-[#243b8e]" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                      <p className="truncate text-sm font-bold text-gray-900" title={value}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>

        <div className="flex justify-end gap-3 rounded-b-2xl border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
          
          {isEditing ? (
             <>
                <button
                    onClick={() => {
                        setIsEditing(false);
                        setEditDetails(displayRequest.details); 
                        setNewFiles([]);
                        setFilesToRemove([]);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2 font-medium text-gray-700 hover:bg-gray-50"
                    disabled={isSaving}
                >
                    Cancel Edit
                </button>
                <button
                    onClick={handleSaveChanges}
                    className="flex items-center gap-2 rounded-lg bg-[#243b8e] px-5 py-2 font-medium text-white hover:bg-[#122361]"
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
             </>
          ) : (
             <>
                 {user !== null && ['cancelled', 'rejected'].includes(displayRequest.status?.toLowerCase()) && ( 
                     <button
                        onClick={handleReRequest}
                        className="flex items-center gap-2 rounded-lg bg-[#243b8e] px-5 py-2 font-medium text-white shadow-sm transition-colors hover:bg-[#122361]"
                     >
                        <RotateCcw className="w-4 h-4" /> Re-Request
                     </button>
                 )}

                 {user === null && normalizedStatus === 'pending' && (
                    <>
                    <button
                        onClick={handleRejectRequest}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2 font-medium text-red-700 shadow-sm transition-colors hover:border-red-300 hover:bg-red-100"
                    >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Reject Request
                    </button>
                    <button
                        onClick={handleApproveRequest}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#243b8e] to-[#2f84c0] px-5 py-2 font-medium text-white shadow-sm transition-colors hover:from-[#122361] hover:to-[#2f84c0]"
                    >
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                        Approve Request
                    </button>
                    </>
                 )}

                 {user === null && normalizedStatus === 'approved' && (
                    <button
                        onClick={handleReadyForPickupRequest}
                        disabled={isMarkingReady}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#243b8e] to-[#2f84c0] px-5 py-2 font-medium text-white shadow-sm transition-colors hover:from-[#122361] hover:to-[#2f84c0] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        <PackageCheck className="w-4 h-4" />
                        {isMarkingReady ? 'Updating...' : 'Mark Ready for Pick Up'}
                    </button>
                 )}

                 {user === null && normalizedStatus === 'ready-for-pickup' && (
                    <button
                        onClick={handleCompleteRequest}
                        disabled={isCompleting}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#243b8e] to-[#2f84c0] px-5 py-2 font-medium text-white shadow-sm transition-colors hover:from-[#122361] hover:to-[#2f84c0] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        <CheckCircle className="w-4 h-4" />
                        {isCompleting ? 'Completing...' : 'Mark as Completed'}
                    </button>
                 )}

                 {user !== null && normalizedStatus === 'pending' && (
                    <button
                    onClick={handleCancelRequest}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2 font-medium text-red-700 shadow-sm transition-colors hover:border-red-300 hover:bg-red-100"
                    >
                    <Ban className="h-4 w-4" aria-hidden="true" />
                    Cancel Request
                    </button>
                 )}

                 <button
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                 >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Close
                 </button>
             </>
          )}
        </div>
        </motion.div>
      </div>

      {notification && (
        <NotificationModal 
            isOpen={!!notification}
            onClose={() => setNotification(null)}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            autoClose={notification.autoClose}
        />
      )}

      <ConfirmationModal
        isOpen={!!confirmation}
        onClose={() => setConfirmation(null)}
        onConfirm={confirmation?.onConfirm}
        type={confirmation?.type}
        title={confirmation?.title}
        message={confirmation?.message}
        confirmText={confirmation?.confirmText}
        confirmButtonClass={confirmation?.confirmButtonClass}
      />

      <RejectionReasonModal
        isOpen={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        onSubmit={handleRejectSubmit}
        title="Reject Request"
        itemName={displayRequest.documentName}
        loading={isRejecting}
      />
    </motion.div>
  );
}

export default RequestModal;
