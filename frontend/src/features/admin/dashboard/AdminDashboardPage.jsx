'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboardWorkspace from '@/features/admin/dashboard/AdminDashboardWorkspace';
import RequestDetailsModal from '@/shared/components/modals/RequestDetailsModal';
import RejectionReasonModal from '@/shared/components/modals/RejectionReasonModal';
import { getResponseErrorMessage, getStoredJson } from '@/shared/lib/api';

export default function AdminDashboardPage({
  apiBase = '/api/admin',
  basePath = 'admin',
  allowedRoles = ['ADMIN', 'SUPER_ADMIN'],
  redirectForRole = {},
  loadingText = 'Loading Admin Panel...',
  roleLabel = 'Admin Panel',
  quickActionMode = 'admin',
}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  // Real data states
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalRequests: 0,
    pendingRequests: 0,
    pendingResidents: 0,
    totalAnnouncements: 0,
    activeAnnouncements: 0
  });
  const [recentDocRequests, setRecentDocRequests] = useState([]);
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [requestsError, setRequestsError] = useState(null);

  // Modal state for request details
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [requestModalLoading, setRequestModalLoading] = useState(false);

  // Modal state for rejection reason
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionItem, setRejectionItem] = useState(null);
  const [rejectionType, setRejectionType] = useState(null); // 'request' or 'account'

  // Announcement states
  const [announcements, setAnnouncements] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState('MEDIUM');
  const [announcementStartDate, setAnnouncementStartDate] = useState('');
  const [announcementEndDate, setAnnouncementEndDate] = useState('');
  const [announcementIsVisible, setAnnouncementIsVisible] = useState(true);
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Loading states for approve/reject actions
  const [actionLoading, setActionLoading] = useState({ approve: false, reject: false, accountId: null });

  const API_BASE = apiBase;

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Close notification
  const closeNotification = () => {
    setNotification({ show: false, message: '', type: 'success' });
  };

  // Set action loading state
  const setActionLoadingState = (action, accountId, isLoading) => {
    setActionLoading(prev => ({
      ...prev,
      [action]: isLoading,
      accountId: isLoading ? accountId : null
    }));
  };

  // Function to handle posting announcement
  const handlePostAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      showNotification('Please fill in both title and content fields', 'error');
      return;
    }

    try {
      setAnnouncementLoading(true);
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(`${API_BASE}/announcements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: announcementTitle.trim(),
          content: announcementContent.trim(),
          priority: announcementPriority,
          startDate: announcementStartDate ? new Date(announcementStartDate).toISOString() : null,
          endDate: announcementEndDate ? new Date(announcementEndDate).toISOString() : null,
          isVisible: announcementIsVisible,
          postedBy: currentUser.firstName + ' ' + currentUser.lastName
        })
      });

      if (response.ok) {
        const newAnnouncement = await response.json();
        setAnnouncements(prev => [newAnnouncement, ...prev]);
        setAnnouncementTitle('');
        setAnnouncementContent('');
        setAnnouncementPriority('MEDIUM');
        setAnnouncementStartDate('');
        setAnnouncementEndDate('');
        setAnnouncementIsVisible(true);
        showNotification('Announcement posted successfully!', 'success');
        fetchDashboardData(); // Refresh stats
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to post announcement:', errorData.message || response.statusText);
        showNotification(errorData.message || 'Failed to post announcement. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error posting announcement:', error);
      showNotification('Error connecting to server. Please check your internet connection.', 'error');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  // Function to fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/announcements`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const announcementsData = await response.json();
        setAnnouncements(announcementsData);
      } else {
        const errorMessage = await getResponseErrorMessage(response, 'Failed to fetch announcements');
        console.error('Failed to fetch announcements:', errorMessage);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);
      setRequestsError(null);
      const token = localStorage.getItem('token');

      // Fetch summary statistics
      const summaryResponse = await fetch(`${API_BASE}/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setStats({
          totalResidents: summaryData.totalResidents || 0,
          totalRequests: summaryData.totalRequests || 0,
          pendingRequests: summaryData.pendingRequests || 0,
          pendingResidents: summaryData.pendingResidents || 0,
          totalAnnouncements: summaryData.totalAnnouncements || 0,
          activeAnnouncements: summaryData.activeAnnouncements || 0
        });
      }

      // Fetch recent document requests using the new enhanced endpoint
      const requestsResponse = await fetch(`${API_BASE}/recent-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        const recentRequests = requestsData.map(req => {
          // Extract resident name from the nested object structure
          let residentName = 'Unknown Resident';
          if (req.resident) {
            if (req.resident.fullName && req.resident.fullName.trim()) {
              residentName = req.resident.fullName;
            } else if (req.resident.firstName && req.resident.lastName) {
              residentName = [req.resident.firstName, req.resident.lastName].filter(name => name && name.trim()).join(' ').trim();
            } else if (req.resident.firstName || req.resident.lastName) {
              residentName = [req.resident.firstName, req.resident.lastName].filter(name => name && name.trim()).join(' ').trim();
            }
          }
          
          return {
            id: req.requestId,
            resident: residentName,
            email: req.resident?.email || '',
            documentName: req.documentName || 'Unknown Document',
            details: req.details || '',
            // Format: "Oct 24, 2023"
            date: req.submittedAt ? new Date(req.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
            // Format: "10:30 AM"
            time: req.submittedAt ? new Date(req.submittedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'N/A',
            // Format full datetime for sorting and detailed view
            submittedAt: req.submittedAt,
            status: req.status
          };
        });
        setRecentDocRequests(recentRequests);
      } else {
        const errorMessage = await getResponseErrorMessage(requestsResponse, 'Failed to fetch recent requests');
        console.error('Failed to fetch recent requests:', errorMessage);
        setRequestsError(errorMessage || 'Failed to load recent requests');
        setRecentDocRequests([]);
      }

      // Fetch pending resident approvals
      const residentRequestsResponse = await fetch(`${API_BASE}/resident-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (residentRequestsResponse.ok) {
        const residentRequestsData = await residentRequestsResponse.json();
        const formattedData = residentRequestsData.map(resident => ({
          id: resident.residentId,
          name: resident.firstName + ' ' + resident.lastName,
          email: resident.residentEmail,
          date: new Date(resident.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        }));
        setPendingAccounts(formattedData);
      }

      // Fetch announcements
      await fetchAnnouncements();

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setRequestsError('Failed to connect to server. Please check your internet connection.');
      setRecentDocRequests([]);
    } finally {
      setDataLoading(false);
    }
  };

  // Function to fetch request details
  const fetchRequestDetails = async (requestId) => {
    try {
      setRequestModalLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const request = await response.json();
        setRequestDetails({
          id: request.id,
          requestId: request.requestId,
          documentId: request.documentId,
          documentName: request.documentName,
          details: request.details,
          status: request.status,
          submittedAt: request.submittedAt,
          updatedAt: request.updatedAt,
          resident: request.resident?.fullName || 'Unknown Resident',
          email: request.resident?.email || '',
          attachmentCount: request.attachmentCount || 0
        });
      } else {
        console.error('Failed to fetch request details:', response.statusText);
        setRequestDetails(null);
        showNotification('Failed to load request details', 'error');
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      setRequestDetails(null);
      showNotification('Error loading request details', 'error');
    } finally {
      setRequestModalLoading(false);
    }
  };

  // Function to handle viewing request details
  const handleViewRequestDetails = (request) => {
    setSelectedRequest(request);
    setIsRequestModalOpen(true);
    fetchRequestDetails(request.id);
  };

  // Function to handle viewing account details
  const handleViewAccountDetails = (account) => {
    router.push(`/${basePath}/management?tab=resident-requests&residentId=${account.id}`);
  };

  // Function to close request modal
  const handleCloseRequestModal = () => {
    setIsRequestModalOpen(false);
    setSelectedRequest(null);
    setRequestDetails(null);
  };

  // Function to close rejection modal
  const handleCloseRejectionModal = () => {
    setIsRejectionModalOpen(false);
    setRejectionItem(null);
    setRejectionType(null);
  };

  // Function to handle request approval
  const handleApproveRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Close modal and refresh data
        setIsRequestModalOpen(false);
        setSelectedRequest(null);
        setRequestDetails(null);
        fetchDashboardData();
        showNotification('Request approved successfully!', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to approve request:', errorData.message || response.statusText);
        showNotification(errorData.message || 'Failed to approve request. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      showNotification('Error connecting to server. Please check your internet connection.', 'error');
    }
  };

  // Function to handle request rejection - open rejection modal
  const handleRejectRequest = (requestId) => {
    const request = recentDocRequests.find(req => req.id === requestId);
    setRejectionItem(request);
    setRejectionType('request');
    setIsRejectionModalOpen(true);
  };

  // Function to handle actual rejection with reason
  const handleRejectWithReason = async (reason) => {
    if (!rejectionItem || !rejectionType) return;

    try {
      setActionLoadingState('reject', rejectionItem.id, true);
      const token = localStorage.getItem('token');
      
      let apiEndpoint;
      let requestBody;

      if (rejectionType === 'request') {
        apiEndpoint = `${API_BASE}/requests/${rejectionItem.id}/reject`;
        requestBody = { rejectionReason: reason };
      }

      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        // Close all modals and refresh data
        setIsRequestModalOpen(false);
        setSelectedRequest(null);
        setRequestDetails(null);
        setIsRejectionModalOpen(false);
        setRejectionItem(null);
        setRejectionType(null);
        fetchDashboardData();
        showNotification('Request rejected successfully!', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to reject item:', errorData.message || response.statusText);
        showNotification(errorData.message || `Failed to reject ${rejectionType}. Please try again.`, 'error');
      }
    } catch (error) {
      console.error('Error rejecting item:', error);
      showNotification('Error connecting to server. Please check your internet connection.', 'error');
    } finally {
      setActionLoadingState('reject', rejectionItem.id, false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const storedUser = getStoredJson('user');

    if (!token || !allowedRoles.includes(role)) {
      router.push(redirectForRole[role] || '/');
      return;
    }

    setUser(storedUser);
    setLoading(false);
    fetchDashboardData();
  }, [allowedRoles, redirectForRole, router]);

  const handleManageResidents = () => router.push(`/${basePath}/management`);
  const handleReviewPendingAccounts = () => router.push(`/${basePath}/management?tab=resident-requests`);
  const handleViewNotifications = () => router.push(`/${basePath}/notifications`);
  const handleViewDocuments = () => router.push(`/${basePath}/documents`);
  const handleViewAllAnnouncements = () => router.push(`/${basePath}/announcements`);
  const handleViewAllRequests = () => router.push(`/${basePath}/management?tab=document-requests`);
  const handleAddAdmin = () => router.push('/superadmin/management?tab=administrators&action=addAdmin');
  const handleAddDocument = () => {
    window.dispatchEvent(new CustomEvent('reserbayan:open-add-document-modal', {
      detail: { basePath: `/${basePath}` },
    }));
  };

  const handleReadyForPickupRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/requests/${requestId}/ready-for-pickup`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsRequestModalOpen(false);
        setSelectedRequest(null);
        setRequestDetails(null);
        fetchDashboardData();
        showNotification('Request marked ready for pickup.', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(errorData.message || 'Failed to mark request ready for pickup. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error marking request ready for pickup:', error);
      showNotification('Error connecting to server. Please check your internet connection.', 'error');
    }
  };

  const handleCompleteRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/requests/${requestId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsRequestModalOpen(false);
        setSelectedRequest(null);
        setRequestDetails(null);
        fetchDashboardData();
        showNotification('Request marked as completed.', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(errorData.message || 'Failed to complete request. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error completing request:', error);
      showNotification('Error connecting to server. Please check your internet connection.', 'error');
    }
  };

  const quickActions = quickActionMode === 'superadmin'
    ? [
        { icon: 'admin', label: 'New Admin', onClick: handleAddAdmin },
        { icon: 'documents', label: 'Add Document', onClick: handleAddDocument },
        { icon: 'residents', label: 'Residents', onClick: handleManageResidents },
        { icon: 'requests', label: 'Requests', onClick: handleViewAllRequests },
        { icon: 'announcements', label: 'Announcements', onClick: handleViewAllAnnouncements },
        { icon: 'notifications', label: 'Notifications', onClick: handleViewNotifications },
      ]
    : [
        { icon: 'residents', label: 'Residents', onClick: handleManageResidents },
        { icon: 'requests', label: 'Requests', onClick: handleViewAllRequests },
        { icon: 'documents', label: 'Documents', onClick: handleViewDocuments },
        { icon: 'announcements', label: 'Announcements', onClick: handleViewAllAnnouncements },
        { icon: 'notifications', label: 'Notifications', onClick: handleViewNotifications },
      ];

  return (
    <>
      <AdminDashboardWorkspace
        loading={loading}
        loadingText={loadingText}
        roleLabel={roleLabel}
        user={user}
        stats={stats}
        dataLoading={dataLoading}
        notification={notification}
        onCloseNotification={closeNotification}
        quickActions={quickActions}
        recentDocRequests={recentDocRequests}
        pendingAccounts={pendingAccounts}
        requestsError={requestsError}
        onViewRequest={handleViewRequestDetails}
        onViewAccount={handleViewAccountDetails}
        onViewAllRequests={handleViewAllRequests}
        onViewPendingAccounts={handleReviewPendingAccounts}
        announcementTitle={announcementTitle}
        announcementContent={announcementContent}
        announcementPriority={announcementPriority}
        announcementStartDate={announcementStartDate}
        announcementEndDate={announcementEndDate}
        announcementIsVisible={announcementIsVisible}
        announcementLoading={announcementLoading}
        onAnnouncementTitleChange={setAnnouncementTitle}
        onAnnouncementContentChange={setAnnouncementContent}
        onAnnouncementPriorityChange={setAnnouncementPriority}
        onAnnouncementStartDateChange={setAnnouncementStartDate}
        onAnnouncementEndDateChange={setAnnouncementEndDate}
        onAnnouncementVisibilityChange={setAnnouncementIsVisible}
        onPostAnnouncement={handlePostAnnouncement}
        onViewAllAnnouncements={handleViewAllAnnouncements}
      />

      <RequestDetailsModal
        isOpen={isRequestModalOpen}
        onClose={handleCloseRequestModal}
        requestDetails={requestDetails}
        loading={requestModalLoading}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        onReadyForPickup={handleReadyForPickupRequest}
        onComplete={handleCompleteRequest}
      />

      <RejectionReasonModal
        isOpen={isRejectionModalOpen}
        onClose={handleCloseRejectionModal}
        onSubmit={handleRejectWithReason}
        title={`Reject ${rejectionType === 'request' ? 'Document Request' : 'Account Registration'}`}
        itemName={rejectionType === 'request' ? rejectionItem?.documentName : rejectionItem?.name}
        loading={actionLoading.reject && actionLoading.accountId === rejectionItem?.id}
      />
    </>
  );
}
