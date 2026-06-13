'use client';

import { AlertTriangle, ArrowRight, Calendar, FileText, Megaphone, PackageCheck, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

function formatDate(dateValue) {
  if (!dateValue) return 'Date unavailable';
  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateValue) {
  if (!dateValue) return '';
  return new Date(dateValue).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAvailability(announcement) {
  if (!announcement) return 'Available now';

  if (announcement.startDate && announcement.endDate) {
    return `${formatDate(announcement.startDate)} - ${formatDate(announcement.endDate)}`;
  }

  if (announcement.startDate) {
    return `Starts ${formatDate(announcement.startDate)}`;
  }

  if (announcement.endDate) {
    return `Until ${formatDate(announcement.endDate)}`;
  }

  return 'Available now';
}

function getPriorityStyles(priority) {
  switch (priority) {
    case 'URGENT':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'HIGH':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'LOW':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'MEDIUM':
    default:
      return 'border-[#d8def2] bg-[#eef3ff] text-[#122361]';
  }
}

function normalizeRequestStatus(status) {
  return String(status || '').trim().toLowerCase().replace(/[\s_-]+/g, '-');
}

function getRequestUpdateCopy(request) {
  const status = normalizeRequestStatus(request?.status);
  const documentName = request?.documentName || request?.documentType?.documentName || 'Document request';

  if (status === 'ready-for-pickup') {
    return {
      icon: PackageCheck,
      title: `${documentName} is ready for pick up`,
      detail: 'You may claim this document at the barangay office. Please bring a valid ID.',
      badge: 'Ready for pick up',
      styles: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      iconStyles: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    };
  }

  return {
    icon: ShieldCheck,
    title: `${documentName} was approved`,
    detail: 'The barangay office verified your request and is preparing the document.',
    badge: 'Approved',
    styles: 'border-[#c2cbea] bg-[#eef3ff] text-[#122361]',
    iconStyles: 'bg-[#eef3ff] text-[#122361] ring-[#d8def2]',
  };
}

export default function AnnouncementModal({ isOpen, announcement, requestUpdates = [], onDismiss, onViewRequests }) {
  if (!announcement && requestUpdates.length === 0) return null;

  const publishedDate = announcement ? formatDate(announcement.createdAt) : '';
  const publishedTime = announcement ? formatTime(announcement.createdAt) : '';
  const modalTitle = announcement ? announcement.title : 'Request Updates';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="latest-announcement-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="border-b border-slate-200 bg-[#fafafa] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#122361] ring-1 ring-[#d8def2]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[#243b8e]">
                      {announcement ? 'Latest active announcement' : 'Request Updates'}
                    </p>
                    <h2 id="latest-announcement-title" className="mt-1 text-xl font-extrabold leading-tight text-[#00114e]">
                      {modalTitle}
                    </h2>
                    {announcement ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${getPriorityStyles(announcement.priority)}`}>
                          {announcement.priority || 'General'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Published {publishedDate}{publishedTime ? `, ${publishedTime}` : ''}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        You have document requests that recently moved forward.
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onDismiss}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-[#122361]"
                  aria-label="Dismiss announcement"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {announcement && (
              <div className="px-5 py-4">
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Please read before proceeding</p>
                <p className="max-h-[32vh] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {announcement.content}
                </p>
              </div>
            )}

            {requestUpdates.length > 0 && (
              <div className="border-t border-slate-200 px-5 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[#243b8e]">Request Updates</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      Active requests that are approved or ready to claim.
                    </p>
                  </div>
                  {onViewRequests && (
                    <button
                      type="button"
                      onClick={onViewRequests}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#c2cbea] bg-[#eef3ff] px-3 py-2 text-xs font-extrabold text-[#122361] transition hover:border-[#9eaddd] hover:bg-white"
                    >
                      View requests
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {requestUpdates.map((request) => {
                    const update = getRequestUpdateCopy(request);
                    const Icon = update.icon;
                    const updatedDate = formatDate(request.updatedAt || request.submittedAt);

                    return (
                      <div
                        key={request.requestId}
                        className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${update.iconStyles}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-[#00114e]">
                              {update.title}
                            </p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${update.styles}`}>
                              {update.badge}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{update.detail}</p>
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Updated {updatedDate}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {announcement && (
              <div className="grid gap-3 border-t border-slate-200 bg-[#fafafa] px-5 py-4 text-xs font-semibold text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Posted By</p>
                  <div className="flex items-center gap-1.5 text-[#122361]">
                    <Megaphone className="h-3.5 w-3.5" />
                    <span className="truncate">{announcement.postedBy || 'Administrator'}</span>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Availability</p>
                  <div className="flex items-center gap-1.5 text-[#122361]">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="truncate">{formatAvailability(announcement)}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
