'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import MissingRequirementsConfirmModal from '@/app/components/requests/MissingRequirementsConfirmModal';

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

const getRequirementKey = (index) => `requirement-${index}`;

const getFileCount = (requirementFiles, supportingFiles) => (
  Object.values(requirementFiles || {}).reduce((total, files) => total + files.length, 0)
  + (supportingFiles || []).length
);

const getRequirementFileCount = (requirementFiles) => (
  Object.values(requirementFiles || {}).reduce((total, files) => total + files.length, 0)
);

const buildRequestFiles = (requirements, requirementFiles, supportingFiles) => {
  const files = [];
  const metadata = [];

  requirements.forEach((requirement, index) => {
    const slotFiles = requirementFiles?.[getRequirementKey(index)] || [];
    slotFiles.forEach((file) => {
      files.push(file);
      metadata.push({
        uploadGroup: 'REQUIREMENT',
        requirementIndex: index,
        requirementLabel: requirement,
        fileName: file.name,
      });
    });
  });

  (supportingFiles || []).forEach((file) => {
    files.push(file);
    metadata.push({
      uploadGroup: 'SUPPORTING',
      requirementIndex: null,
      requirementLabel: 'Other supporting files',
      fileName: file.name,
    });
  });

  return { files, metadata };
};

const getFileSignature = (selectedDocument, requirements, requirementFiles, supportingFiles) => {
  if (!selectedDocument) return '';
  const { files } = buildRequestFiles(requirements, requirementFiles, supportingFiles);
  if (files.length === 0) return '';
  return [
    selectedDocument,
    ...requirements,
    ...files.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
  ].join('|');
};

function FieldLabel({ children }) {
  return (
    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
      {children}
    </span>
  );
}

function DocumentTypeDropdown({
  documents,
  selectedDocument,
  selectedDocumentData,
  onChange,
  loading,
  disabled,
}) {
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const isDisabled = disabled || loading;

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const selectDocument = (documentId) => {
    onChange(documentId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative mt-2">
      <button
        type="button"
        onClick={() => {
          if (!isDisabled) setIsOpen((current) => !current);
        }}
        disabled={isDisabled}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left text-sm font-semibold outline-none transition ${
          isOpen
            ? 'border-[#9eaddd] bg-white ring-4 ring-[#d8def2]'
            : 'border-slate-200 bg-slate-50 hover:border-[#c2cbea] hover:bg-white'
        } ${isDisabled ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'text-slate-700'}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`truncate ${selectedDocument ? 'text-slate-700' : 'text-slate-500'}`}>
          {loading ? 'Loading documents...' : selectedDocumentData?.name || 'Choose a document'}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-[#c2cbea] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]"
          role="listbox"
        >
          <button
            type="button"
            onClick={() => selectDocument('')}
            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold transition hover:bg-[#eef3ff] ${
              selectedDocument === '' ? 'bg-[#eef3ff] text-[#122361]' : 'text-slate-600'
            }`}
            role="option"
            aria-selected={selectedDocument === ''}
          >
            <span>Choose a document</span>
            {selectedDocument === '' && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#243b8e]" />}
          </button>

          <div className="max-h-72 overflow-y-auto py-1">
            {documents.map((documentItem) => (
              <button
                key={documentItem.id}
                type="button"
                onClick={() => selectDocument(documentItem.id)}
                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#eef3ff] ${
                  selectedDocument === documentItem.id ? 'bg-[#eef3ff] text-[#122361]' : 'text-slate-700'
                }`}
                role="option"
                aria-selected={selectedDocument === documentItem.id}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold leading-5">{documentItem.name}</span>
                  {documentItem.shortDescription && (
                    <span className="mt-0.5 block line-clamp-1 text-xs font-medium text-slate-500">
                      {documentItem.shortDescription}
                    </span>
                  )}
                </span>
                {selectedDocument === documentItem.id && (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#243b8e]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const getRequirementFeedback = (requirementStatus, checking, hasFiles) => {
  if (checking && hasFiles) {
    return {
      label: 'Checking document...',
      className: 'border-[#d8def2] bg-[#eef3ff] text-[#122361]',
      message: 'Reviewing this upload against the selected requirement.',
    };
  }

  if (!requirementStatus) {
    return hasFiles
      ? {
          label: 'Needs admin review',
          className: 'border-amber-200 bg-amber-50 text-amber-700',
          message: 'Upload added. This may still need staff review.',
        }
      : null;
  }

  if (requirementStatus.status === 'MATCHED') {
    return {
      label: 'Looks correct',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      message: requirementStatus.explanation || 'This document appears to match this requirement.',
    };
  }

  if (requirementStatus.status === 'WRONG_DOCUMENT') {
    return {
      label: 'May not match',
      className: 'border-red-200 bg-red-50 text-red-700',
      message: requirementStatus.explanation || 'This may not match the required document.',
    };
  }

  if (requirementStatus.status === 'OCR_UNAVAILABLE') {
    return {
      label: 'Needs staff review',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
      message: requirementStatus.explanation || 'Automatic checking is temporarily unavailable. Staff can still review this manually.',
    };
  }

  if (requirementStatus.status === 'UNREADABLE') {
    return {
      label: 'Unreadable',
      className: 'border-red-200 bg-red-50 text-red-700',
      message: requirementStatus.explanation || 'We could not clearly review this document. Please upload a clearer file if possible.',
    };
  }

  return {
    label: requirementStatus.status === 'MISSING' ? 'Missing' : 'Needs admin review',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    message: requirementStatus.explanation || 'Needs admin review.',
  };
};

const getIdentityWarningsForFiles = (analysis, files) => {
  const fileNames = new Set((files || []).map((file) => file.name));
  if (fileNames.size === 0) return [];

  const checks = (analysis?.identityChecks || [])
    .filter((check) => fileNames.has(check.fileName))
    .filter((check) => check.status && check.status !== 'MATCH');

  if (checks.length === 0) return [];

  if (checks.some((check) => check.status === 'MISMATCH')) {
    return [{
      status: 'MISMATCH',
      message: 'Some details on this ID may not match your account information.',
    }];
  }

  if (checks.some((check) => check.status === 'LOW_CONFIDENCE')) {
    return [{
      status: 'LOW_CONFIDENCE',
      message: 'We could not confidently match this ID with your account information. Staff may review it.',
    }];
  }

  return [{
    status: 'NOT_VISIBLE',
    message: 'We could not verify the ID details from this upload. Staff can review it manually.',
  }];
};

const getIdentityWarningMessage = (check) => {
  if (check.message) return check.message;
  if (check.explanation) return check.explanation;
  if (check.status === 'MISMATCH') return 'Some details on this ID may not match your account information.';
  if (check.status === 'NOT_VISIBLE') return 'We could not verify the ID details from this upload. Staff can review it manually.';
  return 'This ID needs staff review.';
};

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
  const [requirementFiles, setRequirementFiles] = useState({});
  const [supportingFiles, setSupportingFiles] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const [showMissingRequirementsPrompt, setShowMissingRequirementsPrompt] = useState(false);
  const [notification, setNotification] = useState(null);

  const selectedDocumentData = useMemo(
    () => documentsData.find((documentItem) => documentItem.id === selectedDocument),
    [documentsData, selectedDocument],
  );
  const requirements = selectedDocumentData?.details?.requirements || [];
  const selectedFileCount = getFileCount(requirementFiles, supportingFiles);
  const requirementFileCount = getRequirementFileCount(requirementFiles);
  const fileSignature = getFileSignature(selectedDocument, requirements, requirementFiles, supportingFiles);
  const hasDraft = Boolean(selectedDocument || purpose.trim() || selectedFileCount > 0);
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

  const handleSupportingFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setSupportingFiles((currentFiles) => [...currentFiles, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRequirementFileSelect = (requirementIndex, fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const key = getRequirementKey(requirementIndex);
    setRequirementFiles((currentFiles) => ({
      ...currentFiles,
      [key]: [...(currentFiles[key] || []), ...files],
    }));
  };

  const removeSupportingFile = (indexToRemove) => {
    setSupportingFiles((currentFiles) => currentFiles.filter((_, index) => index !== indexToRemove));
  };

  const removeRequirementFile = (requirementIndex, indexToRemove) => {
    const key = getRequirementKey(requirementIndex);
    setRequirementFiles((currentFiles) => ({
      ...currentFiles,
      [key]: (currentFiles[key] || []).filter((_, index) => index !== indexToRemove),
    }));
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

  const handleSubmit = async (event, { skipMissingRequirementsPrompt = false } = {}) => {
    event?.preventDefault();

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

    if (!skipMissingRequirementsPrompt && requirements.length > 0 && requirementFileCount === 0) {
      setShowMissingRequirementsPrompt(true);
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
      const { files, metadata } = buildRequestFiles(requirements, requirementFiles, supportingFiles);
      files.forEach((file) => formDataToSend.append('files', file));
      formDataToSend.append('attachmentMetadata', JSON.stringify(metadata));

      const response = await fetch('/api/document-requests', {
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

  const confirmSubmitWithoutRequirements = () => {
    setShowMissingRequirementsPrompt(false);
    handleSubmit(null, { skipMissingRequirementsPrompt: true });
  };

  const runAiCheck = useCallback(async () => {
    if (!selectedDocumentData) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    setAiChecking(true);
    try {
      const { files, metadata } = buildRequestFiles(requirements, requirementFiles, supportingFiles);
      if (files.length === 0) {
        setAiAnalysis(null);
        setAiChecking(false);
        return;
      }
      const payload = {
        documentId: selectedDocument,
        documentName: selectedDocumentData.name,
        residentId: user.residentId,
        details: purpose,
      };
      const formDataToSend = new FormData();
      formDataToSend.append('data', JSON.stringify(payload));
      files.forEach((file) => formDataToSend.append('files', file));
      formDataToSend.append('attachmentMetadata', JSON.stringify(metadata));

      const response = await fetch('/api/document-requests/ai/preview-check', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('AI check unavailable');
      }

      setAiAnalysis(await response.json());
    } catch (error) {
      setAiAnalysis({
        overallStatus: 'ERROR',
        summary: 'AI check is unavailable right now. You can still submit for manual review.',
      });
    } finally {
      setAiChecking(false);
    }
  }, [purpose, requirementFiles, requirements, selectedDocument, selectedDocumentData, supportingFiles, user?.residentId]);

  useEffect(() => {
    if (!fileSignature) {
      setAiAnalysis(null);
      setAiChecking(false);
      return undefined;
    }

    if (!fileSignature || submitting) return undefined;

    const timeoutId = window.setTimeout(() => {
      runAiCheck();
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [fileSignature, runAiCheck, submitting]);

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
                    <p className="mb-2 mt-1 max-w-2xl text-sm font-medium text-[#eef3ff]">
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
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] p-3 sm:p-4">
                  <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(310px,0.72fr)]">
                    <div className="grid min-h-0 gap-3 lg:grid-cols-2">
                      <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                        <div className="mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#243b8e]" />
                          <h3 className="text-sm font-extrabold text-slate-800">Document</h3>
                        </div>

                        <div className="block">
                          <FieldLabel>Document type *</FieldLabel>
                          <DocumentTypeDropdown
                            documents={documentsData}
                            selectedDocument={selectedDocument}
                            selectedDocumentData={selectedDocumentData}
                            loading={documentsLoading}
                            disabled={submitting}
                            onChange={(documentId) => {
                              setSelectedDocument(documentId);
                              setRequirementFiles({});
                              setAiAnalysis(null);
                            }}
                          />
                        </div>

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
                              Requirement uploads
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-500">Use the custom slots for each requirement.</p>
                          </div>
                          <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-extrabold text-[#122361] ring-1 ring-[#d8def2]">
                            {selectedFileCount} file{selectedFileCount === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="mt-3 max-h-[25rem] space-y-3 overflow-y-auto pr-1">
                          {requirements.length > 0 ? (
                            requirements.map((requirement, requirementIndex) => {
                              const key = getRequirementKey(requirementIndex);
                              const slotFiles = requirementFiles[key] || [];
                              const inputId = `dashboard-request-${key}`;
                              const requirementStatus = aiAnalysis?.requirements?.find((item) => item.requirementIndex === requirementIndex);
                              const feedback = getRequirementFeedback(requirementStatus, aiChecking, slotFiles.length > 0);
                              const identityWarnings = getIdentityWarningsForFiles(aiAnalysis, slotFiles);

                              return (
                                <div key={`${requirement}-${requirementIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-xs font-extrabold uppercase tracking-wide text-[#243b8e]">Requirement {requirementIndex + 1}</p>
                                      <p className="mt-1 text-sm font-bold leading-5 text-slate-700">{requirement}</p>
                                    </div>
                                    {feedback && (
                                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-extrabold ${feedback.className}`}>
                                        {feedback.label}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="file"
                                    id={inputId}
                                    multiple
                                    onChange={(event) => {
                                      handleRequirementFileSelect(requirementIndex, event.target.files);
                                      event.target.value = '';
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={inputId}
                                    className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#c2cbea] bg-white px-4 py-2.5 text-sm font-extrabold text-[#122361] transition hover:-translate-y-0.5 hover:border-[#9eaddd] hover:bg-[#eef3ff]"
                                  >
                                    <Upload className="h-4 w-4" />
                                    {slotFiles.length > 0 ? 'Add another file' : 'Upload for this requirement'}
                                  </label>
                                  {slotFiles.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {slotFiles.map((file, fileIndex) => (
                                        <div
                                          key={`${file.name}-${file.lastModified}-${fileIndex}`}
                                          className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"
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
                                            onClick={() => removeRequirementFile(requirementIndex, fileIndex)}
                                            className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                            aria-label={`Remove ${file.name}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {feedback?.message && (
                                    <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-200">
                                      {feedback.message}
                                    </p>
                                  )}
                                  {identityWarnings.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {identityWarnings.map((check, checkIndex) => (
                                        <div
                                          key={`${check.fileName}-${check.field}-${checkIndex}`}
                                          className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800"
                                        >
                                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                          <span>{getIdentityWarningMessage(check)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                              Requirements will appear after choosing a document.
                            </p>
                          )}

                          <div className="rounded-2xl border border-[#d8def2] bg-[#eef3ff]/60 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-extrabold text-[#122361]">Other supporting files</p>
                                <p className="text-xs font-semibold text-slate-500">Optional files that do not belong to one requirement.</p>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-[#122361] ring-1 ring-[#d8def2]">
                                {supportingFiles.length}
                              </span>
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              id="dashboard-request-supporting-upload"
                              multiple
                              onChange={handleSupportingFileSelect}
                              className="hidden"
                            />
                            <label
                              htmlFor="dashboard-request-supporting-upload"
                              className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-[#122361] shadow-sm ring-1 ring-[#d8def2] transition hover:-translate-y-0.5 hover:shadow-sm"
                            >
                              <Upload className="h-4 w-4" />
                              Add supporting files
                            </label>

                            {supportingFiles.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {supportingFiles.map((file, index) => (
                                  <div
                                    key={`${file.name}-${file.lastModified}-${index}`}
                                    className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200"
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
                                      onClick={() => removeSupportingFile(index)}
                                      className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                      aria-label={`Remove ${file.name}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
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

      <MissingRequirementsConfirmModal
        isOpen={showMissingRequirementsPrompt}
        documentName={selectedDocumentData?.name}
        onCancel={() => setShowMissingRequirementsPrompt(false)}
        onConfirm={confirmSubmitWithoutRequirements}
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
