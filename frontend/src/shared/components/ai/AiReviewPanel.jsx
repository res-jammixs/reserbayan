'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, RefreshCw, Sparkles } from 'lucide-react';

const statusConfig = {
  COMPLETE: {
    label: 'Complete',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconClassName: 'text-emerald-600',
    icon: CheckCircle2,
  },
  MISSING_ITEMS: {
    label: 'Missing items',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    iconClassName: 'text-amber-600',
    icon: AlertTriangle,
  },
  LOW_CONFIDENCE: {
    label: 'Low confidence',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    iconClassName: 'text-amber-600',
    icon: AlertTriangle,
  },
  OCR_UNAVAILABLE: {
    label: 'OCR unavailable',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
    iconClassName: 'text-slate-500',
    icon: AlertTriangle,
  },
  UNREADABLE: {
    label: 'Unreadable file',
    className: 'border-red-200 bg-red-50 text-red-800',
    iconClassName: 'text-red-600',
    icon: AlertTriangle,
  },
  IDENTITY_MISMATCH: {
    label: 'Identity mismatch',
    className: 'border-red-200 bg-red-50 text-red-800',
    iconClassName: 'text-red-600',
    icon: AlertTriangle,
  },
  WRONG_DOCUMENT: {
    label: 'Wrong document',
    className: 'border-red-200 bg-red-50 text-red-800',
    iconClassName: 'text-red-600',
    icon: AlertTriangle,
  },
  ERROR: {
    label: 'Unavailable',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
    iconClassName: 'text-slate-500',
    icon: AlertTriangle,
  },
};

const identityFieldLabels = {
  name: 'Name',
  birthdate: 'Birthdate',
  gender: 'Gender',
  address: 'Address',
};

function formatPercent(value) {
  if (typeof value !== 'number') return null;
  return `${Math.round(value * 100)}%`;
}

function DetailMeta({ item }) {
  const confidence = formatPercent(item.confidence ?? item.readabilityScore);
  const details = [
    item.status,
    confidence ? `Confidence ${confidence}` : null,
    item.detectedDocumentType ? `Detected: ${item.detectedDocumentType}` : null,
    item.reviewSource ? `Source: ${item.reviewSource}` : null,
  ].filter(Boolean);

  if (!details.length) return null;

  return (
    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {details.join(' | ')}
    </p>
  );
}

function ResultGroup({ title, items, tone }) {
  if (!items.length) return null;
  const toneClass = tone === 'success'
    ? 'border-emerald-100 bg-emerald-50/70'
    : tone === 'danger'
      ? 'border-red-100 bg-red-50/70'
      : tone === 'neutral'
        ? 'border-slate-100 bg-slate-50/80'
        : 'border-amber-100 bg-amber-50/70';

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.requirementText || item.fileName}-${index}`} className="rounded-xl bg-white/85 p-2 ring-1 ring-black/5">
            <p className="text-sm font-bold leading-5 text-slate-800">{item.requirementText || item.fileName}</p>
            <DetailMeta item={item} />
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {item.explanation || item.warning || 'Needs manual review.'}
            </p>
            {item.matchedFileNames?.length > 0 && (
              <p className="mt-1 truncate text-xs font-bold text-[#243b8e]">
                {item.matchedFileNames.join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AttachmentGroup({ items }) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">OCR and readability</p>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.fileName}-${index}`} className="rounded-xl bg-white p-2 ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-bold text-slate-800">{item.fileName}</p>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                {item.status}
              </span>
            </div>
            <DetailMeta item={item} />
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {item.warning || item.extractedTextExcerpt || 'No OCR excerpt available.'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdentityGroup({ items }) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">ID and account checks</p>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => {
          const field = identityFieldLabels[String(item.field || '').toLowerCase()] || item.field || 'Field';
          const confidence = formatPercent(item.confidence);
          const isMismatch = item.status === 'MISMATCH';
          return (
            <div key={`${item.fileName}-${item.field}-${index}`} className="rounded-xl bg-white p-2 ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold leading-5 text-slate-800">{field}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isMismatch ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.status}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                {item.fileName || 'Uploaded ID'}{confidence ? ` | Confidence ${confidence}` : ''}
              </p>
              {(item.accountValue || item.extractedValue) && (
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Account: {item.accountValue || 'Not provided'} | Extracted: {item.extractedValue || 'Not visible'}
                </p>
              )}
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                {item.explanation || 'Staff should review this field manually.'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AiReviewPanel({ requestId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const loadAnalysis = async (mode = 'load') => {
    if (!requestId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    mode === 'reanalyze' ? setReanalyzing(true) : setLoading(true);
    try {
      const response = await fetch(
        `/api/document-requests/ai/${requestId}/${mode === 'reanalyze' ? 'reanalyze' : 'analysis'}`,
        {
          method: mode === 'reanalyze' ? 'POST' : 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error('Failed to load AI review');
      setAnalysis(await response.json());
    } catch (error) {
      setAnalysis({
        overallStatus: 'ERROR',
        summary: 'AI review is unavailable. Continue with manual review.',
        requirements: [],
        attachments: [],
      });
    } finally {
      setLoading(false);
      setReanalyzing(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, [requestId]);

  const grouped = useMemo(() => {
    const requirements = analysis?.requirements || [];
    const attachments = analysis?.attachments || [];
    const identityChecks = analysis?.identityChecks || [];
    return {
      matched: requirements.filter((item) => item.status === 'MATCHED'),
      missing: requirements.filter((item) => item.status === 'MISSING'),
      wrongDocument: requirements.filter((item) => item.status === 'WRONG_DOCUMENT'),
      lowConfidence: requirements.filter((item) => item.status === 'LOW_CONFIDENCE'),
      ocrUnavailable: [
        ...requirements.filter((item) => item.status === 'OCR_UNAVAILABLE'),
        ...attachments.filter((item) => item.status === 'OCR_UNAVAILABLE'),
      ],
      unreadable: attachments.filter((item) => item.status === 'UNREADABLE' || item.status === 'LOW_CONFIDENCE'),
      attachments,
      identityChecks,
    };
  }, [analysis]);

  const config = statusConfig[analysis?.overallStatus] || statusConfig.ERROR;
  const StatusIcon = loading ? Sparkles : config.icon;

  return (
    <section className="rounded-xl border border-[#d8def2] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#243b8e]">
            <FileSearch className="h-4 w-4 text-[#2f84c0]" />
            AI Review
          </p>
          <h4 className="mt-1 text-lg font-extrabold text-[#122361]">Requirement advisory</h4>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            AI helps organize the review. Approval and rejection remain manual.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadAnalysis('reanalyze')}
          disabled={loading || reanalyzing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#243b8e] px-3 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#122361] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${reanalyzing ? 'animate-spin' : ''}`} />
          Run AI check again
        </button>
      </div>

      <div className={`mt-3 rounded-2xl border p-3 ${config.className}`}>
        <div className="flex items-start gap-3">
          <StatusIcon className={`mt-0.5 h-5 w-5 shrink-0 ${loading ? 'animate-pulse text-[#243b8e]' : config.iconClassName}`} />
          <div>
            <p className="text-sm font-extrabold">{loading ? 'Loading AI review' : config.label}</p>
            <p className="mt-1 text-xs font-semibold leading-5 opacity-85">
              {loading ? 'Checking saved analysis...' : analysis?.summary || 'No AI summary available yet.'}
            </p>
          </div>
        </div>
      </div>

      {!loading && analysis && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <ResultGroup title="Matched" items={grouped.matched} tone="success" />
          <ResultGroup title="Missing" items={grouped.missing} tone="warning" />
          <ResultGroup title="Wrong document" items={grouped.wrongDocument} tone="danger" />
          <ResultGroup title="Low confidence" items={grouped.lowConfidence} tone="warning" />
          <ResultGroup title="OCR unavailable" items={grouped.ocrUnavailable} tone="neutral" />
          <ResultGroup title="Unreadable or hard to preview" items={grouped.unreadable} tone="danger" />
          <IdentityGroup items={grouped.identityChecks} />
          <AttachmentGroup items={grouped.attachments} />
        </div>
      )}
    </section>
  );
}
