import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

const formatTrackerDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getRequestSteps = (request) => {
  const status = request?.status?.toLowerCase() || 'pending';
  const submittedDate = formatTrackerDate(request?.submittedAt);
  const updatedDate = formatTrackerDate(request?.updatedAt);

  if (status === 'rejected') {
    return {
      tone: 'issue',
      activeIndex: 2,
      headline: 'Needs correction',
      summary: request?.rejectionReason
        ? 'Review the note and submit again.'
        : 'Review the required changes.',
      steps: [
        {
          title: 'Submitted',
          detail: 'Files received.',
          date: submittedDate,
          icon: ClipboardCheck,
          state: 'complete',
        },
        {
          title: 'Reviewed',
          detail: 'Staff checked it.',
          date: updatedDate,
          icon: ShieldCheck,
          state: 'complete',
        },
        {
          title: 'Needs correction',
          detail: request?.rejectionReason || 'Update the request.',
          date: updatedDate,
          icon: AlertTriangle,
          state: 'current',
        },
        {
          title: 'Submit again',
          detail: 'Send corrected files.',
          icon: RotateCcw,
          state: 'upcoming',
        },
      ],
    };
  }

  if (status === 'cancelled') {
    return {
      tone: 'muted',
      activeIndex: 1,
      headline: 'Request cancelled',
      summary: 'This request is closed.',
      steps: [
        {
          title: 'Submitted',
          detail: 'Request received.',
          date: submittedDate,
          icon: ClipboardCheck,
          state: 'complete',
        },
        {
          title: 'Cancelled',
          detail: 'Processing stopped.',
          date: updatedDate,
          icon: XCircle,
          state: 'current',
        },
        {
          title: 'Request again',
          detail: 'Start a new request.',
          icon: RotateCcw,
          state: 'upcoming',
        },
      ],
    };
  }

  const activeIndexByStatus = {
    pending: 1,
    approved: 2,
    'ready for pickup': 3,
    'ready-for-pickup': 3,
    completed: 4,
  };
  const activeIndex = activeIndexByStatus[status] ?? 1;

  const steps = [
    {
      title: 'Submit requirements',
      detail: 'Files submitted.',
      date: submittedDate,
      icon: ClipboardList,
    },
    {
      title: 'Pending verification',
      detail: 'Staff checks details.',
      icon: FileCheck2,
    },
    {
      title: 'Admin verified',
      detail: 'Approved for preparation.',
      date: status === 'approved' ? updatedDate : null,
      icon: ShieldCheck,
    },
    {
      title: 'Ready for pick up',
      detail: 'Claim at the office.',
      date: status === 'ready for pickup' || status === 'ready-for-pickup' ? updatedDate : null,
      icon: PackageCheck,
    },
    {
      title: 'Completed',
      detail: 'Request finalized.',
      date: status === 'completed' ? updatedDate : null,
      icon: CheckCircle2,
    },
  ].map((step, index) => ({
    ...step,
    state: index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming',
  }));

  const headlineByStatus = {
    pending: 'Verification in progress',
    approved: 'Verified by admin',
    'ready for pickup': 'Ready for pick up',
    'ready-for-pickup': 'Ready for pick up',
    completed: 'Completed',
  };

  const summaryByStatus = {
    pending: 'Checking requirements.',
    approved: 'Preparing the document.',
    'ready for pickup': 'Bring a valid ID when claiming.',
    'ready-for-pickup': 'Bring a valid ID when claiming.',
    completed: 'Request finalized.',
  };

  return {
    tone: 'normal',
    activeIndex,
    headline: headlineByStatus[status] || 'Request in progress',
    summary: summaryByStatus[status] || 'Track the current progress of this document request.',
    steps,
  };
};

const getStepClasses = (state, tone) => {
  if (tone === 'issue' && state === 'current') {
    return {
      node: 'border-amber-300 bg-amber-50 text-amber-700 shadow-[0_0_0_4px_rgba(251,191,36,0.16)]',
      text: 'text-amber-800',
    };
  }

  if (tone === 'muted' && state === 'current') {
    return {
      node: 'border-slate-300 bg-slate-100 text-slate-600 shadow-[0_0_0_4px_rgba(148,163,184,0.16)]',
      text: 'text-slate-700',
    };
  }

  if (state === 'complete') {
    return {
      node: 'border-[#2f84c0] bg-[#2f84c0] text-white shadow-[0_0_0_4px_rgba(47,132,192,0.14)]',
      text: 'text-[#00114e]',
    };
  }

  if (state === 'current') {
    return {
      node: 'border-[#243b8e] bg-white text-[#243b8e] shadow-[0_0_0_4px_rgba(36,59,142,0.16)]',
      text: 'text-[#00114e]',
    };
  }

  return {
    node: 'border-slate-200 bg-white text-slate-400',
    text: 'text-slate-500',
  };
};

function RequestProgressTracker({ request }) {
  const tracker = getRequestSteps(request);
  const progress = tracker.steps.length > 1
    ? (tracker.activeIndex / (tracker.steps.length - 1)) * 100
    : 0;
  const isIssue = tracker.tone === 'issue';

  return (
    <section className="overflow-hidden rounded-xl border border-[#d8def2] bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#e8eefb] bg-gradient-to-r from-[#f7faff] to-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#c2cbea] bg-[#eef3ff] text-[#243b8e]">
            {isIssue ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h3 className="text-sm font-extrabold leading-tight text-[#00114e]">{tracker.headline}</h3>
            </div>
            <p className="truncate text-xs font-medium text-slate-600">{tracker.summary}</p>
          </div>
        </div>
        <div className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
          isIssue
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-[#c2cbea] bg-[#eef3ff] text-[#122361]'
        }`}>
          {isIssue ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Step {Math.min(tracker.activeIndex + 1, tracker.steps.length)} of {tracker.steps.length}
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="relative">
          <div className="absolute left-4 right-4 top-4 z-0 hidden h-[3px] rounded-full bg-[#d8def2] sm:block" />
          <motion.div
            className={`absolute left-4 right-4 top-4 z-0 hidden h-[3px] origin-left rounded-full sm:block ${
              isIssue ? 'bg-amber-400' : 'bg-gradient-to-r from-[#243b8e] to-[#2f84c0]'
            }`}
            initial={false}
            animate={{ scaleX: progress / 100 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />

          <div
            className="grid grid-cols-1 gap-2 sm:[grid-template-columns:repeat(var(--tracker-steps),minmax(0,1fr))]"
            style={{ '--tracker-steps': tracker.steps.length }}
          >
            {tracker.steps.map((step, index) => {
              const Icon = step.icon;
              const classes = getStepClasses(step.state, tracker.tone);
              const isFirstStep = index === 0;
              const isLastStep = index === tracker.steps.length - 1;
              const stepAlignment = isFirstStep
                ? 'sm:items-start sm:text-left'
                : isLastStep
                  ? 'sm:items-end sm:text-right'
                  : 'sm:items-center sm:text-center';

              return (
                <motion.div
                  key={`${step.title}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.24, ease: 'easeOut' }}
                  className={`relative z-[1] flex flex-col rounded-lg border p-2 sm:border-0 sm:bg-transparent sm:p-0 ${stepAlignment} ${
                    step.state === 'current' ? 'border-[#c2cbea] bg-[#fbfdff]' : 'border-slate-100 bg-white'
                  }`}
                >
                  <motion.div
                    layout
                    className={`relative z-[2] flex h-8 w-8 items-center justify-center rounded-full border-2 ${classes.node}`}
                    animate={{ scale: step.state === 'current' ? 1.04 : 1 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </motion.div>

                  <div className="mt-2 min-w-0">
                    <p className={`text-xs font-extrabold leading-tight ${classes.text}`}>{step.title}</p>
                    <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500">{step.detail}</p>
                    {step.date && (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{step.date}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default RequestProgressTracker;
