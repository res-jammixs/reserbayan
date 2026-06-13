'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, MapPin, Calendar, CheckCircle, XCircle, Clock, Loader2, Eye } from 'lucide-react';
import { useState } from 'react';

export default function PendingAccountDetailsModal({
  isOpen,
  onClose,
  accountDetails,
  onApprove,
  onReject,
  loading = false,
  actionLoading = { approve: false, reject: false, accountId: null }
}) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // Utility function to extract valid ID path from different possible field names
  const getValidIdPath = (account) => {
    return account?.validIdPath ||
           account?.validId ||
           account?.idDocumentPath ||
           account?.documentPath ||
           null;
  };

  // Utility function to build the full image URL
  const buildImageUrl = (path) => {
    if (!path) return '/documents/no-preview.png';
    
    // If it's already a full URL, use as-is
    if (path.startsWith('http')) {
      return path;
    }
    
    // If it's a Windows absolute path, extract just the filename
    if (path.includes('\\') || path.includes('C:')) {
      const fileName = path.split('\\').pop().split('/').pop();
      return `/uploads/resident/${fileName}`;
    }
    
    // If it's a relative path, prepend the backend URL
    if (path.startsWith('uploads/')) {
      return `/${path}`;
    }
    
    // Default: assume it's just a filename in the uploads directory
    return `/uploads/resident/${path}`;
  };

  // Utility function to check if file is an image (PNG, JPG, JPEG only)
  const isImageFile = (path) => {
    if (!path) return false;
    const extension = path.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png'].includes(extension);
  };
  
  // Utility function to check if file is a PDF (no longer accepted)
  const isPdfFile = (path) => {
    if (!path) return false;
    const extension = path.toLowerCase().split('.').pop();
    return extension === 'pdf';
  };

  if (!isOpen || !accountDetails) return null;

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

  // FIX 1: Check against residentId, not id
  const isApproveLoading = actionLoading.approve && actionLoading.accountId === accountDetails.residentId;
  const isRejectLoading = actionLoading.reject && actionLoading.accountId === accountDetails.residentId;

  const handleApprove = async () => {
    if (onApprove && !loading && !isApproveLoading) {
      // FIX 2: Pass residentId, not id
      await onApprove(accountDetails.residentId);
    }
  };

  const handleReject = async () => {
    if (onReject && !loading && !isRejectLoading) {
      // FIX 3: Pass residentId, not id
      await onReject(accountDetails.residentId);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading && !isApproveLoading && !isRejectLoading) {
      onClose();
    }
  };

  const handleImageClick = () => {
    setIsImageViewerOpen(true);
  };

  const handleCloseImageViewer = () => {
    setIsImageViewerOpen(false);
  };

  const handleImageViewerBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseImageViewer();
    }
  };

  const handleImageViewerModalClick = (e) => {
    // Prevent closing when clicking inside the modal content
    e.stopPropagation();
  };

  return (
    <>
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
          className="relative bg-white rounded-2xl shadow-sm max-w-2xl w-full mx-auto overflow-hidden ring-1 ring-black/5"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Clock className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Pending Account Details</h2>
                  <p className="text-sm text-slate-600">Review and manage resident registration</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                disabled={loading || isApproveLoading || isRejectLoading}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                <span className="ml-3 text-slate-600">Loading account details...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Profile Section */}
                <div className="bg-gradient-to-r from-[#122361] to-[#2f84c0] rounded-xl p-6 border border-[#d8def2]">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-xl text-[#122361]">
                      {accountDetails.firstName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {accountDetails.firstName} {accountDetails.middleName && accountDetails.middleName + ' '}{accountDetails.lastName}
                      </h3>
                      <p className="text-[#d8def2] flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {accountDetails.residentEmail}
                      </p>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30 mt-2">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending Approval
                      </span>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">First Name</label>
                        <p className="text-sm font-medium text-slate-900">{accountDetails.firstName || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Middle Name</label>
                        <p className="text-sm font-medium text-slate-900">{accountDetails.middleName || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last Name</label>
                        <p className="text-sm font-medium text-slate-900">{accountDetails.lastName || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email Address</label>
                        <p className="text-sm font-medium text-slate-900">{accountDetails.residentEmail || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone Number</label>
                        <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {accountDetails.phoneNumber || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Address Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Region</label>
                        <p className="text-sm font-medium text-slate-900">{accountDetails.region || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Province</label>
                        <p className="text-sm font-medium text-slate-900">{accountDetails.province || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">City/Municipality</label>
                        <p className="text-sm font-medium text-slate-900">{accountDetails.city || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Barangay</label>
                        <p className="text-sm font-medium text-slate-900">{accountDetails.barangay || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sitio</label>
                        <p className="text-sm font-medium text-slate-900">{accountDetails.sitio || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Address Line</label>
                        <p className="text-sm font-medium text-slate-900">{accountDetails.addressLine1 || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valid ID Document - Secure Viewing Section */}
                {(() => {
                  const validIdPath = getValidIdPath(accountDetails);
                  
                  // Debug logging for troubleshooting
                  console.log('=== PENDING ACCOUNT MODAL DEBUG ===');
                  console.log('Account Details:', accountDetails);
                  console.log('Valid ID Path found:', validIdPath);
                  console.log('Account ID:', accountDetails.residentId || accountDetails.id);
                  
                  return validIdPath ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Valid ID Document
                      </h4>
                      <div className="space-y-4">
                        {isPdfFile(validIdPath) ? (
                          // PDF Document Display (no longer accepted)
                          <div className="border border-red-200 rounded-lg overflow-hidden">
                            <div className="bg-red-50 border-b border-red-200 p-4 text-center">
                              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <User className="w-8 h-8 text-red-600" />
                              </div>
                              <h5 className="text-sm font-semibold text-red-800">Unsupported PDF Document</h5>
                              <p className="text-xs text-red-600 mt-1">PDF files are no longer accepted for valid ID</p>
                            </div>
                            <div className="p-4 bg-slate-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-slate-600" />
                                  <span className="text-sm text-slate-700 font-medium">
                                    Legacy PDF Document - For Archive Only
                                  </span>
                                </div>
                                <button
                                  onClick={handleImageClick}
                                  className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
                                >
                                  View Legacy PDF
                                </button>
                              </div>
                              <p className="text-xs text-slate-500 mt-2">
                                PDF documents are no longer accepted. Please ask resident to resubmit with image file (PNG, JPG, JPEG).
                              </p>
                            </div>
                          </div>
                        ) : isImageFile(validIdPath) ? (
                          // Image Document Display (PNG, JPG, JPEG only)
                          <div className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:border-[#9eaddd] transition-colors" onClick={handleImageClick}>
                            <img
                              src={buildImageUrl(validIdPath)}
                              alt="Valid ID Document - Image File"
                              className="w-full h-auto max-h-96 object-contain bg-slate-50 hover:opacity-90 transition-opacity"
                              onError={(e) => {
                                console.error('Failed to load valid ID image:', validIdPath);
                                console.error('Tried URL:', buildImageUrl(validIdPath));
                                e.target.src = '/documents/no-preview.png';
                              }}
                              onLoad={() => {
                                console.log('Successfully loaded valid ID image:', validIdPath);
                                console.log('Loaded from URL:', buildImageUrl(validIdPath));
                              }}
                            />
                          </div>
                        ) : (
                          // Unknown file type
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="bg-yellow-50 border-b border-yellow-200 p-4 text-center">
                              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <User className="w-8 h-8 text-yellow-600" />
                              </div>
                              <h5 className="text-sm font-semibold text-yellow-800">Unknown File Type</h5>
                              <p className="text-xs text-yellow-600 mt-1">
                                File: {validIdPath.split('/').pop()}
                              </p>
                            </div>
                            <div className="p-4 bg-slate-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-slate-600" />
                                  <span className="text-sm text-slate-700 font-medium">
                                    Unsupported file format
                                  </span>
                                </div>
                                <button
                                  onClick={handleImageClick}
                                  className="px-3 py-1 bg-yellow-600 text-white text-xs font-medium rounded-md hover:bg-yellow-700 transition-colors"
                                >
                                  Try to View
                                </button>
                              </div>
                              <p className="text-xs text-slate-500 mt-2">
                                This file type may not be supported for in-browser viewing.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Action buttons for all file types */}
                        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-amber-600" />
                            <p className="text-sm text-amber-800 font-medium">
                              For Review Only - No Download
                            </p>
                          </div>
                          <button
                            onClick={handleImageClick}
                            className="px-3 py-1 bg-amber-600 text-white text-xs font-medium rounded-md hover:bg-amber-700 transition-colors"
                          >
                            {isPdfFile(validIdPath) ? 'View Legacy PDF' : 'View Full Size'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 text-center">
                          Click to view full size. Document viewing is logged for security purposes.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Valid ID Document
                      </h4>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <User className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">
                          {accountDetails.status === 'REJECTED' ? 'Valid ID document unavailable' : 'No valid ID document uploaded'}
                        </p>
                        <p className="text-sm text-slate-400 mt-2">
                          {accountDetails.status === 'REJECTED'
                            ? 'A valid ID was previously uploaded but the file is no longer accessible. This may indicate a file storage issue.'
                            : 'This resident did not upload a valid ID during registration.'
                          }
                        </p>
                        {/* Debug info for development */}
                        {process.env.NODE_ENV === 'development' && (
                          <details className="mt-4 text-left">
                            <summary className="text-xs text-slate-400 cursor-pointer">Debug Info</summary>
                            <pre className="text-xs text-slate-400 mt-2 bg-slate-50 p-2 rounded overflow-auto">
                              {JSON.stringify({
                                residentId: accountDetails.residentId || accountDetails.id,
                                status: accountDetails.status,
                                availableFields: Object.keys(accountDetails),
                                searchedFields: ['validIdPath', 'validId', 'idDocumentPath', 'documentPath']
                              }, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Registration Information */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Registration Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Registration Date</label>
                      <p className="text-sm font-medium text-slate-900">
                        {accountDetails.createdAt ? formatDate(accountDetails.createdAt) : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Registration Time</label>
                      <p className="text-sm font-medium text-slate-900">
                        {accountDetails.createdAt ? formatTime(accountDetails.createdAt) : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {!loading && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={handleReject}
                disabled={isApproveLoading || isRejectLoading}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${
                  isRejectLoading
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isRejectLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                {isRejectLoading ? 'Rejecting...' : 'Reject Account'}
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproveLoading || isRejectLoading}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${
                  isApproveLoading
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isApproveLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                {isApproveLoading ? 'Approving...' : 'Approve Account'}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Secure Image Viewer Modal */}
      <AnimatePresence>
        {isImageViewerOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={handleImageViewerBackdropClick}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={handleImageViewerBackdropClick}
            />

            {/* Image Viewer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white rounded-2xl shadow-sm max-w-4xl max-h-[90vh] w-full mx-auto overflow-hidden"
              onClick={handleImageViewerModalClick}
            >
              {/* Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Valid ID Document - Secure Review</h3>
                  <p className="text-xs text-slate-600 mt-1">This document is for verification purposes only</p>
                </div>
                <button
                  onClick={handleCloseImageViewer}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Security Notice */}
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-800">
                    <strong>Security Notice:</strong> This document contains sensitive personal information.
                    Viewing is logged for audit purposes. Do not screenshot or share this document.
                  </p>
                </div>
              </div>

              {/* Content based on file type */}
              <div className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
                {(() => {
                  const validIdPath = getValidIdPath(accountDetails);
                  
                  if (isPdfFile(validIdPath)) {
                    // PDF Display using iframe (no longer accepted)
                    return (
                      <div className="w-full h-[70vh]">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 h-full flex flex-col justify-center items-center text-center">
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="w-8 h-8 text-red-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-red-800 mb-2">Legacy PDF Document</h3>
                          <p className="text-sm text-red-600 mb-4">
                            PDF files are no longer accepted for valid ID verification.
                          </p>
                          <p className="text-xs text-red-500">
                            Please ask the resident to resubmit with an image file (PNG, JPG, or JPEG).
                          </p>
                        </div>
                      </div>
                    );
                  } else {
                    // Image Display
                    return (
                      <img
                        src={buildImageUrl(validIdPath)}
                        alt="Valid ID Document - Full Size"
                        className="w-full h-auto object-contain bg-slate-50 rounded-lg"
                        onError={(e) => {
                          const validIdPath = getValidIdPath(accountDetails);
                          console.error('Failed to load valid ID image in viewer:', validIdPath);
                          console.error('Tried URL in viewer:', buildImageUrl(validIdPath));
                          e.target.src = '/documents/no-preview.png';
                        }}
                        onLoad={() => {
                          console.log('Successfully loaded valid ID image in viewer');
                        }}
                      />
                    );
                  }
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}