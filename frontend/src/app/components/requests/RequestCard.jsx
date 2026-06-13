import { ArrowRight, Calendar, Clock3, Hash, Paperclip } from 'lucide-react';
import { StatusBadge } from '@/shared/components/ui/StatusBadge';
import { formatShortDate } from '@/shared/lib/date';
import { getAttachmentCount, getRequestStatusAccent } from '@/shared/lib/requests';

function RequestCard({ request, onClick }) {
  const attachmentCount = getAttachmentCount(request);
  const accent = getRequestStatusAccent(request.status);

  return (
    <button
      type="button"
      onClick={() => onClick(request)}
      className="group relative grid h-full min-h-[7.25rem] w-full grid-cols-[0.7rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#9eaddd] hover:shadow-[0_8px_18px_rgba(36,59,142,0.14)] focus:outline-none focus:ring-4 focus:ring-[#d8def2]"
      aria-label={`View details for ${request.documentName} request`}
    >
      <div className={`bg-gradient-to-b ${accent.bar}`} aria-hidden="true" />

      <div className="relative flex min-w-0 flex-col p-3">
        <div className={`absolute right-0 top-0 h-12 w-12 rounded-bl-[2rem] bg-gradient-to-br ${accent.glow} opacity-75 transition-transform duration-300 group-hover:scale-110`} />

        <div className="relative z-10 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-[family-name:var(--font-montserrat)] break-words text-lg font-extrabold leading-[1.08] text-[#122361] [overflow-wrap:anywhere]">
              {request.documentName || 'Untitled Request'}
            </h3>
          </div>
          <StatusBadge status={request.status} size="sm" className="shrink-0 px-2 py-0.5 text-[0.68rem]" />
        </div>

        <div className="relative z-10 mt-2 min-w-0 rounded-xl bg-slate-50/80 px-2.5 py-1.5 ring-1 ring-slate-100">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
            <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-extrabold text-[#122361] ring-1 ring-slate-200">
              <Hash className="h-3 w-3" aria-hidden="true" />
              Request {request.requestId}
            </span>
            <span className="min-w-0 whitespace-normal break-words text-xs font-semibold leading-[1.25] text-slate-700 [overflow-wrap:anywhere]">
              {request.details || 'No purpose provided.'}
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-2 pt-2.5 text-[0.7rem] font-bold text-slate-600">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-100">
              <Calendar className="h-3 w-3 shrink-0 text-[#243b8e]" aria-hidden="true" />
              <span className="truncate">{formatShortDate(request.submittedAt)}</span>
            </span>
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-100">
              <Clock3 className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
              <span className="truncate">{formatShortDate(request.updatedAt)}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3ff] px-2 py-0.5 text-[#122361] ring-1 ring-[#d8def2]">
              <Paperclip className="h-3 w-3" aria-hidden="true" />
              {attachmentCount}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-[0.7rem] font-extrabold text-[#122361] transition-colors group-hover:text-[#00114e]">
            Details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </button>
  );
}

export default RequestCard;
