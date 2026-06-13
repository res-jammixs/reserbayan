'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, FileText, Plus, ArrowRight, Calendar, Megaphone, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { useRequestDrawer } from '@/contexts/RequestDrawerContext';
import { useRequests } from '@/hooks/useRequests';
import PendingRestrictionModal from '@/app/components/PendingRestrictionModal';
import RequestModal from '@/app/components/requests/RequestModal'; // Detail View
import RequestFormModal from '@/app/components/requests/RequestFormModal'; // Create View
import AccountActivityModal from '@/app/components/AccountActivityModal';
import RejectedResubmitModal from '@/app/components/RejectedResubmitModal';
import AnnouncementModal from '@/app/components/AnnouncementModal';
import { StatusBadge } from '@/shared/components/ui/StatusBadge';

function isAnnouncementVisibleNow(announcement) {
  const now = new Date();
  const startDate = announcement?.startDate ? new Date(announcement.startDate) : null;
  const endDate = announcement?.endDate ? new Date(announcement.endDate) : null;

  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;

  return true;
}

export default function DashboardPage() {
  const { user } = useUser();
  const {
    draft: documentDetailRequestDraft,
    hasDraft: hasDocumentDetailRequestDraft,
    restoreRequest,
    discardRequest,
  } = useRequestDrawer();
  const { requests, loading, refetchRequests, cancelRequest } = useRequests(user);
  const router = useRouter();
  
  // Get user role for admin/superadmin redirects
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  
  // Modals state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);
  const [showAccountActivityModal, setShowAccountActivityModal] = useState(false);
  const [showExistingRequestPrompt, setShowExistingRequestPrompt] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [expandedAnnouncements, setExpandedAnnouncements] = useState(new Set());
  const [showLatestAnnouncementModal, setShowLatestAnnouncementModal] = useState(false);

  const recentRequests = useMemo(() => {
    return requests
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 3);
  }, [requests]);

  // Fetch announcements for residents
  const fetchAnnouncements = async () => {
    try {
      setAnnouncementsLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const response = await fetch('/api/residents/announcements', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const responseData = await response.json();
        // Extract the announcements array from the response
        const announcementsList = (responseData.announcements || []).filter(isAnnouncementVisibleNow);
        console.log('Fetched announcements:', announcementsList.length, announcementsList);
        setAnnouncements(announcementsList);
      } else {
        if (response.status !== 401 && response.status !== 403) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.warn('Failed to fetch announcements:', response.status, response.statusText, errorText);
        }
        setAnnouncements([]);
      }
    } catch (error) {
      console.warn('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  // Toggle announcement card expansion
  const toggleAnnouncementExpansion = (announcementId) => {
    setExpandedAnnouncements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(announcementId)) {
        newSet.delete(announcementId);
      } else {
        newSet.add(announcementId);
      }
      return newSet;
    });
  };

  const formatAnnouncementDate = (dateValue) => {
    if (!dateValue) return 'Date unavailable';
    return new Date(dateValue).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAnnouncementTime = (dateValue) => {
    if (!dateValue) return '';
    return new Date(dateValue).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatAnnouncementRange = (announcement) => {
    if (announcement.startDate && announcement.endDate) {
      return `${formatAnnouncementDate(announcement.startDate)} - ${formatAnnouncementDate(announcement.endDate)}`;
    }
    if (announcement.startDate) {
      return `Starts ${formatAnnouncementDate(announcement.startDate)}`;
    }
    if (announcement.endDate) {
      return `Until ${formatAnnouncementDate(announcement.endDate)}`;
    }
    return 'Available now';
  };

  const latestActiveAnnouncement = useMemo(() => {
    return announcements
      .filter(isAnnouncementVisibleNow)
      .sort((firstAnnouncement, secondAnnouncement) => (
        new Date(secondAnnouncement.createdAt) - new Date(firstAnnouncement.createdAt)
      ))[0] || null;
  }, [announcements]);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user]);

  useEffect(() => {
    if (announcementsLoading) return;

    const shouldShowModal = sessionStorage.getItem('showDashboardAnnouncementModal') === 'true';
    if (!shouldShowModal) return;

    if (latestActiveAnnouncement) {
      setShowLatestAnnouncementModal(true);
    } else {
      sessionStorage.removeItem('showDashboardAnnouncementModal');
      setShowLatestAnnouncementModal(false);
    }
  }, [announcementsLoading, latestActiveAnnouncement]);

  const dismissLatestAnnouncementModal = () => {
    sessionStorage.removeItem('showDashboardAnnouncementModal');
    setShowLatestAnnouncementModal(false);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openActivity') === 'true') {
      setShowAccountActivityModal(true);
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);



  if (!user) {
    return null;
  }

  return (
    <motion.div
      className="pt-24 px-4 min-h-screen bg-[#FAFAFA] pb-6"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Welcome Section */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="font-extrabold text-2xl md:text-3xl text-[#00114e]">
                Welcome back, {user.firstName}!
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-600 leading-snug">
              Manage your requests, track recent activity, and review announcements at a glance.
            </p>
          </div>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                <h2 className="font-bold text-lg text-gray-800 mb-3">Quick Actions</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      if (user.status === 'PENDING') {
                        setShowPendingModal(true);
                        return;
                      }
                      if (user.status === 'REJECTED') {
                        setShowRejectedModal(true);
                        return;
                      }
                      if (hasDocumentDetailRequestDraft) {
                        setShowExistingRequestPrompt(true);
                        return;
                      }
                      setShowRequestModal(true);
                    }}
                    className="bg-gradient-to-r from-[#122361] to-[#2f84c0] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Request Document</span>
                  </button>

                  <Link
                    href="/documents"
                    className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-semibold text-sm hover:border-[#2f84c0] hover:bg-[#eef3ff] transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <FileText className="w-5 h-5" />
                    <span>Browse Documents</span>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            >
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4">
                  <h2 className="font-bold text-lg text-gray-800 mb-3">Recent Activity</h2>
                  {loading ? (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-8 text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#243b8e] mx-auto mb-4"></div>
                      <p className="text-gray-600 text-sm">Loading your recent requests...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Account Activity */}
                      {(user.status?.toLowerCase() === 'pending' || user.status?.toLowerCase() === 'approved' || user.status?.toLowerCase() === 'rejected') && (
                        <motion.div
                          onClick={() => setShowAccountActivityModal(true)}
                          className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-sm transition-all duration-300 cursor-pointer"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-r from-[#122361] to-[#2f84c0] text-white rounded-xl p-2.5 w-10 h-10 flex items-center justify-center shadow-sm">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm md:text-base">Account Registration</h4>
                              <p className="text-xs md:text-sm text-gray-600 flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1" />
                                {user.status?.toLowerCase() === 'pending' ? 'Under review by administrators' :
                                 user.status?.toLowerCase() === 'approved' ? 'Approved and active' :
                                 'Requires resubmission'}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={user.status} size="sm" />
                        </motion.div>
                      )}

                      {/* Document Requests */}
                      {recentRequests.map((request, index) => (
                        <motion.div
                          key={request.requestId}
                          onClick={() => setViewRequest(request)}
                          className="flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-sm transition-all duration-300 cursor-pointer"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-r from-[#122361] to-[#2f84c0] text-white rounded-lg p-2 w-9 h-9 flex items-center justify-center shadow-sm">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm md:text-base">{request.documentName}</h4>
                              <p className="text-xs md:text-sm text-gray-600 flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1" />
                                Submitted {new Date(request.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={request.status} size="sm" />
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {recentRequests.length > 0 && (
                    <div className="mt-5 text-center">
                      {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') ? (
                        <button
                          onClick={() => {
                            const managementPath = userRole === 'SUPER_ADMIN' ? '/superadmin/management' : '/admin/management';
                            router.push(`${managementPath}?tab=document-requests`);
                          }}
                          className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#122361] to-[#2f84c0] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5"
                        >
                          <span>View All Requests</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <Link
                          href="/requests"
                          className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#122361] to-[#2f84c0] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5"
                        >
                          <span>View All Requests</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Announcements Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#eef3ff] rounded-md border border-[#d8def2]">
                    <Megaphone className="w-3.5 h-3.5 text-[#122361]" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-[#00114e]">Announcements</h2>
                      <p className="text-[11px] font-medium text-slate-500">Latest barangay updates</p>
                    </div>
                  </div>
                  {announcements.length > 0 && (
                    <span className="rounded-full border border-[#d8def2] bg-white px-2 py-0.5 text-[11px] font-bold text-[#122361]">
                      {announcements.length}
                    </span>
                  )}
                </div>

                {announcementsLoading ? (
                  <div className="rounded-lg border border-gray-100 bg-white p-6 text-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#122361] mx-auto mb-3"></div>
                    <p className="text-gray-600 text-xs font-medium">Loading announcements...</p>
                  </div>
                ) : announcements.length > 0 ? (
                  <div>
                    <div className="space-y-2.5">
                      {announcements.slice(0, 3).map((announcement, index) => {
                        const isExpanded = expandedAnnouncements.has(announcement.announcementId);
                        const announcedDate = formatAnnouncementDate(announcement.createdAt);
                        const announcedTime = formatAnnouncementTime(announcement.createdAt);
                        const visiblePeriod = formatAnnouncementRange(announcement);
                        
                        return (
                          <motion.div
                            key={announcement.announcementId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 * index }}
                            className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-300 hover:border-[#c2cbea]"
                          >
                            <div className="border-b border-slate-100 bg-white px-3 py-2.5">
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex flex-wrap items-center gap-2">
                                    {announcement.priority && (
                                      <span className="rounded-full border border-[#d8def2] bg-[#fafafa] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#243b8e]">
                                        {announcement.priority}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      Announced {announcedDate}{announcedTime ? `, ${announcedTime}` : ''}
                                    </span>
                                  </div>
                                  <h4 className="mt-0.5 font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                                    {announcement.title}
                                  </h4>
                                </div>
                              
                                <button
                                  onClick={() => toggleAnnouncementExpansion(announcement.announcementId)}
                                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-transparent text-[#122361] transition-all duration-200 hover:border-[#d8def2] hover:bg-[#fafafa]"
                                  aria-label={isExpanded ? 'Collapse announcement' : 'Expand announcement'}
                                  aria-expanded={isExpanded}
                                  aria-controls={`announcement-content-${announcement.announcementId}`}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="bg-white px-3 py-2.5">
                              <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Details</p>
                              <motion.div
                                id={`announcement-content-${announcement.announcementId}`}
                                initial={false}
                                animate={{
                                  height: isExpanded ? 'auto' : 0,
                                  opacity: isExpanded ? 1 : 0
                                }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {announcement.content}
                                </p>
                              </motion.div>
                              
                              {!isExpanded && (
                                <p className="text-xs text-gray-700 leading-relaxed line-clamp-2 transition-colors">
                                  {announcement.content}
                                </p>
                              )}
                            </div>

                            <div className="grid gap-2 border-t border-slate-100 bg-[#fafafa] px-3 py-2 text-[10px] font-semibold text-slate-500 sm:grid-cols-2">
                              <div>
                                <p className="mb-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Posted By</p>
                                <div className="flex items-center gap-1.5 text-[#122361]">
                                  <Megaphone className="h-3 w-3" />
                                  <span className="truncate">{announcement.postedBy || 'Administrator'}</span>
                                </div>
                              </div>
                              <div className="sm:text-right">
                                <p className="mb-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Availability</p>
                                <div className="flex items-center gap-1.5 text-[#122361] sm:justify-end">
                                  <Calendar className="h-3 w-3" />
                                  <span className="truncate">{visiblePeriod}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                    {announcements.length > 3 && (
                      <div className="mt-3 text-center">
                        <button
                          onClick={() => router.push('/announcements')}
                          className="inline-flex items-center space-x-2 rounded-lg border border-[#d8def2] bg-white px-4 py-2 text-xs font-bold text-[#122361] transition-all duration-300 hover:bg-[#eef3ff]"
                        >
                          <span>View All Announcements ({announcements.length})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-100 bg-white p-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-[#d8def2] bg-[#eef3ff]">
                      <Megaphone className="w-6 h-6 text-[#122361]" />
                    </div>
                    <h3 className="text-base font-bold text-gray-700 mb-1">No Announcements</h3>
                    <p className="text-gray-500 text-xs">There are no announcements at this time. Check back later!</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* === MODALS SECTION === */}

        <AnnouncementModal
          isOpen={showLatestAnnouncementModal}
          announcement={latestActiveAnnouncement}
          onDismiss={dismissLatestAnnouncementModal}
        />

        {showExistingRequestPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="existing-request-title"
            >
              <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-400 p-5 text-white">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/20 p-2">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 id="existing-request-title" className="text-xl font-extrabold">
                      Finish this request first
                    </h2>
                    <p className="mt-1 text-sm font-medium text-amber-50">
                      You already have an unfinished document request from the document details page.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Current draft</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-800">
                    {documentDetailRequestDraft?.document?.name || 'Document request'}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    Continue editing the current draft, or discard it to start a new dashboard request.
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      discardRequest();
                      setShowExistingRequestPrompt(false);
                      setShowRequestModal(true);
                    }}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExistingRequestPrompt(false);
                      restoreRequest();
                    }}
                    className="inline-flex flex-[1.2] items-center justify-center rounded-2xl bg-[#243b8e] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#122361]"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* 1. CREATE REQUEST MODAL */}
        {showRequestModal && (
          <RequestFormModal 
            user={user}
            onClose={() => setShowRequestModal(false)}
            onSuccess={refetchRequests}
          />
        )}

        {/* 2. VIEW DETAILS MODAL */}
        {viewRequest && (
          <RequestModal
            request={viewRequest}
            user={user}
            onClose={() => setViewRequest(null)}
            cancelRequest={cancelRequest}
          />
        )}

        {/* 3. RESTRICTION MODAL */}
        <PendingRestrictionModal
          isOpen={showPendingModal}
          onClose={() => setShowPendingModal(false)}
        />

        {/* 4. REJECTED RESUBMIT MODAL */}
        <RejectedResubmitModal
          isOpen={showRejectedModal}
          onClose={() => setShowRejectedModal(false)}
          onResubmit={() => {
            setShowRejectedModal(false);
            setShowAccountActivityModal(true);
          }}
        />


        {/* 6. ACCOUNT ACTIVITY MODAL */}
        <AccountActivityModal
          isOpen={showAccountActivityModal}
          onClose={() => setShowAccountActivityModal(false)}
          user={user}
          onResubmit={() => {
            // For now, just close - EditDetailsModal will be opened from AccountActivityModal
          }}
        />
      </div>
    </motion.div>
  );
}
