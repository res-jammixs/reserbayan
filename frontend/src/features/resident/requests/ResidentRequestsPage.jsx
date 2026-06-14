'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Grid3X3,
  LayoutList,
  Search,
  SlidersHorizontal,
  SortAsc,
  SortDesc,
  Tags,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { useRequests } from '@/hooks/useRequests';
import RequestCard from '@/app/components/requests/RequestCard';
import RequestModal from '@/app/components/requests/RequestModal';
import RequestsList from '@/app/components/requests/RequestsList';
import FilterDropdown from '@/shared/components/forms/FilterDropdown';

const normalizeRequestStatus = (status) => status?.toLowerCase().replace(/[\s_-]+/g, '-') || '';

const statusKeys = ['pending', 'approved', 'awaiting-hard-copy-submission', 'hard-copy-submitted', 'ready-for-pickup', 'completed', 'rejected', 'cancelled'];

const sortOptions = [
  { value: 'submittedAt', label: 'Date' },
  { value: 'status', label: 'Status' },
  { value: 'documentName', label: 'Document' },
];

const REQUESTS_PER_PAGE = 9;

function RequestsPagination({ currentPage, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const firstVisibleItem = (currentPage - 1) * REQUESTS_PER_PAGE + 1;
  const lastVisibleItem = Math.min(currentPage * REQUESTS_PER_PAGE, totalItems);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);

  return (
    <nav className="mt-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between" aria-label="Requests pagination">
      <p className="px-2 text-sm font-semibold text-slate-500">
        Showing <span className="text-[#122361]">{firstVisibleItem}-{lastVisibleItem}</span> of <span className="text-[#122361]">{totalItems}</span> requests
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#122361] transition hover:border-[#9eaddd] hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous requests page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((page, index) => {
          const previousPage = pages[index - 1];
          const showGap = previousPage && page - previousPage > 1;

          return (
            <div key={page} className="flex items-center gap-2">
              {showGap && <span className="text-sm font-bold text-slate-300">...</span>}
              <button
                type="button"
                onClick={() => onPageChange(page)}
                className={`h-10 min-w-10 rounded-2xl px-3 text-sm font-extrabold transition ${
                  page === currentPage
                    ? 'bg-gradient-to-r from-[#243b8e] to-[#2f84c0] text-white shadow-[0_8px_18px_rgba(36,59,142,0.14)]'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-[#9eaddd] hover:bg-[#eef3ff] hover:text-[#122361]'
                }`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#122361] transition hover:border-[#9eaddd] hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next requests page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

export default function RequestsPage() {
  const { user } = useUser();
  const { requests, loading, cancelRequest, refetchRequests } = useRequests(user);

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const handleRequestClick = useCallback((request) => {
    setSelectedRequest(request);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedRequest(null);
  }, []);

  const statusOptions = useMemo(() => {
    const counts = statusKeys.reduce((accumulator, status) => {
      accumulator[status] = requests.filter((request) => normalizeRequestStatus(request.status) === status).length;
      return accumulator;
    }, {});

    return [
      { value: 'all', label: `All Requests (${requests.length})` },
      { value: 'pending', label: `Pending (${counts.pending || 0})` },
      { value: 'approved', label: `Approved (${counts.approved || 0})` },
      { value: 'awaiting-hard-copy-submission', label: `Awaiting Hard Copy (${counts['awaiting-hard-copy-submission'] || 0})` },
      { value: 'hard-copy-submitted', label: `Hard Copy Submitted (${counts['hard-copy-submitted'] || 0})` },
      { value: 'ready-for-pickup', label: `Ready for Pickup (${counts['ready-for-pickup'] || 0})` },
      { value: 'completed', label: `Completed (${counts.completed || 0})` },
      { value: 'rejected', label: `Rejected (${counts.rejected || 0})` },
      { value: 'cancelled', label: `Cancelled (${counts.cancelled || 0})` },
    ];
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();

    return requests
      .filter((request) => selectedStatus === 'all' || normalizeRequestStatus(request.status) === selectedStatus)
      .filter((request) => {
        if (!normalizedSearchTerm) return true;

        return [
          request.documentName,
          request.details,
          request.requestId?.toString(),
          request.status,
        ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearchTerm);
      })
      .sort((firstRequest, secondRequest) => {
        const getSortValue = (request) => {
          if (sortBy === 'submittedAt') {
            const dateValue = new Date(request.submittedAt).getTime();
            return Number.isNaN(dateValue) ? 0 : dateValue;
          }
          if (sortBy === 'status') {
            return request.status?.toLowerCase() || '';
          }
          return request.documentName?.toLowerCase() || '';
        };

        const firstValue = getSortValue(firstRequest);
        const secondValue = getSortValue(secondRequest);

        if (firstValue === secondValue) return 0;
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        return firstValue > secondValue ? sortDirection : -sortDirection;
      });
  }, [requests, searchTerm, selectedStatus, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / REQUESTS_PER_PAGE));
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * REQUESTS_PER_PAGE;
    return filteredRequests.slice(startIndex, startIndex + REQUESTS_PER_PAGE);
  }, [currentPage, filteredRequests]);
  const activeFiltersCount = [selectedStatus !== 'all', searchTerm.trim() !== ''].filter(Boolean).length;
  const hasNoRequests = requests.length === 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, sortBy, sortOrder]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-8 pt-24" role="status" aria-live="polite">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#d8def2] border-b-[#243b8e]" aria-hidden="true" />
          <p className="mt-4 font-medium text-slate-600">Loading your requests...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <motion.main
      className="min-h-screen overflow-hidden bg-[#FAFAFA] px-4 pb-16 pt-24 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="mx-auto max-w-7xl">
        <motion.section
          className="sticky top-1 z-20 mt-4 rounded-3xl border border-white/80 bg-white/90 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: 'easeOut' }}
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_230px_180px_auto_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="search-requests"
                type="text"
                placeholder="Search by document, purpose, or request ID..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-[3.25rem] w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#2f84c0] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                aria-describedby="search-help"
              />
              <span id="search-help" className="sr-only">Search by document name, purpose, status, or request ID</span>
            </label>

            <FilterDropdown
              icon={Tags}
              options={statusOptions}
              value={selectedStatus}
              onChange={setSelectedStatus}
              ariaLabel="Filter requests by status"
              surface="white"
            />

            <FilterDropdown
              icon={SlidersHorizontal}
              options={sortOptions}
              value={sortBy}
              onChange={setSortBy}
              ariaLabel="Sort requests"
              surface="white"
            />

            <button
              type="button"
              onClick={() => setSortOrder((currentOrder) => currentOrder === 'asc' ? 'desc' : 'asc')}
              className="inline-flex h-[3.25rem] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-[#122361] shadow-sm transition-all hover:border-[#9eaddd] hover:bg-[#eef3ff] focus:outline-none focus:ring-4 focus:ring-[#d8def2]"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-5 w-5" /> : <SortDesc className="h-5 w-5" />}
            </button>

            <div className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#122361] shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-pressed={viewMode === 'grid'}
              >
                <Grid3X3 className="h-4 w-4" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-[#122361] shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-pressed={viewMode === 'list'}
              >
                <LayoutList className="h-4 w-4" />
                List
              </button>
            </div>
          </div>
        </motion.section>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('all');
              }}
              className="text-left text-sm font-bold text-[#122361] hover:text-[#00114e] sm:text-right"
            >
              Clear {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {filteredRequests.length === 0 ? (
          <motion.div
            className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/85 p-12 text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <FileText className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
            <h3 className="mt-4 text-xl font-bold text-slate-800">
              {hasNoRequests ? 'No requests yet' : 'No requests found'}
            </h3>
            <p className="mt-2 text-slate-500">
              {hasNoRequests
                ? "You haven't submitted any document requests yet."
                : 'Try a different keyword or status filter.'}
            </p>
            {hasNoRequests && (
              <button
                type="button"
                onClick={() => router.push('/documents')}
                className="mt-6 rounded-2xl bg-[#243b8e] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#122361] focus:outline-none focus:ring-4 focus:ring-[#d8def2]"
              >
                Browse Documents
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            className={viewMode === 'grid'
              ? 'mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'
              : 'mt-5 space-y-2.5'}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: 'easeOut' }}
          >
            {viewMode === 'grid' ? (
              paginatedRequests.map((request) => (
                <RequestCard key={request.requestId} request={request} onClick={handleRequestClick} />
              ))
            ) : (
              <RequestsList requests={paginatedRequests} onRequestClick={handleRequestClick} />
            )}
          </motion.div>
        )}

        {filteredRequests.length > 0 && (
          <RequestsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRequests.length}
            onPageChange={handlePageChange}
          />
        )}

        <AnimatePresence>
          {selectedRequest && (
            <RequestModal
              request={selectedRequest}
              user={user}
              onClose={handleCloseModal}
              cancelRequest={cancelRequest}
              onUpdateRequest={refetchRequests}
              onReRequest={refetchRequests}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
