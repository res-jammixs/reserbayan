'use client';

import { AlertTriangle, Paperclip, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function MissingRequirementsConfirmModal({
  isOpen,
  documentName,
  onCancel,
  onConfirm,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="missing-requirements-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[#d8def2] bg-white shadow-[0_18px_46px_rgba(15,23,42,0.18)]"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="relative border-b border-[#d8def2] bg-gradient-to-br from-[#eef3ff] via-white to-amber-50 p-5">
              <div className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="pr-14">
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#243b8e]">Review before submitting</p>
                <h2 id="missing-requirements-title" className="mt-1 text-xl font-extrabold text-[#122361]">
                  Requirement files are missing
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Your request for {documentName || 'this document'} does not include files in the required upload slots.
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
                Staff may need to decline the request or ask you to submit the missing documents later.
              </div>

              <div className="flex gap-3 rounded-2xl border border-[#d8def2] bg-[#eef3ff]/70 p-3 text-sm font-semibold leading-6 text-slate-700">
                <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-[#243b8e]" />
                <span>Attach the required files now if you already have them, or proceed only if you understand the review risk.</span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:border-[#9eaddd] hover:text-[#122361]"
                >
                  Continue editing
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b8e] to-[#2f84c0] px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(36,59,142,0.14)] transition hover:-translate-y-0.5"
                >
                  <Send className="h-4 w-4" />
                  Submit anyway
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
