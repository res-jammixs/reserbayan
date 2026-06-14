'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  File,
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
import { useUser } from '@/contexts/UserContext';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import NotificationModal from '@/app/components/NotificationModal';
import MissingRequirementsConfirmModal from '@/app/components/requests/MissingRequirementsConfirmModal';

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

const getRequirementKey = (index) => `requirement-${index}`;

const getDraftFileCount = (draft) => {
  if (!draft) return 0;
  const requirementCount = Object.values(draft.requirementFiles || {}).reduce((total, files) => total + files.length, 0);
  return requirementCount + (draft.supportingFiles || []).length;
};

const getDraftRequirementFileCount = (draft) => {
  if (!draft) return 0;
  return Object.values(draft.requirementFiles || {}).reduce((total, files) => total + files.length, 0);
};

const buildRequestFiles = (draft) => {
  const files = [];
  const metadata = [];
  const requirements = draft?.document?.details?.requirements || [];

  requirements.forEach((requirement, index) => {
    const slotFiles = draft.requirementFiles?.[getRequirementKey(index)] || [];
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

  (draft.supportingFiles || []).forEach((file) => {
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

const getDraftFileSignature = (draft) => {
  if (!draft?.document) return '';
  const { files } = buildRequestFiles(draft);
  if (files.length === 0) return '';
  return [
    draft.document.id,
    ...(draft.document.details?.requirements || []),
    ...files.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
  ].join('|');
};

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

export function RequestDrawerProvider({ children }) {
  const router = useRouter();
  const { user } = useUser();
  const fileInputRef = useRef(null);
  const draftRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDocument, setPendingDocument] = useState(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [showMissingRequirementsConfirm, setShowMissingRequirementsConfirm] = useState(false);
  const [notification, setNotification] = useState(null);

  const residentInfo = useMemo(() => ({
    fullName: getFullName(user),
    email: getEmail(user),
    phone: getPhone(user),
    address: getAddress(user),
  }), [user]);

  const hasDraft = Boolean(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

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
    requirementFiles: {},
    supportingFiles: [],
    aiAnalysis: null,
    aiDirty: false,
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

  const markAiDirty = useCallback((draftValue) => ({
    ...draftValue,
    aiDirty: Boolean(draftValue.aiAnalysis),
  }), []);

  const addSupportingFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setDraft((currentDraft) => currentDraft
      ? markAiDirty({ ...currentDraft, supportingFiles: [...(currentDraft.supportingFiles || []), ...files] })
      : currentDraft);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [markAiDirty]);

  const addRequirementFiles = useCallback((requirementIndex, fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const key = getRequirementKey(requirementIndex);

    setDraft((currentDraft) => currentDraft
      ? markAiDirty({
          ...currentDraft,
          requirementFiles: {
            ...(currentDraft.requirementFiles || {}),
            [key]: [...(currentDraft.requirementFiles?.[key] || []), ...files],
          },
        })
      : currentDraft);
  }, [markAiDirty]);

  const removeSupportingFile = useCallback((indexToRemove) => {
    setDraft((currentDraft) => currentDraft
      ? markAiDirty({
          ...currentDraft,
          supportingFiles: (currentDraft.supportingFiles || []).filter((_, index) => index !== indexToRemove),
        })
      : currentDraft);
  }, [markAiDirty]);

  const removeRequirementFile = useCallback((requirementIndex, indexToRemove) => {
    const key = getRequirementKey(requirementIndex);
    setDraft((currentDraft) => currentDraft
      ? markAiDirty({
          ...currentDraft,
          requirementFiles: {
            ...(currentDraft.requirementFiles || {}),
            [key]: (currentDraft.requirementFiles?.[key] || []).filter((_, index) => index !== indexToRemove),
          },
        })
      : currentDraft);
  }, [markAiDirty]);

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

  const runAiCheck = useCallback(async (draftToCheck = draftRef.current) => {
    if (!draftToCheck?.document) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setNotification({
        type: 'warning',
        title: 'Login Required',
        message: 'Please log in again to check the requirements.',
      });
      return;
    }

    setDraft((currentDraft) => currentDraft ? { ...currentDraft, aiChecking: true } : currentDraft);

    try {
      const { files, metadata } = buildRequestFiles(draftToCheck);
      if (files.length === 0) {
        setDraft((currentDraft) => currentDraft
          ? { ...currentDraft, aiAnalysis: null, aiDirty: false, aiChecking: false }
          : currentDraft);
        return;
      }
      const payload = {
        documentId: draftToCheck.document.id,
        documentName: draftToCheck.document.name,
        residentId: user?.residentId,
        details: draftToCheck.purpose,
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

      const analysis = await response.json();
      setDraft((currentDraft) => currentDraft
        ? { ...currentDraft, aiAnalysis: analysis, aiDirty: false, aiChecking: false }
        : currentDraft);
    } catch (error) {
      setDraft((currentDraft) => currentDraft
        ? {
            ...currentDraft,
            aiAnalysis: {
              overallStatus: 'ERROR',
              summary: 'AI check is unavailable right now. You can still submit for manual review.',
            },
            aiDirty: false,
            aiChecking: false,
          }
        : currentDraft);
    }
  }, [user?.residentId]);

  const draftFileSignature = getDraftFileSignature(draft);

  useEffect(() => {
    if (draftFileSignature || (!draft?.aiAnalysis && !draft?.aiChecking)) return;
    setDraft((currentDraft) => currentDraft
      ? { ...currentDraft, aiAnalysis: null, aiDirty: false, aiChecking: false }
      : currentDraft);
  }, [draft?.aiAnalysis, draft?.aiChecking, draftFileSignature]);

  useEffect(() => {
    if (!draftFileSignature || submitting) return undefined;

    const timeoutId = window.setTimeout(() => {
      runAiCheck(draftRef.current);
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [draftFileSignature, runAiCheck, submitting]);

  const submitRequest = useCallback(async (event, { skipMissingRequirementsPrompt = false } = {}) => {
    event?.preventDefault();

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

    const requirements = draft.document?.details?.requirements || [];
    if (!skipMissingRequirementsPrompt && requirements.length > 0 && getDraftRequirementFileCount(draft) === 0) {
      setShowMissingRequirementsConfirm(true);
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
      const { files, metadata } = buildRequestFiles(draft);
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

  const confirmSubmitWithoutRequirements = useCallback(() => {
    setShowMissingRequirementsConfirm(false);
    submitRequest(null, { skipMissingRequirementsPrompt: true });
  }, [submitRequest]);

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
  const hardCopySubmissionRequired = Boolean(draft?.document?.details?.hardCopySubmissionRequired);
  const hardCopyRequirements = draft?.document?.details?.hardCopyRequirements || [];
  const draftFileCount = getDraftFileCount(draft);

  return (
    <RequestDrawerContext.Provider value={contextValue}>
      {children}

      <AnimatePresence>
        {isOpen && draft && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 top-[73px] z-[44] bg-slate-950/30 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && draft && (
          <motion.aside
            className="fixed bottom-0 right-0 top-[73px] z-[45] flex w-full max-w-full flex-col overflow-hidden border-l border-[#d8def2] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] sm:max-w-[min(60vw,920px)]"
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
                <div className="grid gap-4 lg:grid-cols-2">
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

                  <section className="flex min-h-full flex-col rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
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
                      className="mt-3 min-h-[12rem] w-full flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                      required
                    />
                  </section>
                </div>

                {hardCopySubmissionRequired && (
                  <section className="rounded-3xl border border-[#c2cbea] bg-[#eef3ff]/60 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                          <FileText className="h-4 w-4 text-[#243b8e]" />
                          Hard Copy Submission
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                          Submit these physically at the barangay office after staff verifies this request.
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-[#122361] ring-1 ring-[#d8def2]">
                        Required
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {hardCopyRequirements.map((requirement, index) => (
                        <div key={`drawer-hard-copy-${requirement}-${index}`} className="flex gap-2 rounded-2xl bg-white p-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <span>{requirement}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                        <Paperclip className="h-4 w-4 text-[#243b8e]" />
                        Requirement uploads
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">Add files to the matching custom slot before submitting.</p>
                    </div>
                    <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-extrabold text-[#122361] ring-1 ring-[#d8def2]">
                      {draftFileCount} file{draftFileCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className={requirements.length > 0 ? 'mt-3 grid gap-3 xl:grid-cols-2' : 'mt-3'}>
                    {requirements.length > 0 ? (
                      requirements.map((requirement, requirementIndex) => {
                        const key = getRequirementKey(requirementIndex);
                        const slotFiles = draft.requirementFiles?.[key] || [];
                        const inputId = `request-drawer-${key}`;
                        const requirementStatus = draft.aiAnalysis?.requirements?.find((item) => item.requirementIndex === requirementIndex);
                        const feedback = getRequirementFeedback(requirementStatus, draft.aiChecking, slotFiles.length > 0);
                        const identityWarnings = getIdentityWarningsForFiles(draft.aiAnalysis, slotFiles);
                        const shouldSpanFullRow = requirements.length === 1
                          || (requirements.length % 2 === 1 && requirementIndex === requirements.length - 1);

                        return (
                          <div
                            key={`${requirement}-${requirementIndex}`}
                            className={`rounded-2xl border border-slate-200 bg-slate-50/80 p-3 ${shouldSpanFullRow ? 'xl:col-span-2' : ''}`}
                          >
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
                                addRequirementFiles(requirementIndex, event.target.files);
                                event.target.value = '';
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor={inputId}
                              className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#c2cbea] bg-white px-4 py-3 text-sm font-extrabold text-[#122361] transition hover:-translate-y-0.5 hover:border-[#9eaddd] hover:bg-[#eef3ff]"
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
                        No listed requirements for this document. Use supporting files if needed.
                      </p>
                    )}

                    <div className="rounded-2xl border border-[#d8def2] bg-[#eef3ff]/60 p-3 xl:col-span-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-extrabold text-[#122361]">Other supporting files</p>
                          <p className="text-xs font-semibold text-slate-500">Optional files that do not belong to one requirement.</p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-[#122361] ring-1 ring-[#d8def2]">
                          {(draft.supportingFiles || []).length}
                        </span>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="request-drawer-supporting-upload"
                        multiple
                        onChange={(event) => addSupportingFiles(event.target.files)}
                        className="hidden"
                      />
                      <label
                        htmlFor="request-drawer-supporting-upload"
                        className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-[#122361] shadow-sm ring-1 ring-[#d8def2] transition hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        <Upload className="h-4 w-4" />
                        Add supporting files
                      </label>

                      {(draft.supportingFiles || []).length > 0 && (
                        <div className="mt-3 space-y-2">
                          {(draft.supportingFiles || []).map((file, index) => (
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

      <MissingRequirementsConfirmModal
        isOpen={showMissingRequirementsConfirm}
        documentName={draft?.document?.name}
        onCancel={() => setShowMissingRequirementsConfirm(false)}
        onConfirm={confirmSubmitWithoutRequirements}
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
