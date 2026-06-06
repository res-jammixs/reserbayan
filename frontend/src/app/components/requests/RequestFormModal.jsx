'use client';
import { API_BASE_URL } from '@/lib/api';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  File,
  FileCheck2,
  FileText,
  Mail,
  MapPin,
  Minimize2,
  Paperclip,
  Phone,
  Send,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { useDocumentTypes } from '@/hooks/useDocumentTypes';
import NotificationModal from '@/app/components/NotificationModal';

function getFullName(user) {
  return `${user?.firstName || ''} ${user?.middleName || ''} ${user?.lastName || ''}`.replace(/\s+/g, ' ').trim() || 'Resident';
}

function getEmail(user) {
  return user?.residentEmail || user?.email || 'Not provided';
}

function getPhone(user) {
  return user?.phoneNumber || user?.phone || 'Not provided';
}

function getAddress(user) {
  if (!user) return 'Not provided';
  if (user.address) return user.address;

  return [
    user.addressLine1,
    user.barangay,
    user.city,
    user.province,
    user.region,
  ].filter(Boolean).join(', ') || 'Not provided';
}

function getFileSize(size) {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function FieldLabel({ children }) {
  return (
    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
      {children}
    </span>
  );
}

function DraftWarningModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4">
          <motion.div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-400 p-5 text-white">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white/20 p-2">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold">{title}</h2>
                  <p className="mt-1 text-sm font-medium text-amber-50">{message}</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm font-semibold leading-6 text-slate-600">
                Continue editing to keep your work, or discard the draft if you are done.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                >
                  {confirmText}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex flex-[1.2] items-center justify-center rounded-2xl bg-[#243b8e] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#122361]"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function RequestFormModal({ user, onClose, onSuccess }) {
  const { documentsData, loading: documentsLoading, error: documentsError } = useDocumentTypes();
  const fileInputRef = useRef(null);
  const allowRefreshRef = useRef(false);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const [notification, setNotification] = useState(null);

  const selectedDocumentData = useMemo(
    () => documentsData.find((documentItem) => documentItem.id === selectedDocument),
    [documentsData, selectedDocument],
  );
  const requirements = selectedDocumentData?.details?.requirements || [];
  const hasDraft = Boolean(selectedDocument || purpose.trim() || selectedFiles.length > 0);
  const residentInfo = useMemo(() => ([
    { icon: UserRound, label: 'Name', value: getFullName(user) },
    { icon: Mail, label: 'Email', value: getEmail(user) },
    { icon: Phone, label: 'Phone', value: getPhone(user) },
    { icon: MapPin, label: 'Address', value: getAddress(user) },
  ]), [user]);

  useEffect(() => {
    const shouldProtectDraft = hasDraft && !submitting;

    const handleBeforeUnload = (event) => {
      if (!shouldProtectDraft || allowRefreshRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const handleRefreshShortcut = (event) => {
      const isRefreshShortcut = event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');
      if (!shouldProtectDraft || !isRefreshShortcut || allowRefreshRef.current) return;

      event.preventDefault();
      setShowRefreshPrompt(true);
      setIsMinimized(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleRefreshShortcut, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleRefreshShortcut, true);
    };
  }, [hasDraft, submitting]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles((currentFiles) => [...currentFiles, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((currentFiles) => currentFiles.filter((_, index) => index !== indexToRemove));
  };

  const requestClose = () => {
    if (submitting) return;

    if (hasDraft) {
      setShowDiscardPrompt(true);
      setIsMinimized(false);
      return;
    }

    onClose();
  };

  const discardAndClose = () => {
    setShowDiscardPrompt(false);
    onClose();
  };

  const discardAndRefresh = () => {
    allowRefreshRef.current = true;
    setShowRefreshPrompt(false);
    window.location.reload();
  };

  const handleNotificationClose = () => {
    const isSuccess = notification?.type === 'success';
    setNotification(null);

    if (isSuccess) {
      onSuccess?.();
      onClose();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedDocument || !purpose.trim()) {
      setNotification({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select a document type and provide a purpose for your request.',
      });
      return;
    }

    if (!selectedDocumentData) {
      setNotification({
        type: 'error',
        title: 'Invalid Document',
        message: 'The selected document type is invalid.',
      });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setNotification({
        type: 'warning',
        title: 'Login Required',
        message: 'Please log in again before submitting your request.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const dataPayload = {
        documentId: selectedDocument,
        documentName: selectedDocumentData.name,
        residentId: user.residentId,
        details: purpose,
      };

      const formDataToSend = new FormData();
      formDataToSend.append('data', JSON.stringify(dataPayload));
      selectedFiles.forEach((file) => formDataToSend.append('files', file));

      const response = await fetch(`${API_BASE_URL}/api/document-requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'We could not process your request at this time. Please try again.');
      }

      setNotification({
        type: 'success',
        title: 'Request Submitted',
        message: `Your request for ${selectedDocumentData.name} has been successfully submitted.`,
        autoClose: false,
      });
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Submission Failed',
        message: error.message || 'Unable to connect to the server. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isMinimized && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm sm:p-5">
            <motion.div
              className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[1rem] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
              initial={{ opacity: 0, y: 90, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 90, scale: 0.96 }}
              transition={{ duration: 0.34, ease: 'easeOut' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="request-document-title"
            >
              <div className="relative overflow-hidden border-b border-[#d8def2] bg-gradient-to-br from-[#122361] via-[#243b8e] to-[#2f84c0] p-4 text-white sm:p-5">
                <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/15" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[#d8def2]">
                      Resident document request
                    </p>
                    <h2 id="request-document-title" className="mt-2 text-2xl font-extrabold leading-tight">
                      Request a document
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm font-medium text-[#eef3ff]">
                      Select a document, confirm your autofilled details, and attach supporting files in one secure form.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMinimized(true)}
                      disabled={submitting}
                      className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Minimize request form"
                    >
                      <Minimize2 className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={requestClose}
                      disabled={submitting}
                      className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Close request form"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] p-3 sm:p-4 xl:overflow-hidden">
                  <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(310px,0.72fr)]">
                    <div className="grid min-h-0 gap-3 lg:grid-cols-2">
                      <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                        <div className="mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#243b8e]" />
                          <h3 className="text-sm font-extrabold text-slate-800">Document</h3>
                        </div>

                        <label className="block">
                          <FieldLabel>Document type *</FieldLabel>
                          <div className="relative mt-2">
                            <select
                              value={selectedDocument}
                              onChange={(event) => setSelectedDocument(event.target.value)}
                              disabled={documentsLoading || submitting}
                              required
                              className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="">{documentsLoading ? 'Loading documents...' : 'Choose a document'}</option>
                              {documentsData.map((documentItem) => (
                                <option key={documentItem.id} value={documentItem.id}>
                                  {documentItem.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </label>

                        {documentsError ? (
                          <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                            Could not load document types. Please try again later.
                          </p>
                        ) : (
                          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Selected document</p>
                            <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-700">
                              {selectedDocumentData?.name || 'No document selected yet'}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
                              {selectedDocumentData?.shortDescription || 'Pick the document you need from the list above.'}
                            </p>
                          </div>
                        )}
                      </section>

                      <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <FileCheck2 className="h-4 w-4 text-[#243b8e]" />
                            <h3 className="text-sm font-extrabold text-slate-800">Requirements</h3>
                          </div>
                          <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-extrabold text-[#122361] ring-1 ring-[#d8def2]">
                            {requirements.length} item{requirements.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {requirements.length > 0 ? (
                          <div className="grid max-h-40 gap-2 overflow-y-auto pr-1">
                            {requirements.map((requirement, index) => (
                              <div key={`${requirement}-${index}`} className="flex gap-2 rounded-2xl bg-[#eef3ff]/70 p-2 text-xs font-semibold text-slate-700">
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                <span>{requirement}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">
                            {selectedDocumentData ? 'No listed requirements for this document.' : 'Requirements will appear after choosing a document.'}
                          </p>
                        )}
                      </section>

                      <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)] lg:col-span-2">
                        <label htmlFor="dashboard-request-purpose" className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                          <FileText className="h-4 w-4 text-[#243b8e]" />
                          Purpose of request <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="dashboard-request-purpose"
                          value={purpose}
                          onChange={(event) => setPurpose(event.target.value)}
                          rows={4}
                          placeholder="Example: For school enrollment, employment requirement, scholarship application..."
                          className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                          required
                        />
                      </section>
                    </div>

                    <div className="grid min-h-0 gap-3">
                      <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-extrabold uppercase tracking-wide text-[#243b8e]">Resident information</p>
                            <p className="text-xs font-medium text-slate-500">Autofilled from your account</p>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                          {residentInfo.map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex min-w-0 gap-3 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#243b8e]" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
                                <p className="break-words text-xs font-bold leading-snug text-slate-700 sm:text-sm">{value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="min-h-0 rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                              <Paperclip className="h-4 w-4 text-[#243b8e]" />
                              Attachments
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-500">Upload IDs or supporting files if needed.</p>
                          </div>
                          <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-extrabold text-[#122361] ring-1 ring-[#d8def2]">
                            {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="mt-3 rounded-2xl border border-dashed border-[#c2cbea] bg-[#eef3ff]/60 p-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            id="dashboard-request-file-upload"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <label
                            htmlFor="dashboard-request-file-upload"
                            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-[#122361] shadow-sm ring-1 ring-[#d8def2] transition hover:-translate-y-0.5 hover:shadow-sm"
                          >
                            <Upload className="h-4 w-4" />
                            {selectedFiles.length > 0 ? 'Add more files' : 'Choose files'}
                          </label>
                        </div>

                        {selectedFiles.length > 0 && (
                          <div className="mt-3 max-h-32 space-y-2 overflow-y-auto pr-1">
                            {selectedFiles.map((file, index) => (
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
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#d8def2] bg-white p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={requestClose}
                      disabled={submitting}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:border-[#9eaddd] hover:text-[#122361] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || documentsLoading}
                      className="inline-flex flex-[1.35] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b8e] to-[#2f84c0] px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(36,59,142,0.14)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMinimized && (
          <motion.div
            className="fixed bottom-6 right-6 z-[95] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-[#d8def2] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <div className="h-1.5 bg-gradient-to-r from-[#122361] via-[#2f84c0] to-[#2f84c0]" />
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#122361] to-[#2f84c0] text-white shadow-sm shadow-[#c2cbea]">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[#122361]">
                  {selectedDocumentData?.name || 'New document request'}
                </p>
                <p className="truncate text-xs font-semibold text-slate-500">
                  Dashboard draft saved
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="rounded-2xl bg-[#243b8e] px-3 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#122361]"
              >
                Restore
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DraftWarningModal
        isOpen={showDiscardPrompt}
        title="Discard this request?"
        message="You have an unfinished dashboard document request. Closing this form will discard the information you entered."
        confirmText="Discard"
        cancelText="Continue editing"
        onConfirm={discardAndClose}
        onCancel={() => setShowDiscardPrompt(false)}
      />

      <DraftWarningModal
        isOpen={showRefreshPrompt}
        title="Finish this request first"
        message="Refreshing this page will discard your dashboard document request draft."
        confirmText="Discard and refresh"
        cancelText="Continue editing"
        onConfirm={discardAndRefresh}
        onCancel={() => setShowRefreshPrompt(false)}
      />

      <NotificationModal
        isOpen={!!notification}
        onClose={handleNotificationClose}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        autoClose={notification?.autoClose}
        zIndexClass="z-[140]"
      />
    </>
  );
}
