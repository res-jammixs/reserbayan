'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Filter,
  Grid3X3,
  PanelLeftOpen,
  Search,
  SlidersHorizontal,
  Tags,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDocumentTypes } from '@/hooks/useDocumentTypes';
import FilterDropdown from '@/shared/components/forms/FilterDropdown';

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

const toolbarLayoutTransition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

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
  if (processingTime.toLowerCase().includes('varies')) {
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

function DocumentSidebar({ isOpen, onClose }) {
  const { documentsData } = useDocumentTypes();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listRef = useRef(null);
  const activeDocumentRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'All');
  const [processingFilter, setProcessingFilter] = useState(() => searchParams.get('timeline') || 'All');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'recommended');
  const hasActiveControls = selectedCategory !== 'All' || processingFilter !== 'All' || sortBy !== 'recommended';

  const categories = useMemo(() => [
    'All',
    ...new Set(documentsData.map((doc) => doc.details?.category).filter(Boolean)),
  ], [documentsData]);
  const categoryOptions = useMemo(() => categories.map((category) => ({
    value: category,
    label: category === 'All' ? 'All categories' : category,
  })), [categories]);

  const filteredDocuments = useMemo(() => {
    const normalizedSearchQuery = searchQuery.toLowerCase().trim();
    const documents = documentsData.filter((doc) => {
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
  }, [documentsData, processingFilter, searchQuery, selectedCategory, sortBy]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (processingFilter !== 'All') params.set('timeline', processingFilter);
    if (sortBy !== 'recommended') params.set('sort', sortBy);

    return params.toString();
  }, [processingFilter, searchQuery, selectedCategory, sortBy]);

  const backHref = queryString ? `/documents?${queryString}` : '/documents';
  const clearControls = () => {
    setSelectedCategory('All');
    setProcessingFilter('All');
    setSortBy('recommended');
  };

  useEffect(() => {
    const listElement = listRef.current;
    const activeElement = activeDocumentRef.current;

    if (!listElement || !activeElement) {
      return;
    }

    const listRect = listElement.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();
    const targetTop = listElement.scrollTop + activeRect.top - listRect.top;

    listElement.scrollTo({
      top: Math.max(0, targetTop - 2),
      behavior: 'smooth',
    });
  }, [filteredDocuments.length, isOpen, pathname]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <motion.nav
        className={`border-r border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 ${
          isOpen
            ? 'fixed left-0 top-18 z-50 h-[calc(100vh-4.5rem)] w-80 translate-x-0 lg:static lg:z-auto lg:h-auto lg:w-[22rem] lg:translate-x-0'
            : 'hidden lg:block lg:w-[22rem] lg:shrink-0'
        }`}
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Link
          href={backHref}
          onClick={onClose}
          className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#243b8e] to-[#2f84c0] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(36,59,142,0.14)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(36,59,142,0.14)]"
        >
          <span className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Documents
          </span>
          <Grid3X3 className="h-4 w-4 opacity-80" />
        </Link>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/90 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#2f84c0] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
            />
          </label>

          <motion.div layout className="mt-3 flex items-center gap-2">
            <motion.div layout transition={toolbarLayoutTransition} className="min-w-0 flex-1">
              <FilterDropdown
                icon={Tags}
                options={categoryOptions}
                value={selectedCategory}
                onChange={setSelectedCategory}
                ariaLabel="Filter documents by category"
                size="square"
                iconOnly
                active={selectedCategory !== 'All'}
                iconClassName="text-[#2f84c0]"
              />
            </motion.div>
            <motion.div layout transition={toolbarLayoutTransition} className="min-w-0 flex-1">
              <FilterDropdown
                icon={Filter}
                options={processingFilters}
                value={processingFilter}
                onChange={setProcessingFilter}
                ariaLabel="Filter documents by timeline"
                size="square"
                iconOnly
                active={processingFilter !== 'All'}
                iconClassName="text-[#2f84c0]"
              />
            </motion.div>
            <motion.div layout transition={toolbarLayoutTransition} className="min-w-0 flex-1">
              <FilterDropdown
                icon={SlidersHorizontal}
                options={sortOptions}
                value={sortBy}
                onChange={setSortBy}
                ariaLabel="Sort documents"
                size="square"
                iconOnly
                active={sortBy !== 'recommended'}
                menuAlign="right"
                iconClassName="text-[#2f84c0]"
              />
            </motion.div>
            <AnimatePresence initial={false} mode="popLayout">
              {hasActiveControls && (
                <motion.button
                  layout
                  key="clear-document-controls"
                  type="button"
                  onClick={clearControls}
                  aria-label="Clear document filters"
                  title="Clear filters"
                  initial={{ opacity: 0, scale: 0.82, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.82, x: 10 }}
                  transition={toolbarLayoutTransition}
                  className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-2xl border border-[#f0b6b6] bg-[#fff5f5] text-[#b42318] outline-none transition-colors hover:border-[#e59a9a] hover:bg-white focus:ring-4 focus:ring-[#f8d1d1]"
                >
                  <X className="h-4.5 w-4.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="mt-4 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          <span>{filteredDocuments.length} documents</span>
          <span>Filtered list</span>
        </div>

        <ul
          ref={listRef}
          className="mt-2 h-[calc(100vh-23rem)] space-y-2 overflow-y-auto pr-1 [scrollbar-color:#9eaddd_#eef3ff] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9eaddd] [&::-webkit-scrollbar-thumb]:hover:bg-[#2f84c0] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#eef3ff]"
        >
          {filteredDocuments.map((doc) => {
            const isActive = pathname === `/documents/${doc.id}`;
            const href = queryString ? `/documents/${doc.id}?${queryString}` : `/documents/${doc.id}`;

            return (
              <li key={doc.id} ref={isActive ? activeDocumentRef : null}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={`group block rounded-2xl border px-4 py-3 transition-all ${
                    isActive
                      ? 'border-[#9eaddd] bg-[#f4f7ff] text-[#122361] shadow-[0_6px_16px_rgba(36,59,142,0.10),inset_0_0_0_1px_rgba(36,59,142,0.06)]'
                      : 'border-slate-200 bg-white text-slate-600 shadow-[0_3px_10px_rgba(15,23,42,0.035)] hover:border-[#c2cbea] hover:bg-[#fbfcff] hover:text-[#122361] hover:shadow-[0_6px_14px_rgba(15,23,42,0.06)]'
                  }`}
                >
                  <span className={`block font-[family-name:var(--font-montserrat)] text-sm leading-snug ${
                    isActive ? 'font-extrabold' : 'font-bold'
                  }`}>
                    {doc.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </motion.nav>
    </>
  );
}

function DocumentsLayoutContent({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isDetailPage = pathname.startsWith('/documents/') && pathname !== '/documents';

  if (isDetailPage) {
    return (
      <div className="flex min-h-screen bg-[#FAFAFA] pt-18">
        <DocumentSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className={`fixed left-4 top-20 z-30 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-all duration-300 lg:hidden ${isMobileSidebarOpen ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          >
            <PanelLeftOpen className="h-6 w-6" />
          </button>

          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return children;
}

export default function DocumentsLayout({ children }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] pt-18">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#d8def2] border-b-[#243b8e]" />
          <p className="mt-4 font-medium text-slate-600">Loading documents...</p>
        </div>
      </div>
    }>
      <DocumentsLayoutContent>{children}</DocumentsLayoutContent>
    </Suspense>
  );
}
