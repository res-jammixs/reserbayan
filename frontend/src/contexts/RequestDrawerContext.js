'use client';
import { API_BASE_URL } from '@/lib/api';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  File,
  FileCheck2,
  FileText,
  Mail,
  MapPin,
  Minimize2,
  Paperclip,
  Phone,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import NotificationModal from '@/app/components/NotificationModal';

const RequestDrawerContext = createContext(null);

const getFullName = (user) => {
  if (!user) return 'Resident';
  return `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.replace(/\s+/g, ' ').trim() || 'Resident';
};

const getEmail = (user) => user?.residentEmail || user?.email || 'Not provided';

const getPhone = (user) => user?.phoneNumber || user?.phone || 'Not provided';

const getAddress = (user) => {
  if (!user) return 'Not provided';
  if (user.address) return user.address;

  return [
    user.addressLine1,
    user.barangay,
    user.city,
    user.province,
    user.region,
  ].filter(Boolean).join(', ') || 'Not provided';
};

const getFileSize = (size) => {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export function RequestDrawerProvider({ children }) {
  const router = useRouter();
  const { user } = useUser();
  const fileInputRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDocument, setPendingDocument] = useState(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [notification, setNotification] = useState(null);

  const residentInfo = useMemo(() => ({
    fullName: getFullName(user),
    email: getEmail(user),
    phone: getPhone(user),
    address: getAddress(user),
  }), [user]);

  const hasDraft = Boolean(draft);

  useEffect(() => {
    if (!hasDraft) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDraft]);

  const createDraft = useCallback((document) => ({
    document,
    purpose: '',
    files: [],
    createdAt: Date.now(),
  }), []);

  const startRequest = useCallback((document) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('showSignUp'));
      return;
    }

    if (!document) return;

    if (user.status === 'PENDING') {
      setNotification({
        type: 'warning',
        title: 'Account Pending',
        message: 'Your account is still pending approval. You can request documents once your account is approved.',
      });
      return;
    }

    if (user.status === 'REJECTED') {
      setNotification({
        type: 'warning',
        title: 'Account Needs Update',
        message: 'Please resubmit your account details before requesting documents.',
      });
      return;
    }

    if (draft && draft.document?.id !== document.id) {
      setPendingDocument(document);
      setShowReplaceConfirm(true);
      return;
    }

    if (!draft) {
      setDraft(createDraft(document));
    }

    setIsMinimized(false);
    setIsOpen(true);
  }, [createDraft, draft, user]);

  const confirmReplacement = useCallback(() => {
    if (!pendingDocument) return;
    setDraft(createDraft(pendingDocument));
    setPendingDocument(null);
    setShowReplaceConfirm(false);
    setIsMinimized(false);
    setIsOpen(true);
  }, [createDraft, pendingDocument]);

  const cancelReplacement = useCallback(() => {
    setPendingDocument(null);
    setShowReplaceConfirm(false);
  }, []);

  const updatePurpose = useCallback((purpose) => {
    setDraft((currentDraft) => currentDraft ? { ...currentDraft, purpose } : currentDraft);
  }, []);

  const addFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setDraft((currentDraft) => currentDraft
      ? { ...currentDraft, files: [...currentDraft.files, ...files] }
      : currentDraft);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = useCallback((indexToRemove) => {
    setDraft((currentDraft) => currentDraft
      ? { ...currentDraft, files: currentDraft.files.filter((_, index) => index !== indexToRemove) }
      : currentDraft);
  }, []);

  const minimizeRequest = useCallback(() => {
    setIsMinimized(true);
    setIsOpen(false);
  }, []);

  const restoreRequest = useCallback(() => {
    if (!draft) return;
    setIsMinimized(false);
    setIsOpen(true);
  }, [draft]);

  const discardRequest = useCallback(() => {
    setDraft(null);
    setIsOpen(false);
    setIsMinimized(false);
    setSubmitting(false);
  }, []);

  const submitRequest = useCallback(async (event) => {
    event.preventDefault();

    if (!draft?.document) return;

    if (!user) {
      window.dispatchEvent(new CustomEvent('showLogin'));
      setNotification({
        type: 'warning',
        title: 'Login Required',
        message: 'Please log in first to request documents.',
      });
      return;
    }

    if (!draft.purpose.trim()) {
      setNotification({
        type: 'warning',
        title: 'Purpose Required',
        message: 'Please state your purpose before submitting the request.',
      });
      return;
    }

    if (user.status === 'PENDING') {
      setNotification({
        type: 'warning',
        title: 'Account Pending',
        message: 'Your account is still pending approval. You can request documents once your account is approved.',
      });
      return;
    }

    if (user.status === 'REJECTED') {
      setNotification({
        type: 'warning',
        title: 'Account Needs Update',
        message: 'Please resubmit your account details before requesting documents.',
      });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.dispatchEvent(new CustomEvent('showLogin'));
      setNotification({
        type: 'warning',
        title: 'Login Required',
        message: 'Please log in again to continue.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const dataPayload = {
        documentId: draft.document.id,
        documentName: draft.document.name,
        residentId: user.residentId,
        details: draft.purpose,
      };

      const formDataToSend = new FormData();
      formDataToSend.append('data', JSON.stringify(dataPayload));
      draft.files.forEach((file) => formDataToSend.append('files', file));

      const response = await fetch(`${API_BASE_URL}/api/document-requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'We could not process your request right now.');
      }

      setNotification({
        type: 'success',
        title: 'Request Submitted',
        message: `Your request for ${draft.document.name} has been submitted successfully.`,
        autoClose: true,
        autoCloseDelay: 2500,
      });
      discardRequest();
      setTimeout(() => router.push('/requests'), 900);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Request Failed',
        message: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [discardRequest, draft, router, user]);

  const contextValue = useMemo(() => ({
    draft,
    hasDraft,
    isOpen,
    isMinimized,
    startRequest,
    minimizeRequest,
    restoreRequest,
    discardRequest,
  }), [discardRequest, draft, hasDraft, isMinimized, isOpen, minimizeRequest, restoreRequest, startRequest]);

  const requirements = draft?.document?.details?.requirements || [];

  return (
    <RequestDrawerContext.Provider value={contextValue}>
      {children}

      <AnimatePresence>
        {isOpen && draft && (
          <motion.aside
            className="fixed bottom-0 right-0 top-[73px] z-[45] flex w-full max-w-[480px] flex-col overflow-hidden border-l border-[#d8def2] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            initial={{ x: '100%', opacity: 0.7 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.7 }}
            transition={{ duration: 0.34, ease: 'easeOut' }}
          >
            <div className="relative overflow-hidden border-b border-[#d8def2] bg-gradient-to-br from-[#122361] via-[#243b8e] to-[#2f84c0] p-5 text-white">
              <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/15" />
              <div className="absolute bottom-0 right-16 h-20 w-20 rounded-full bg-[#d8def2]/20 blur-sm" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  
                  <h2 className="mt-3 text-2xl font-extrabold leading-tight">
                    {draft.document.name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#eef3ff]">
                    Autofilled resident details. Add purpose and attachments only.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={minimizeRequest}
                    className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
                    aria-label="Minimize request drawer"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={discardRequest}
                    className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
                    aria-label="Discard request draft"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={submitRequest} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#FAFAFA] p-5">
                <section className="overflow-hidden rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wide text-[#243b8e]">Resident information</p>
                      <p className="text-sm text-slate-500">Pulled from your account</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="grid gap-2">
                    {[
                      { icon: UserRound, label: 'Name', value: residentInfo.fullName },
                      { icon: Mail, label: 'Email', value: residentInfo.email },
                      { icon: Phone, label: 'Phone', value: residentInfo.phone },
                      { icon: MapPin, label: 'Address', value: residentInfo.address },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex min-w-0 gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#243b8e]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
                          <p className="whitespace-normal break-words text-sm font-bold leading-snug text-slate-700">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                  <label htmlFor="request-purpose" className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                    <FileText className="h-4 w-4 text-[#243b8e]" />
                    Purpose of request <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="request-purpose"
                    value={draft.purpose}
                    onChange={(event) => updatePurpose(event.target.value)}
                    rows={5}
                    placeholder="Example: For school enrollment, employment requirement, scholarship application..."
                    className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                    required
                  />
                </section>

                <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                        <Paperclip className="h-4 w-4 text-[#243b8e]" />
                        Attachments
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">Upload IDs or supporting files if required.</p>
                    </div>
                    <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-extrabold text-[#122361] ring-1 ring-[#d8def2]">
                      {draft.files.length} file{draft.files.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-3 rounded-2xl border border-dashed border-[#c2cbea] bg-[#eef3ff]/60 p-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="request-drawer-file-upload"
                      multiple
                      onChange={(event) => addFiles(event.target.files)}
                      className="hidden"
                    />
                    <label
                      htmlFor="request-drawer-file-upload"
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-[#122361] shadow-sm ring-1 ring-[#d8def2] transition hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <Upload className="h-4 w-4" />
                      {draft.files.length > 0 ? 'Add more files' : 'Choose files'}
                    </label>
                  </div>

                  {draft.files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {draft.files.map((file, index) => (
                        <div
                          key={`${file.name}-${file.lastModified}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <File className="h-4 w-4 shrink-0 text-[#243b8e]" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-700">{file.name}</p>
                              <p className="text-xs font-medium text-slate-400">{getFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            aria-label={`Remove ${file.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                      <FileCheck2 className="h-4 w-4 text-[#243b8e]" />
                      Requirements
                    </p>
                    <span className="text-xs font-extrabold text-slate-400">
                      {requirements.length} item{requirements.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {requirements.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {requirements.slice(0, 3).map((requirement, index) => (
                        <div key={`${requirement}-${index}`} className="flex gap-2 rounded-2xl bg-[#eef3ff]/70 p-2 text-xs font-semibold text-slate-700">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <span>{requirement}</span>
                        </div>
                      ))}
                      {requirements.length > 3 && (
                        <p className="text-xs font-bold text-[#243b8e]">
                          +{requirements.length - 3} more requirement{requirements.length - 3 === 1 ? '' : 's'} available in the document view.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                      No listed requirements for this document.
                    </p>
                  )}
                </section>
              </div>

              <div className="border-t border-[#d8def2] bg-white p-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={minimizeRequest}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:border-[#9eaddd] hover:text-[#122361]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Save to side
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex flex-[1.25] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b8e] to-[#2f84c0] px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(36,59,142,0.14)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-b-white" />
                        Submitting
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit request
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMinimized && draft && (
          <motion.button
            type="button"
            onClick={restoreRequest}
            className="fixed right-0 top-1/2 z-[44] flex -translate-y-1/2 items-center gap-2 rounded-l-3xl border border-r-0 border-[#d8def2] bg-white px-3 py-4 text-left shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:bg-[#eef3ff]"
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            aria-label="Restore document request draft"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#122361] to-[#2f84c0] text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div className="hidden max-w-[150px] sm:block">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#243b8e]">Draft saved</p>
              <p className="truncate text-sm font-extrabold text-slate-800">{draft.document.name}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </motion.button>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showReplaceConfirm}
        onClose={cancelReplacement}
        onConfirm={confirmReplacement}
        type="warning"
        title="Replace current request?"
        message="You already have an unfinished request. Starting a new one will discard the current draft."
        confirmText="Start new request"
        cancelText="Keep draft"
        confirmButtonClass="bg-[#243b8e] hover:bg-[#122361]"
      />

      <NotificationModal
        isOpen={!!notification}
        onClose={() => setNotification(null)}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        autoClose={notification?.autoClose}
        autoCloseDelay={notification?.autoCloseDelay}
      />
    </RequestDrawerContext.Provider>
  );
}

export function useRequestDrawer() {
  const context = useContext(RequestDrawerContext);
  if (!context) {
    throw new Error('useRequestDrawer must be used within a RequestDrawerProvider');
  }
  return context;
}
