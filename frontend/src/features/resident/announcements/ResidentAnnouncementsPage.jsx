'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Calendar, AlertCircle, CheckCircle, 
  Loader, Megaphone, ChevronDown, ChevronUp, 
  ChevronRight, XCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageFade from '@/shared/components/motion/PageFade';
import FilterDropdown from '@/shared/components/forms/FilterDropdown';

function isAnnouncementVisibleNow(announcement) {
  const now = new Date();
  const startDate = announcement?.startDate ? new Date(announcement.startDate) : null;
  const endDate = announcement?.endDate ? new Date(announcement.endDate) : null;

  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;

  return true;
}

const priorityOptions = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export default function AnnouncementsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [pageSize] = useState(5); // Show 5 announcements per page
  const [expandedAnnouncements, setExpandedAnnouncements] = useState(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // API base URL
  const API_BASE = '/api/residents';

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

  // Fetch announcements with pagination and filters
  const fetchAnnouncements = useCallback(async (page = 0, append = false) => {
    try {
      setError(null);
      if (!append) setLoading(true);
      else setLoadingMore(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString()
      });

      // Add filters if they exist
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);

      console.log('Fetching announcements from:', `${API_BASE}/announcements?${params}`);

      const response = await fetch(`${API_BASE}/announcements?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Announcements response:', data);
        const activeAnnouncements = (data.announcements || []).filter(isAnnouncementVisibleNow);
        
        if (append) {
          setAnnouncements(prev => [...prev, ...activeAnnouncements]);
        } else {
          setAnnouncements(activeAnnouncements);
        }
        
        setCurrentPage(data.currentPage || 0);
        setTotalPages(data.totalPages || 0);
        setTotalItems(data.totalItems || activeAnnouncements.length);
        setHasNext(data.hasNext || false);
        setHasPrevious(data.hasPrevious || false);
        
        // Set filtered announcements directly from API response
        setFilteredAnnouncements((currentAnnouncements) => (
          append ? [...currentAnnouncements, ...activeAnnouncements] : activeAnnouncements
        ));
      } else if (response.status === 401) {
        // Token expired or invalid
        console.log('Token expired, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userType');
        localStorage.removeItem('role');
        router.push('/');
        return;
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        setError(`Failed to fetch announcements (${response.status}). Please try again later.`);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setError('Unable to connect to the server. Please check if the backend is running.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [router, searchTerm, priorityFilter, pageSize]);

  // Load more announcements
  const loadMore = () => {
    if (hasNext && !loadingMore) {
      fetchAnnouncements(currentPage + 1, true);
    }
  };

  // Refresh announcements
  const refreshAnnouncements = () => {
    fetchAnnouncements(0, false);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
    setAnnouncements([]);
    setFilteredAnnouncements([]);
    fetchAnnouncements(0, false);
  }, [searchTerm, priorityFilter, fetchAnnouncements]);

  // Toggle announcement expanded state
  const toggleExpanded = (announcementId) => {
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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return 'Date unavailable';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatShortTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatAvailability = (announcement) => {
    if (announcement.startDate && announcement.endDate) {
      return `${formatShortDate(announcement.startDate)} - ${formatShortDate(announcement.endDate)}`;
    }
    if (announcement.startDate) {
      return `Starts ${formatShortDate(announcement.startDate)}`;
    }
    if (announcement.endDate) {
      return `Until ${formatShortDate(announcement.endDate)}`;
    }
    return 'Available now';
  };

  // Get priority badge color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-[#d8def2] text-[#122361] border-[#c2cbea]';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'URGENT': return <AlertCircle className="w-4 h-4" />;
      case 'HIGH': return <AlertCircle className="w-4 h-4" />;
      default: return <Megaphone className="w-4 h-4" />;
    }
  };

  const getAnnouncementStatus = (announcement) => {
    if (isUpcoming(announcement)) return 'Upcoming';
    if (isExpired(announcement)) return 'Expired';
    if (isActive(announcement)) return 'Active';
    return 'Scheduled';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Upcoming': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Expired': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Active': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Check if announcement is expired
  const isExpired = (announcement) => {
    if (!announcement.endDate) return false;
    return new Date(announcement.endDate) < new Date();
  };

  // Check if announcement is upcoming
  const isUpcoming = (announcement) => {
    if (!announcement.startDate) return false;
    return new Date(announcement.startDate) > new Date();
  };

  // Check if announcement is currently active
  const isActive = (announcement) => {
    if (!announcement.startDate && !announcement.endDate) return true;
    
    const now = new Date();
    const startDate = announcement.startDate ? new Date(announcement.startDate) : null;
    const endDate = announcement.endDate ? new Date(announcement.endDate) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    
    return true;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || (role !== 'RESIDENT' && role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    setUser(storedUser);
    fetchAnnouncements();
  }, [router, fetchAnnouncements]);

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
          <p className="text-slate-500 font-medium text-sm">Loading Announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <PageFade className="min-h-screen bg-[#FAFAFA] pt-18">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-[#d8def2] bg-[#eef3ff] p-2 text-[#122361]">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#00114e]">Announcements</h1>
                <p className="text-sm font-medium text-slate-600">Stay updated with the latest barangay news and information.</p>
              </div>
            </div>
            <button
              onClick={refreshAnnouncements}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#243b8e] px-4 py-2 text-sm font-bold text-white transition-all duration-300 hover:bg-[#122361] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Notification Toast */}
        <AnimatePresence>
          {notification.show && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              className={`fixed top-4 right-4 z-[70] p-4 rounded-xl shadow-sm border max-w-sm ${
                notification.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <p className="font-medium text-sm">{notification.message}</p>
                <button
                  onClick={closeNotification}
                  className="ml-auto p-1 rounded-full hover:bg-black/5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8aa0bf] w-4 h-4" />
              <input
                type="text"
                placeholder="Search announcements by title, content, or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-[#2f84c0] focus:ring-2 focus:ring-[#d8def2]"
              />
            </div>

            {/* Priority Filter */}
            <FilterDropdown
              icon={Megaphone}
              options={priorityOptions}
              value={priorityFilter}
              onChange={setPriorityFilter}
              ariaLabel="Filter announcements by priority"
              size="form"
              surface="white"
              iconClassName="text-[#8aa0bf]"
            />
          </div>
          
          {/* Results Count */}
          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold text-slate-500">
              Showing {filteredAnnouncements.length} of {totalItems} announcements
              {searchTerm && ` for "${searchTerm}"`}
              {priorityFilter !== 'ALL' && ` with ${priorityFilter.toLowerCase()} priority`}
            </p>
          </div>
        </div>

        {/* Announcements Posts */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredAnnouncements.map((announcement) => {
              const isExpanded = expandedAnnouncements.has(announcement.announcementId);
              const status = getAnnouncementStatus(announcement);
              const announcedDate = formatShortDate(announcement.createdAt);
              const announcedTime = formatShortTime(announcement.createdAt);

              return (
                <motion.div
                  key={announcement.announcementId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-300 hover:border-[#c2cbea] ${
                    !isActive(announcement) ? 'opacity-80' : ''
                  }`}
                >
                  <div className="border-b border-slate-100 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${getPriorityColor(announcement.priority)}`}>
                            {announcement.priority || 'General'}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${getStatusColor(status)}`}>
                            {status}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {announcedDate}{announcedTime ? `, ${announcedTime}` : ''}
                          </span>
                        </div>
                        <h2 className="text-base font-extrabold leading-snug text-[#00114e]">
                          {announcement.title}
                        </h2>
                      </div>
                      <button
                        onClick={() => toggleExpanded(announcement.announcementId)}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#122361] transition hover:bg-[#eef3ff]"
                        aria-label={isExpanded ? 'Collapse announcement' : 'Expand announcement'}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white px-4 py-3">
                    <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Details</p>
                    <p className={`whitespace-pre-wrap text-sm leading-6 text-slate-700 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {announcement.content}
                    </p>
                  </div>

                  <div className="grid gap-2 border-t border-slate-100 bg-[#fafafa] px-4 py-2.5 text-xs font-semibold text-slate-600 md:grid-cols-3">
                    <div className="min-w-0">
                      <p className="mb-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Posted By</p>
                      <div className="flex items-center gap-1.5 text-[#122361]">
                        <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{announcement.postedBy || 'Administrator'}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Availability</p>
                      <div className="flex items-center gap-1.5 text-[#122361]">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{formatAvailability(announcement)}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Published</p>
                      <div className="flex items-center gap-1.5 text-[#122361]">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{announcedDate}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Load More Button */}
        {hasNext && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Loading more...
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  Load More Announcements
                </>
              )}
            </button>
          </div>
        )}

        {/* Empty State */}
        {filteredAnnouncements.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchTerm || priorityFilter !== 'ALL' ? 'No matching announcements' : 'No announcements available'}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || priorityFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filters'
                : 'There are no announcements at the moment. Check back later for updates.'
              }
            </p>
            {(searchTerm || priorityFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setPriorityFilter('ALL');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#122361] to-[#2f84c0] text-white rounded-lg hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300"
              >
                Clear Filters
              </button>
            )}
            {!searchTerm && priorityFilter === 'ALL' && (
              <button
                onClick={refreshAnnouncements}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#122361] to-[#2f84c0] text-white rounded-lg hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            )}
          </div>
        )}
      </div>
    </PageFade>
  );
}
