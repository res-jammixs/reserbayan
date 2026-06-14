'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Info,
  ListChecks,
  Loader2,
  Paperclip,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';

const friendlyStatus = {
  MATCHED: { label: 'Looks correct', tone: 'success' },
  COMPLETE: { label: 'Looks correct', tone: 'success' },
  MISSING: { label: 'Missing requirement', tone: 'warning' },
  MISSING_ITEMS: { label: 'Missing items', tone: 'warning' },
  WRONG_DOCUMENT: { label: 'May be the wrong document', tone: 'danger' },
  LOW_CONFIDENCE: { label: 'Needs closer review', tone: 'warning' },
  UNREADABLE: { label: 'Hard to read', tone: 'danger' },
  OCR_UNAVAILABLE: { label: 'Needs manual review', tone: 'neutral' },
  ERROR: { label: 'Needs manual review', tone: 'neutral' },
  MISMATCH: { label: 'Possible resident detail mismatch', tone: 'danger' },
};

const toneClasses = {
  success: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-100 bg-amber-50 text-amber-800',
  danger: 'border-red-100 bg-red-50 text-red-800',
  neutral: 'border-slate-100 bg-slate-50 text-slate-700',
};

const statusNeedsAttention = (status) => {
  const normalized = String(status || '').toUpperCase();
  return ['MISSING', 'MISSING_ITEMS', 'WRONG_DOCUMENT', 'LOW_CONFIDENCE', 'UNREADABLE', 'OCR_UNAVAILABLE', 'ERROR', 'MISMATCH'].includes(normalized);
};

const getFriendlyStatus = (status) => {
  const normalized = String(status || '').toUpperCase();
  return friendlyStatus[normalized] || { label: 'Needs manual review', tone: 'neutral' };
};

const formatConfidence = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return null;
  return `${Math.round(value * 100)}% confidence`;
};

function ReviewItem({ title, status, detail, meta }) {
  const friendly = getFriendlyStatus(status);
  const Icon = friendly.tone === 'success' ? CheckCircle2 : friendly.tone === 'danger' ? AlertTriangle : Info;

  return (
    <div className={`rounded-lg border p-2 ${toneClasses[friendly.tone]}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="break-words text-xs font-extrabold leading-snug">{title}</p>
            <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide">
              {friendly.label}
            </span>
          </div>
          {meta && <p className="mt-1 text-[10px] font-bold leading-snug opacity-75">{meta}</p>}
          {detail && <p className="mt-1 text-[11px] font-semibold leading-snug opacity-85">{detail}</p>}
        </div>
      </div>
    </div>
  );
}

function ReviewSection({ icon: Icon, title, items, emptyText }) {
  return (
    <section>
      <h4 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5 text-[#243b8e]" aria-hidden="true" />
        {title}
      </h4>
      <div className="mt-2 space-y-2">
        {items.length > 0 ? items : (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

export default function AiReviewAssistant({ requestId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setAnalysis(null);
    setError(false);

    if (!requestId) return undefined;

    const token = localStorage.getItem('token');
    if (!token) {
      setError(true);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/document-requests/ai/${requestId}/analysis`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Review unavailable');
        return response.json();
      })
      .then((data) => {
        setAnalysis(data);
        setError(false);
      })
      .catch((fetchError) => {
        if (fetchError.name === 'AbortError') return;
        setAnalysis({
          overallStatus: 'ERROR',
          summary: 'AI review is unavailable right now. Continue with manual review.',
          requirements: [],
          attachments: [],
          identityChecks: [],
        });
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [requestId]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const review = useMemo(() => {
    const requirements = analysis?.requirements || [];
    const attachments = analysis?.attachments || [];
    const identityChecks = analysis?.identityChecks || [];
    const needsAttention = error
      || statusNeedsAttention(analysis?.overallStatus)
      || requirements.some((item) => statusNeedsAttention(item.status))
      || attachments.some((item) => statusNeedsAttention(item.status))
      || identityChecks.some((item) => item.status && String(item.status).toUpperCase() !== 'MATCH');

    return {
      needsAttention,
      requirements,
      attachments,
      identityChecks,
    };
  }, [analysis, error]);

  const summary = loading
    ? 'Checking uploaded files...'
    : analysis?.summary || 'AI review will appear here after checking the request.';
  const buttonTone = loading
    ? 'border-[#c2cbea] bg-[#eef3ff] text-[#122361]'
    : review.needsAttention
      ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
      : 'border-[#c2cbea] bg-white text-[#122361] hover:bg-[#eef3ff]';

  const requirementItems = review.requirements.map((item, index) => (
    <ReviewItem
      key={`requirement-${item.requirementIndex ?? index}`}
      title={item.requirementText || `Requirement ${index + 1}`}
      status={item.status}
      meta={[
        item.matchedFileNames?.length ? `File: ${item.matchedFileNames.join(', ')}` : null,
        formatConfidence(item.confidence),
      ].filter(Boolean).join(' | ')}
      detail={item.explanation || 'Please review this requirement manually.'}
    />
  ));

  const attachmentItems = review.attachments.map((item, index) => (
    <ReviewItem
      key={`attachment-${item.fileName || index}`}
      title={item.fileName || `Uploaded file ${index + 1}`}
      status={item.status}
      meta={[
        item.requirementLabel ? `For: ${item.requirementLabel}` : null,
        item.detectedDocumentType ? `Detected: ${item.detectedDocumentType}` : null,
        formatConfidence(item.readabilityScore),
      ].filter(Boolean).join(' | ')}
      detail={item.warning || item.extractedTextExcerpt || 'No readable preview was found. Please inspect this file manually.'}
    />
  ));

  const identityItems = review.identityChecks.map((item, index) => (
    <ReviewItem
      key={`identity-${item.fileName || index}-${item.field || index}`}
      title={item.field ? `${item.field} check` : 'Resident detail check'}
      status={item.status === 'MATCH' ? 'MATCHED' : item.status}
      meta={[
        item.fileName,
        formatConfidence(item.confidence),
      ].filter(Boolean).join(' | ')}
      detail={item.explanation || [
        item.accountValue ? `Account: ${item.accountValue}` : null,
        item.extractedValue ? `File shows: ${item.extractedValue}` : null,
      ].filter(Boolean).join(' | ') || 'Please compare the uploaded file with the resident details.'}
    />
  ));

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-extrabold shadow-sm transition ${buttonTone}`}
        aria-expanded={open}
        aria-label="Open AI file review"
        title="AI file review"
      >
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#243b8e] ring-1 ring-black/5">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : review.needsAttention ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
          ) : (
            <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {!loading && (
            <span className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-black text-white ${review.needsAttention ? 'bg-amber-500' : 'bg-[#2f84c0]'}`}>
              !
            </span>
          )}
        </span>
        <span className="hidden sm:inline">AI Check</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-40 mb-3 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2.5 text-left shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#243b8e]">
                
                File checking assistant
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{summary}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close AI review"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 max-h-[23.5rem] space-y-2.5 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center gap-2 rounded-xl border border-[#d8def2] bg-[#eef3ff] p-3 text-sm font-bold text-[#122361]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Checking requirements and uploaded files...
              </div>
            ) : (
              <>
                <ReviewSection
                  icon={ListChecks}
                  title="Requirements"
                  items={requirementItems}
                  emptyText="No requirement notes were found."
                />
                <ReviewSection
                  icon={Paperclip}
                  title="Uploaded files"
                  items={attachmentItems}
                  emptyText="No uploaded file notes were found."
                />
                <ReviewSection
                  icon={UserCheck}
                  title="Resident / ID checks"
                  items={identityItems}
                  emptyText="No resident detail issues were found."
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
