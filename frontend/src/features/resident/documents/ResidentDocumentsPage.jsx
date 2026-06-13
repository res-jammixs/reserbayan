'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  FileBadge2,
  FileCheck2,
  FileText,
  Filter,
  Grid3X3,
  Home,
  LayoutList,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDocumentTypes } from '@/hooks/useDocumentTypes';
import { useUser } from '@/contexts/UserContext';
import FilterDropdown from '@/shared/components/forms/FilterDropdown';

const categoryStyles = {
  'Financial Assistance': {
    icon: Banknote,
    className: 'bg-[#eef3ff] text-[#122361] ring-[#c2cbea]',
    activeClassName: 'from-[#243b8e] to-[#2f84c0] text-white shadow-[#c2cbea]',
  },
  Residency: {
    icon: Home,
    className: 'bg-[#eef3ff] text-[#243b8e] ring-[#d8def2]',
    activeClassName: 'from-[#2f84c0] to-[#122361] text-white shadow-[#d8def2]',
  },
  Clearance: {
    icon: ShieldCheck,
    className: 'bg-[#eef3ff] text-[#122361] ring-[#c2cbea]',
    activeClassName: 'from-[#122361] to-[#122361] text-white shadow-[#c2cbea]',
  },
  'Permits & Tax': {
    icon: BriefcaseBusiness,
    className: 'bg-[#eef3ff] text-[#122361] ring-[#d8def2]',
    activeClassName: 'from-[#2f84c0] to-[#243b8e] text-white shadow-[#d8def2]',
  },
  'Infrastructure & Zoning': {
    icon: Building2,
    className: 'bg-[#eef3ff] text-[#122361] ring-[#c2cbea]',
    activeClassName: 'from-[#243b8e] to-[#00114e] text-white shadow-[#c2cbea]',
  },
};

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'time-asc', label: 'Fastest processing' },
  { value: 'requirements-asc', label: 'Fewest requirements' },
];

const processingFilters = [
  { value: 'All', label: 'Any timeline' },
  { value: 'quick', label: 'Same day' },
  { value: 'multi-day', label: 'Multi-day' },
  { value: 'variable', label: 'Variable' },
];

const DOCUMENTS_PER_PAGE = 9;

function getCategoryConfig(category) {
  return categoryStyles[category] || {
    icon: FileText,
    className: 'bg-slate-50 text-slate-700 ring-slate-200',
    activeClassName: 'from-slate-700 to-slate-900 text-white shadow-slate-200',
  };
}

function getProcessingMinutes(processingTime = '') {
  const normalizedProcessingTime = processingTime.toLowerCase().replace(/\s+/g, ' ').trim();

  if (!normalizedProcessingTime || normalizedProcessingTime.includes('varies')) {
    return Number.POSITIVE_INFINITY;
  }

  const numbers = normalizedProcessingTime.match(/\d+/g)?.map(Number) || [];
  const highestNumber = numbers.length ? Math.max(...numbers) : 0;

  if (normalizedProcessingTime.includes('working day') || normalizedProcessingTime.includes('day')) {
    return highestNumber * 24 * 60;
  }

  if (normalizedProcessingTime.includes('hour')) {
    return highestNumber * 60;
  }

  return highestNumber;
}

function getProcessingBucket(processingTime = '') {
  const normalizedProcessingTime = processingTime.toLowerCase();

  if (normalizedProcessingTime.includes('varies')) {
    return 'variable';
  }

  return getProcessingMinutes(processingTime) <= 24 * 60 ? 'quick' : 'multi-day';
}

function sortDocuments(documents, sortBy) {
  return [...documents].sort((firstDocument, secondDocument) => {
    if (sortBy === 'name-asc') {
      return firstDocument.name.localeCompare(secondDocument.name);
    }

    if (sortBy === 'name-desc') {
      return secondDocument.name.localeCompare(firstDocument.name);
    }

    if (sortBy === 'time-asc') {
      return getProcessingMinutes(firstDocument.details?.processingTime) - getProcessingMinutes(secondDocument.details?.processingTime);
    }

    if (sortBy === 'requirements-asc') {
      return (firstDocument.details?.requirements?.length || 0) - (secondDocument.details?.requirements?.length || 0);
    }

    return 0;
  });
}

function DocumentIcon() {
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00114e] via-[#243b8e] to-[#2f84c0] text-white shadow-[0_8px_18px_rgba(36,59,142,0.12)]">
      <FileBadge2 className="h-7 w-7" strokeWidth={1.8} />
    </div>
  );
}

function CategoryBadge({ category }) {
  const { icon: CategoryIcon, className } = getCategoryConfig(category);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${className}`}>
      <CategoryIcon className="h-3.5 w-3.5" />
      {category || 'General'}
    </span>
  );
}

function CategoryCornerBadge({ category }) {
  const { icon: CategoryIcon } = getCategoryConfig(category);

  return (
    <span
      title={category || 'General'}
      aria-label={category || 'General'}
      className="absolute left-0 top-0 z-0 inline-flex h-11 w-11 items-start justify-start rounded-br-[2.5rem] bg-gradient-to-br from-[#243b8e]/16 via-[#2f84c0]/16 to-transparent p-2.5 text-[#122361]/55 ring-1 ring-[#d8def2]/50"
    >
      <CategoryIcon className="h-4 w-4" />
    </span>
  );
}

function DocumentCard({ doc, viewMode, href }) {
  const requirementsCount = doc.details?.requirements?.length || 0;
  const processingTime = doc.details?.processingTime || 'Timeline to be confirmed';

  if (viewMode === 'list') {
    return (
      <motion.div
        layoutId={`card-container-${doc.id}`}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Link
          href={href}
          className="group grid min-h-[7.25rem] grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#9eaddd] hover:shadow-[0_8px_18px_rgba(36,59,142,0.14)]"
        >
          <div className="[&>div]:h-12 [&>div]:w-12 [&_svg]:h-6 [&_svg]:w-6">
            <DocumentIcon />
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <CategoryBadge category={doc.details?.category} />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                <Clock3 className="h-3.5 w-3.5" />
                {processingTime}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-semibold text-[#122361] ring-1 ring-[#d8def2] sm:hidden">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {requirementsCount} requirements
              </span>
            </div>
            <h3 className="truncate font-[family-name:var(--font-montserrat)] text-lg font-extrabold uppercase tracking-tight text-[#122361]">
              {doc.name}
            </h3>
            <p className="mt-1 line-clamp-1 max-w-4xl text-sm leading-5 text-slate-600">
              {doc.shortDescription}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-slate-500 sm:inline-flex">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {requirementsCount} requirements
            </span>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3ff] text-[#122361] transition-all group-hover:bg-[#243b8e] group-hover:text-white">
              <ArrowRight className="h-5 w-5" />
            </span>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={`card-container-${doc.id}`}
      className="h-full"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Link
        href={href}
        className="group relative flex h-full min-h-[9.5rem] items-center gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 pl-5 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#9eaddd] hover:shadow-[0_8px_18px_rgba(36,59,142,0.14)]"
      >
        <CategoryCornerBadge category={doc.details?.category} />
        
        <div className="relative z-10 shrink-0">
          <DocumentIcon />
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <h3 className="font-[family-name:var(--font-montserrat)] text-base font-extrabold uppercase leading-tight tracking-tight text-[#122361] sm:text-[1.05rem]">
            {doc.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
            {doc.shortDescription}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              <Clock3 className="h-3.5 w-3.5 text-[#243b8e]" />
              {processingTime}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
              {requirementsCount} items
            </span>
          </div>
        </div>

        <span className="relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-400 shadow-sm transition-all group-hover:border-[#2f84c0] group-hover:bg-[#243b8e] group-hover:text-white">
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </motion.div>
  );
}

function DocumentPagination({ currentPage, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const firstVisibleItem = (currentPage - 1) * DOCUMENTS_PER_PAGE + 1;
  const lastVisibleItem = Math.min(currentPage * DOCUMENTS_PER_PAGE, totalItems);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);

  return (
    <nav className="mt-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between" aria-label="Documents pagination">
      <p className="px-2 text-sm font-semibold text-slate-500">
        Showing <span className="text-[#122361]">{firstVisibleItem}-{lastVisibleItem}</span> of <span className="text-[#122361]">{totalItems}</span> documents
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#122361] transition hover:border-[#9eaddd] hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous documents page"
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
          aria-label="Next documents page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

function DocumentsGridContent() {
  const { documentsData, loading, error } = useDocumentTypes();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'All');
  const [processingFilter, setProcessingFilter] = useState(() => searchParams.get('timeline') || 'All');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'recommended');
  const [viewMode, setViewMode] = useState(() => searchParams.get('view') || 'grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [recommendedDocuments, setRecommendedDocuments] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchRecommendations = async () => {
      setRecommendationsLoading(true);
      try {
        const params = new URLSearchParams();
        if (user?.residentId) params.set('residentId', user.residentId);
        const response = await fetch(`/api/document-types/recommended${params.toString() ? `?${params.toString()}` : ''}`);
        if (!response.ok) throw new Error('Failed to fetch recommendations');
        const data = await response.json();
        if (!ignore) setRecommendedDocuments(data || []);
      } catch (fetchError) {
        if (!ignore) setRecommendedDocuments([]);
      } finally {
        if (!ignore) setRecommendationsLoading(false);
      }
    };

    fetchRecommendations();

    return () => {
      ignore = true;
    };
  }, [user?.residentId]);

  const categories = useMemo(() => [
    'All',
    ...new Set(documentsData.map((doc) => doc.details?.category).filter(Boolean)),
  ], [documentsData]);
  const categoryOptions = useMemo(() => categories.map((category) => ({
    value: category,
    label: category === 'All' ? 'All categories' : category,
  })), [categories]);
  const recommendedDocumentIds = useMemo(
    () => new Set(recommendedDocuments.map((doc) => doc.id)),
    [recommendedDocuments],
  );

  const filteredDocuments = useMemo(() => {
    const normalizedSearchQuery = searchQuery.toLowerCase().trim();

    const documents = documentsData.filter((doc) => {
      if (recommendedDocumentIds.has(doc.id)) {
        return false;
      }

      const searchableText = [
        doc.name,
        doc.shortDescription,
        doc.details?.category,
        doc.details?.processingTime,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !normalizedSearchQuery || searchableText.includes(normalizedSearchQuery);
      const matchesCategory = selectedCategory === 'All' || doc.details?.category === selectedCategory;
      const matchesProcessing = processingFilter === 'All' || getProcessingBucket(doc.details?.processingTime) === processingFilter;

      return matchesSearch && matchesCategory && matchesProcessing;
    });

    return sortDocuments(documents, sortBy);
  }, [documentsData, processingFilter, recommendedDocumentIds, searchQuery, selectedCategory, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / DOCUMENTS_PER_PAGE));
  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * DOCUMENTS_PER_PAGE;
    return filteredDocuments.slice(startIndex, startIndex + DOCUMENTS_PER_PAGE);
  }, [currentPage, filteredDocuments]);
  const showRecommendations = currentPage === 1 && (recommendationsLoading || recommendedDocuments.length > 0);
  const totalCategories = Math.max(categories.length - 1, 0);
  const activeFiltersCount = [selectedCategory !== 'All', processingFilter !== 'All', searchQuery.trim() !== ''].filter(Boolean).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [processingFilter, searchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 420, behavior: 'smooth' });
    }
  };

  const documentQueryString = useMemo(() => {
    const params = new URLSearchParams();

    params.set('from', 'grid');
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (processingFilter !== 'All') params.set('timeline', processingFilter);
    if (sortBy !== 'recommended') params.set('sort', sortBy);
    if (viewMode !== 'grid') params.set('view', viewMode);

    return params.toString();
  }, [processingFilter, searchQuery, selectedCategory, sortBy, viewMode]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-8 pt-24">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#d8def2] border-b-[#243b8e]" />
          <p className="mt-4 font-medium text-slate-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-8 pt-24">
        <div className="max-w-md rounded-3xl border border-red-100 bg-white p-10 text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <p className="font-semibold text-red-600">Error loading documents: {error}</p>
        </div>
      </div>
    );
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
          <div className="grid gap-4 lg:grid-cols-[1fr_210px_190px_190px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by document, purpose, or category..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-[3.25rem] w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#2f84c0] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                suppressHydrationWarning={true}
              />
            </label>

            <FilterDropdown
              icon={Tags}
              options={categoryOptions}
              value={selectedCategory}
              onChange={setSelectedCategory}
              ariaLabel="Filter documents by category"
            />

            <FilterDropdown
              icon={Filter}
              options={processingFilters}
              value={processingFilter}
              onChange={setProcessingFilter}
              ariaLabel="Filter documents by processing timeline"
            />

            <FilterDropdown
              icon={SlidersHorizontal}
              options={sortOptions}
              value={sortBy}
              onChange={setSortBy}
              ariaLabel="Sort documents"
            />

            <div className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#122361] shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
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
              >
                <LayoutList className="h-4 w-4" />
                List
              </button>
            </div>
          </div>
        </motion.section>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setProcessingFilter('All');
                }}
                className="mt-1 text-sm font-bold text-[#122361] hover:text-[#00114e]"
              >
                Clear {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
         
        </div>

        {showRecommendations && (
          <motion.section
            className="mt-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#122361]">
                Suggested for you
              </h2>
              <div className="h-px flex-1 bg-[#d8def2]" />
            </div>

            {recommendationsLoading ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                ))}
              </div>
            ) : (
              <motion.div
                className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18, ease: 'easeOut' }}
              >
                {recommendedDocuments.slice(0, 3).map((doc) => (
                  <DocumentCard
                    key={`recommended-${doc.id}`}
                    doc={doc}
                    viewMode="grid"
                    href={`/documents/${doc.id}?${documentQueryString}`}
                  />
                ))}
              </motion.div>
            )}
          </motion.section>
        )}

        <div className="mt-8 h-px bg-[#d8def2]" aria-hidden="true" />

        {filteredDocuments.length === 0 ? (
          <motion.div
            className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/85 p-12 text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-xl font-bold text-slate-800">No documents found</h3>
            <p className="mt-2 text-slate-500">Try a different keyword, category, or timeline filter.</p>
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
            {paginatedDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                viewMode={viewMode}
                href={`/documents/${doc.id}?${documentQueryString}`}
              />
            ))}
          </motion.div>
        )}

        {filteredDocuments.length > 0 && (
          <DocumentPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredDocuments.length}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </motion.main>
  );
}

export default function DocumentsGridPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-8 pt-24">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#d8def2] border-b-[#243b8e]" />
          <p className="mt-4 font-medium text-slate-600">Loading documents...</p>
        </div>
      </div>
    }>
      <DocumentsGridContent />
    </Suspense>
  );
}
