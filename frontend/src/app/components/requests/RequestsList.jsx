import { ArrowRight, Calendar, Clock3, FileText, Hash, Paperclip } from 'lucide-react';
import { StatusBadge } from '@/shared/components/ui/StatusBadge';
import { formatShortDate } from '@/shared/lib/date';
import { getAttachmentCount, getRequestStatusAccent } from '@/shared/lib/requests';

function RequestsList({ requests, onRequestClick }) {
  return (
    <div className="space-y-2.5" role="list" aria-label="Document requests in list view">
      {requests.map((request) => {
        const attachmentCount = getAttachmentCount(request);
        const accent = getRequestStatusAccent(request.status).compact;

        return (
          <button
            key={request.requestId}
            type="button"
            onClick={() => onRequestClick(request)}
            className="group relative grid w-full gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-4 text-left shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#9eaddd] hover:shadow-[0_8px_18px_rgba(36,59,142,0.14)] focus:outline-none focus:ring-4 focus:ring-[#d8def2] lg:grid-cols-[minmax(18rem,0.9fr)_minmax(18rem,1.4fr)_auto]"
            role="listitem"
            aria-label={`View details for ${request.documentName} request`}
          >
            <div className={`absolute bottom-0 left-0 top-0 w-1.5 bg-gradient-to-b ${accent}`} />

            <div className="ml-1 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r ${accent} text-white shadow-sm shadow-slate-300/60`}>
                <FileText className="h-7 w-7" aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <h3 className="font-[family-name:var(--font-montserrat)] line-clamp-2 break-words text-lg font-extrabold leading-tight text-[#122361] [overflow-wrap:anywhere]">
                  {request.documentName || 'Untitled Request'}
                </h3>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                    <Hash className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">Request {request.requestId}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-bold text-[#122361] ring-1 ring-[#d8def2]">
                    <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                    {attachmentCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl bg-slate-50/80 px-3.5 py-2.5 ring-1 ring-slate-100 lg:self-center">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">Purpose</p>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 lg:line-clamp-1">
                {request.details || 'No purpose or details provided.'}
              </p>
            </div>

            <div className="grid gap-2 lg:min-w-[24rem] lg:grid-rows-[auto_auto] lg:justify-items-end">
              <StatusBadge status={request.status} size="sm" className="shrink-0 px-2.5" />

              <div className="flex w-full flex-wrap items-center justify-between gap-2 lg:justify-end">
                <div className="grid flex-1 grid-cols-1 gap-2 text-[0.72rem] font-bold text-slate-600 sm:grid-cols-2 lg:max-w-[20rem]">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                    <Calendar className="h-3.5 w-3.5 text-[#243b8e]" aria-hidden="true" />
                    <span className="truncate">{formatShortDate(request.submittedAt)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                    <Clock3 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    <span className="truncate">{formatShortDate(request.updatedAt)}</span>
                  </span>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[#122361] transition-all group-hover:bg-[#243b8e] group-hover:text-white">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default RequestsList;
