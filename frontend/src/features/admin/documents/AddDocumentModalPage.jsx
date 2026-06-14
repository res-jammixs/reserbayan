'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  FileText,
  FileUp,
  Minimize2,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import NotificationModal from '@/shared/components/modals/NotificationModal';

const categoryOptions = [
  { value: '', label: 'Select category' },
  { value: 'Financial Assistance', label: 'Financial Assistance' },
  { value: 'Residency', label: 'Residency' },
  { value: 'Clearance', label: 'Clearance' },
  { value: 'Permits & Tax', label: 'Permits & Tax' },
  { value: 'Infrastructure & Zoning', label: 'Infrastructure & Zoning' },
];

const processingUnitOptions = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'varies', label: 'Varies' },
];

const initialFormData = {
  name: '',
  shortDescription: '',
  imagePath: '',
  details: {
    category: '',
    longDescription: '',
    processingTimeValue: '',
    processingTimeUnit: 'days',
    pdfPath: '',
    requirements: [],
    hardCopySubmissionRequired: false,
    hardCopyRequirements: [],
    uses: [],
  },
};

const draftStorageKey = 'reserbayan:add-document-draft';

function createDocumentSlug(name = '') {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeListItems(text) {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatProcessingTime(value, unit) {
  if (unit === 'varies') return 'Varies';
  if (!value) return '';

  const normalizedUnit = value === '1' ? unit.replace(/s$/, '') : unit;
  return `${value} ${normalizedUnit}`;
}

function readStoredDraft() {
  if (typeof window === 'undefined') return null;

  try {
    const storedDraft = sessionStorage.getItem(draftStorageKey);
    return storedDraft ? JSON.parse(storedDraft) : null;
  } catch {
    return null;
  }
}

function writeStoredDraft(draft) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
  window.dispatchEvent(new Event('reserbayan:add-document-draft-changed'));
}

function clearStoredDraft() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(draftStorageKey);
  window.dispatchEvent(new Event('reserbayan:add-document-draft-changed'));
}

function CustomDropdown({ options, value, onChange, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative z-[90]">
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        className={`flex h-12 w-full items-center gap-3 rounded-2xl border bg-slate-50 px-4 text-left text-sm font-semibold text-slate-700 outline-none transition-all ${
          isOpen
            ? 'border-[#2f84c0] bg-white ring-4 ring-[#d8def2]'
            : 'border-slate-200 hover:border-[#c2cbea] hover:bg-white'
        }`}
      >
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label || 'Select'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value || 'empty-option'}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#243b8e] to-[#2f84c0] text-white shadow-sm'
                      : 'text-slate-700 hover:bg-[#eef3ff] hover:text-[#122361]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
      {children}
    </span>
  );
}

export default function AddDocumentModalPage({
  basePath,
  initialMinimized = false,
  onClose,
  onMinimizeChange,
}) {
  const router = useRouter();
  const allowRefreshRef = useRef(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [generatedId, setGeneratedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [refreshPromptOpen, setRefreshPromptOpen] = useState(false);
  const [requirementsText, setRequirementsText] = useState('');
  const [hardCopySubmissionRequired, setHardCopySubmissionRequired] = useState(false);
  const [selectedHardCopyRequirements, setSelectedHardCopyRequirements] = useState([]);
  const [usesText, setUsesText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [notification, setNotification] = useState(null);
  const hasDraft = Boolean(
    generatedId ||
    formData.name ||
    formData.shortDescription ||
    formData.details.category ||
    formData.details.longDescription ||
    formData.details.processingTimeValue ||
    requirementsText.trim() ||
    hardCopySubmissionRequired ||
    selectedHardCopyRequirements.length > 0 ||
    usesText.trim() ||
    imageFile ||
    pdfFile,
  );

  const closeModal = () => {
    if (!loading) {
      clearStoredDraft();
      if (onClose) {
        onClose();
        return;
      }

      router.push(`${basePath}/documents`);
    }
  };

  const persistDraft = (minimized = false) => {
    writeStoredDraft({
      basePath,
      formData,
      generatedId,
      requirementsText,
      hardCopySubmissionRequired,
      selectedHardCopyRequirements,
      usesText,
      imageFileName: imageFile?.name || '',
      pdfFileName: pdfFile?.name || '',
      minimized,
      updatedAt: new Date().toISOString(),
    });
  };

  const minimizeDraft = () => {
    if (loading) return;
    persistDraft(true);
    setIsMinimized(true);
    onMinimizeChange?.(true);
  };

  const discardAndRefresh = () => {
    allowRefreshRef.current = true;
    clearStoredDraft();
    window.location.reload();
  };

  const discardAndContinue = () => {
    if (pendingNavigationHref) {
      router.push(pendingNavigationHref);
      return;
    }

    discardAndRefresh();
  };

  const keepEditing = () => {
    setRefreshPromptOpen(false);
    setPendingNavigationHref('');
  };

  const toggleHardCopyRequirement = (requirement) => {
    setSelectedHardCopyRequirements((currentRequirements) => (
      currentRequirements.includes(requirement)
        ? currentRequirements.filter((item) => item !== requirement)
        : [...currentRequirements, requirement]
    ));
  };

  useEffect(() => {
    const storedDraft = readStoredDraft();

    if (storedDraft?.formData) {
      setFormData(storedDraft.formData);
      setGeneratedId(storedDraft.generatedId || '');
      setRequirementsText(storedDraft.requirementsText || '');
      setHardCopySubmissionRequired(Boolean(storedDraft.hardCopySubmissionRequired));
      setSelectedHardCopyRequirements(storedDraft.selectedHardCopyRequirements || []);
      setUsesText(storedDraft.usesText || '');
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || loading) return;

    if (hasDraft) {
      persistDraft(false);
      return;
    }

    clearStoredDraft();
  }, [formData, generatedId, hardCopySubmissionRequired, hasDraft, hydrated, imageFile, loading, pdfFile, requirementsText, selectedHardCopyRequirements, usesText]);

  useEffect(() => {
    const shouldProtectDraft = isMinimized && hasDraft && !loading;

    const handleBeforeUnload = (event) => {
      if (!shouldProtectDraft || allowRefreshRef.current) return;

      event.preventDefault();
      event.returnValue = '';
    };

    const handleRefreshShortcut = (event) => {
      const isRefreshShortcut = event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');

      if (!shouldProtectDraft || !isRefreshShortcut || allowRefreshRef.current) return;

      event.preventDefault();
      setPendingNavigationHref('');
      setRefreshPromptOpen(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleRefreshShortcut, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleRefreshShortcut, true);
    };
  }, [hasDraft, isMinimized, loading]);

  const uploadFile = async (file) => {
    if (!file) return null;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch('/api/document-types/upload', {
      method: 'POST',
      body: uploadFormData,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    });

    if (!response.ok) throw new Error('Failed to upload file');
    return response.text();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.details.category) {
      setNotification({
        type: 'error',
        title: 'Category Required',
        message: 'Please select a document category.',
      });
      return;
    }

    const requirements = normalizeListItems(requirementsText);
    const hardCopyRequirements = selectedHardCopyRequirements.filter((requirement) => requirements.includes(requirement));

    if (hardCopySubmissionRequired && hardCopyRequirements.length === 0) {
      setNotification({
        type: 'error',
        title: 'Hard Copy Requirements Needed',
        message: 'Select at least one existing requirement for hard-copy submission.',
      });
      return;
    }

    setLoading(true);

    try {
      let imagePath = formData.imagePath;
      let pdfPath = formData.details.pdfPath;

      if (imageFile) imagePath = await uploadFile(imageFile);
      if (pdfFile) pdfPath = await uploadFile(pdfFile);

      const token = localStorage.getItem('token');
      const processingTime = formatProcessingTime(
        formData.details.processingTimeValue,
        formData.details.processingTimeUnit,
      );

      const submitData = {
        ...formData,
        id: generatedId,
        imagePath,
        details: {
          ...formData.details,
          processingTime,
          pdfPath,
          requirements,
          hardCopySubmissionRequired,
          hardCopyRequirements: hardCopySubmissionRequired ? hardCopyRequirements : [],
          uses: normalizeListItems(usesText),
        },
      };

      const response = await fetch('/api/document-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) throw new Error('Failed to create document type');

      clearStoredDraft();
      if (onClose) {
        onClose();
      } else {
        router.push(`${basePath}/documents`);
      }
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Document Creation Failed',
        message: `Error creating document type: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name.startsWith('details.')) {
      const detailField = name.split('.')[1];
      setFormData((currentFormData) => ({
        ...currentFormData,
        details: {
          ...currentFormData.details,
          [detailField]: value,
        },
      }));
      return;
    }

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));

    if (name === 'name') {
      setGeneratedId(createDocumentSlug(value));
    }
  };

  const handleProcessingUnitChange = (unit) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      details: {
        ...currentFormData.details,
        processingTimeUnit: unit,
        processingTimeValue: unit === 'varies' ? '' : currentFormData.details.processingTimeValue,
      },
    }));
  };

  return (
    <>
      <AnimatePresence>
        {!isMinimized && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4 sm:p-6">
            <motion.div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1rem] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
        initial={{ opacity: 0, y: 90, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 90, scale: 0.96 }}
        transition={{ duration: 0.34, ease: 'easeOut' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-document-title"
      >
        <div className="relative overflow-hidden border-b border-[#d8def2] bg-gradient-to-br from-[#122361] via-[#243b8e] to-[#2f84c0] p-5 text-white">
          <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/15" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#d8def2]">
                Document catalog
              </p>
              <h1 id="add-document-title" className="mt-2 text-2xl font-extrabold leading-tight">
                Add document type
              </h1>
              <p className="mt-1 max-w-2xl text-sm font-medium text-[#eef3ff]">
                Create a resident-facing document card with requirements, timelines, and preview files.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={minimizeDraft}
                disabled={loading}
                className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Minimize add document form"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close add document form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#FAFAFA] p-5">
            <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#243b8e]" />
                <h2 className="text-sm font-extrabold text-slate-800">Basic information</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <FieldLabel>Document ID</FieldLabel>
                  <input
                    type="text"
                    value={generatedId}
                    disabled
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500 outline-none"
                    placeholder="Generated from name"
                  />
                  <p className="mt-1 text-xs font-medium text-slate-500">Generated automatically from the document name.</p>
                </label>

                <label>
                  <FieldLabel>Document name *</FieldLabel>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                    placeholder="Barangay Clearance"
                  />
                </label>

                <label className="sm:col-span-2">
                  <FieldLabel>Short description *</FieldLabel>
                  <input
                    type="text"
                    name="shortDescription"
                    value={formData.shortDescription}
                    onChange={handleChange}
                    required
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                    placeholder="Brief resident-facing summary"
                  />
                </label>

                <div>
                  <FieldLabel>Category *</FieldLabel>
                  <div className="mt-2">
                    <CustomDropdown
                      options={categoryOptions}
                      value={formData.details.category}
                      onChange={(value) => {
                        setFormData((currentFormData) => ({
                          ...currentFormData,
                          details: {
                            ...currentFormData.details,
                            category: value,
                          },
                        }));
                      }}
                      ariaLabel="Select document category"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Processing time *</FieldLabel>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <CustomDropdown
                      options={processingUnitOptions}
                      value={formData.details.processingTimeUnit}
                      onChange={handleProcessingUnitChange}
                      ariaLabel="Select processing time unit"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.details.processingTimeValue}
                      onChange={(event) => {
                        setFormData((currentFormData) => ({
                          ...currentFormData,
                          details: {
                            ...currentFormData.details,
                            processingTimeValue: event.target.value,
                          },
                        }));
                      }}
                      required={formData.details.processingTimeUnit !== 'varies'}
                      disabled={formData.details.processingTimeUnit === 'varies'}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      placeholder={formData.details.processingTimeUnit === 'varies' ? 'No fixed timeline' : 'How many?'}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#243b8e]" />
                <h2 className="text-sm font-extrabold text-slate-800">Resident details</h2>
              </div>

              <label className="block">
                <FieldLabel>Long description</FieldLabel>
                <textarea
                  name="details.longDescription"
                  value={formData.details.longDescription}
                  onChange={handleChange}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                  placeholder="Detailed description shown in the document preview page"
                />
              </label>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                      <FileCheck2 className="h-4 w-4 text-[#243b8e]" />
                      Requirements
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">Add one requirement per line.</p>
                  </div>
                  <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-extrabold text-[#122361] ring-1 ring-[#d8def2]">
                    {normalizeListItems(requirementsText).length} item{normalizeListItems(requirementsText).length === 1 ? '' : 's'}
                  </span>
                </div>
                <textarea
                  value={requirementsText}
                  onChange={(event) => setRequirementsText(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                  placeholder="Valid ID&#10;Proof of residency&#10;Birth certificate"
                />
              </section>

              <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                      <FileText className="h-4 w-4 text-[#243b8e]" />
                      Hard copy submission
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Physical documents residents must submit at the barangay office.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#c2cbea] bg-[#eef3ff] px-3 py-1.5 text-xs font-extrabold text-[#122361]">
                    <input
                      type="checkbox"
                      checked={hardCopySubmissionRequired}
                      onChange={(event) => setHardCopySubmissionRequired(event.target.checked)}
                      className="h-4 w-4 accent-[#243b8e]"
                    />
                    Required
                  </label>
                </div>
                {hardCopySubmissionRequired ? (
                  normalizeListItems(requirementsText).length > 0 ? (
                    <div className="space-y-2">
                      {normalizeListItems(requirementsText).map((requirement, index) => (
                        <label
                          key={`hard-copy-option-${requirement}-${index}`}
                          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700 transition hover:border-[#c2cbea] hover:bg-[#eef3ff]/70"
                        >
                          <input
                            type="checkbox"
                            checked={selectedHardCopyRequirements.includes(requirement)}
                            onChange={() => toggleHardCopyRequirement(requirement)}
                            className="mt-0.5 h-4 w-4 accent-[#243b8e]"
                          />
                          <span>{requirement}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      Add upload requirements first, then select which of them also require hard-copy submission.
                    </p>
                  )
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                    Turn this on only when residents must bring physical documents before pickup.
                  </p>
                )}
              </section>

              <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Common uses
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">Add one use case per line.</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100">
                    {normalizeListItems(usesText).length} item{normalizeListItems(usesText).length === 1 ? '' : 's'}
                  </span>
                </div>
                <textarea
                  value={usesText}
                  onChange={(event) => setUsesText(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                  placeholder="Job application&#10;Proof of residency&#10;Opening bank accounts"
                />
              </section>
            </div>

            <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              <div className="mb-3 flex items-center gap-2">
                <FileUp className="h-4 w-4 text-[#243b8e]" />
                <h2 className="text-sm font-extrabold text-slate-800">Preview files</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="rounded-2xl border border-dashed border-[#c2cbea] bg-[#eef3ff]/60 p-3">
                  <FieldLabel>Image preview</FieldLabel>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                    className="mt-2 block w-full text-xs font-semibold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-extrabold file:text-[#122361]"
                  />
                  <p className="mt-2 truncate text-xs font-medium text-slate-500">
                    {imageFile ? imageFile.name : 'No image selected'}
                  </p>
                </label>
                <label className="rounded-2xl border border-dashed border-[#c2cbea] bg-[#eef3ff]/60 p-3">
                  <FieldLabel>PDF sample</FieldLabel>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
                    className="mt-2 block w-full text-xs font-semibold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-extrabold file:text-[#122361]"
                  />
                  <p className="mt-2 truncate text-xs font-medium text-slate-500">
                    {pdfFile ? pdfFile.name : 'No PDF selected'}
                  </p>
                </label>
              </div>
            </section>
          </div>

          <div className="border-t border-[#d8def2] bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:border-[#9eaddd] hover:text-[#122361] ${loading ? 'pointer-events-none opacity-60' : ''}`}
              >
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex flex-[1.25] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b8e] to-[#2f84c0] px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(36,59,142,0.14)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-b-white" />
                    Creating
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create document type
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
                  {formData.name || 'New document type'}
                </p>
                <p className="truncate text-xs font-semibold text-slate-500">
                  Draft minimized • {generatedId || 'ID not generated yet'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMinimized(false);
                  writeStoredDraft({
                    basePath,
                    formData,
                    generatedId,
                    requirementsText,
                    hardCopySubmissionRequired,
                    selectedHardCopyRequirements,
                    usesText,
                    imageFileName: imageFile?.name || '',
                    pdfFileName: pdfFile?.name || '',
                    minimized: false,
                    updatedAt: new Date().toISOString(),
                  });
                  onMinimizeChange?.(false);
                }}
                className="rounded-2xl bg-[#243b8e] px-3 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#122361]"
              >
                Restore
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {refreshPromptOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4">
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="refresh-warning-title"
            >
              <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-400 p-5 text-white">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/20 p-2">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 id="refresh-warning-title" className="text-xl font-extrabold">
                      Finish this draft first
                    </h2>
                    <p className="mt-1 text-sm font-medium text-amber-50">
                      You have a minimized add-document draft. Leaving this screen will discard the information you entered.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p className="text-sm font-semibold leading-6 text-slate-600">
                  Continue editing to keep your work, or discard it and proceed.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={discardAndContinue}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={keepEditing}
                    className="inline-flex flex-[1.2] items-center justify-center rounded-2xl bg-[#243b8e] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#122361]"
                  >
                    Continue editing
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <NotificationModal
        isOpen={!!notification}
        onClose={() => setNotification(null)}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        autoClose={notification?.autoClose}
      />
    </>
  );
}
