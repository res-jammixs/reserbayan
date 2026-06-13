import { useState } from 'react';
import { X, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import ViewDetailsModal from './ViewDetailsModal';
import EditDetailsModal from './EditDetailsModal';

export default function AccountActivityModal({ isOpen, onClose, user, onResubmit }) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  if (!isOpen || !user) return null;

  const getStatusInfo = () => {
    switch (user.status?.toLowerCase()) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'Account Under Review',
          message: 'Your account registration is currently being reviewed by our administrators. You will be notified once the review is complete.',
          canResubmit: false
        };
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Account Approved',
          message: 'Congratulations! Your account has been approved and is now active. You can now request documents and access all features.',
          canResubmit: false
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Account Needs Review',
          message: 'Your account registration requires some updates. Please review and resubmit your information.',
          canResubmit: true
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Account Status',
          message: 'Your account status is being processed.',
          canResubmit: false
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="activity-modal-title">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose}></div>

        <div className="relative mx-auto p-2 sm:p-4 max-w-2xl h-full flex items-center justify-center">
          <motion.div
            className="bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto shadow-sm border border-gray-200"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#eef3ff] to-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`bg-gradient-to-r ${statusInfo.bgColor} p-2 w-10 h-10 flex-shrink-0 flex items-center justify-center shadow-sm rounded-lg`}>
                    <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} aria-hidden="true" />
                  </div>
                  <h2 id="activity-modal-title" className="font-bold text-2xl text-[#00114e]">
                    {statusInfo.title}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className={`p-4 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon className={`w-5 h-5 ${statusInfo.color} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className="text-gray-800 leading-relaxed">{statusInfo.message}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Full Name</p>
                    <p className="font-medium text-gray-900">
                      {user.firstName} {user.middleName} {user.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{user.residentEmail}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className={`font-medium capitalize ${
                      user.status?.toLowerCase() === 'approved' ? 'text-green-600' :
                      user.status?.toLowerCase() === 'pending' ? 'text-yellow-600' :
                      user.status?.toLowerCase() === 'rejected' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {user.status || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Registration Date</p>
                    <p className="font-medium text-gray-900">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {user.status?.toLowerCase() === 'rejected' && user.rejectionReason && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Rejection Reason
                  </h3>
                  <p className="text-red-800">{user.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
              >
                Close
              </button>
              <button
                onClick={() => setShowDetailsModal(true)}
                className="px-6 py-2 bg-[#243b8e] text-white rounded-lg hover:bg-[#122361] transition-colors font-medium shadow-sm"
              >
                View Details
              </button>
              {statusInfo.canResubmit && (
                <button
                  onClick={() => {
                    setShowEditModal(true);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
                >
                  Resubmit Application
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* View Details Modal */}
      <ViewDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        resident={user}
        title="Account Details"
      />

      {/* Edit Details Modal */}
      <EditDetailsModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        resident={user}
        onSubmit={async (formData) => {
          // Handle resubmission
          try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/auth/resubmit', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
              body: formData,
            });

            // Check if response is ok
            if (!response.ok) {
              let errorMessage = 'Failed to resubmit application. Please try again.';
              try {
                // Try to get error details
                const responseText = await response.text();
                if (responseText) {
                  try {
                    const errorData = JSON.parse(responseText);
                    if (errorData.message) {
                      errorMessage = errorData.message;
                    }
                  } catch (jsonError) {
                    // If not JSON, use the text directly
                    errorMessage = responseText;
                  }
                }
              } catch (parseError) {
                console.warn('Could not parse error response:', parseError);
              }
              alert(errorMessage);
              return;
            }

            // Parse successful response
            const data = await response.json();

            if (data.success) {
              // Update localStorage with new user data
              localStorage.setItem('user', JSON.stringify(data.user));
              // Dispatch userUpdated event to update context
              window.dispatchEvent(new CustomEvent('userUpdated', { detail: data.user }));
              // Close modals
              setShowEditModal(false);
              onClose();
            } else {
              alert(data.message || 'Failed to resubmit application. Please try again.');
            }
          } catch (error) {
            console.error('Error resubmitting:', error);
            alert('Network error: Please check your connection and try again.');
          }
        }}
      />
    </>
  );
}