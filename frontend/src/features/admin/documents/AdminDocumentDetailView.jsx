'use client';
import { API_BASE_URL } from '@/lib/api';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Edit,
  FileCheck2,
  FileText,
  FileUp,
  Info,
  LockKeyhole,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
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

function getImageSource(imagePath) {
  if (!imagePath) return '/reserbayan-logo.png';

  const normalizedPath = imagePath.replace(/\\/g, '/');

  if (normalizedPath.startsWith('http')) return normalizedPath;
  if (normalizedPath.startsWith('/uploads/')) return `${API_BASE_URL}${normalizedPath}`;
  if (normalizedPath.startsWith('uploads/')) return `${API_BASE_URL}/${normalizedPath}`;

  return normalizedPath;
}

function getDocumentTypeId(documentItem, fallbackId) {
  return documentItem?.typeId || documentItem?.id || fallbackId;
}

function createDocumentSlug(name = '') {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function createEditDraft(documentItem) {
  return {
    id: documentItem?.id || createDocumentSlug(documentItem?.name || ''),
    name: documentItem?.name || '',
    shortDescription: documentItem?.shortDescription || '',
    imagePath: documentItem?.imagePath || '',
    details: {
      category: documentItem?.details?.category || '',
      longDescription: documentItem?.details?.longDescription || '',
      processingTime: documentItem?.details?.processingTime || '',
      pdfPath: documentItem?.details?.pdfPath || '',
      requirements: documentItem?.details?.requirements || [],
      uses: documentItem?.details?.uses || [],
    },
  };
}

function normalizeListItems(items) {
  return items
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseProcessingTime(processingTime = '') {
  const normalizedProcessingTime = processingTime.toLowerCase().trim();

  if (!normalizedProcessingTime || normalizedProcessingTime.includes('varies')) {
    return {
      amount: '',
      unit: normalizedProcessingTime.includes('varies') ? 'varies' : 'minutes',
    };
  }

  const amount = processingTime.match(/\d+(?:\s*-\s*\d+)?/)?.[0]?.replace(/\s+/g, '') || '';

  if (normalizedProcessingTime.includes('day')) {
    return { amount, unit: 'days' };
  }

  if (normalizedProcessingTime.includes('hour')) {
    return { amount, unit: 'hours' };
  }

  return { amount, unit: 'minutes' };
}

function formatProcessingTime({ amount, unit }) {
  if (unit === 'varies') return 'Varies';

  const normalizedAmount = amount.trim();
  if (!normalizedAmount) return '';

  const isSingleValue = normalizedAmount === '1';
  const displayUnit = isSingleValue ? unit.replace(/s$/, '') : unit;

  return `${normalizedAmount} ${displayUnit}`;
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

function AdminDocumentDetailContent() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = params.id;
  const isSuperAdmin = pathname?.startsWith('/superadmin');
  const basePath = isSuperAdmin ? '/superadmin' : '/admin';
  const autoEditOpenedRef = useRef(false);
  const [documentItem, setDocumentItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationModal, setNotificationModal] = useState(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [processingTimeDraft, setProcessingTimeDraft] = useState({ amount: '', unit: 'minutes' });
  const [requirementsDraft, setRequirementsDraft] = useState([]);
  const [requirementInput, setRequirementInput] = useState('');
  const [usesText, setUsesText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/document-types/${id}`, {
          headers: token ? {
            Authorization: `Bearer ${token}`,
          } : {},
        });

        if (!response.ok) throw new Error('Failed to fetch document');

        const data = await response.json();
        setDocumentItem(data);
      } catch (error) {
        setNotificationModal({
          type: 'error',
          title: 'Document Not Found',
          message: error.message || 'Unable to load this document.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  const requirements = useMemo(() => documentItem?.details?.requirements || [], [documentItem]);
  const uses = useMemo(() => documentItem?.details?.uses || [], [documentItem]);
  const imageSource = getImageSource(documentItem?.imagePath);
  const documentTypeId = getDocumentTypeId(documentItem, id);
  const shouldAutoOpenEdit = searchParams.get('edit') === 'true';

  useEffect(() => {
    if (!isEditDrawerOpen) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditDrawerOpen]);

  const uploadFile = async (file) => {
    if (!file) return null;

    const uploadPayload = new FormData();
    uploadPayload.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/document-types/upload`, {
      method: 'POST',
      body: uploadPayload,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    });

    if (!response.ok) throw new Error('Failed to upload file');
    return response.text();
  };

  const openEditDrawer = useCallback(() => {
    const nextDraft = createEditDraft(documentItem);
    setEditDraft(nextDraft);
    setProcessingTimeDraft(parseProcessingTime(nextDraft.details.processingTime));
    setRequirementsDraft(nextDraft.details.requirements);
    setUsesText(nextDraft.details.uses.join('\n'));
    setRequirementInput('');
    setImageFile(null);
    setPdfFile(null);
    setIsEditDrawerOpen(true);
  }, [documentItem]);

  useEffect(() => {
    autoEditOpenedRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!shouldAutoOpenEdit || !documentItem || autoEditOpenedRef.current) return;

    autoEditOpenedRef.current = true;
    openEditDrawer();
  }, [openEditDrawer, shouldAutoOpenEdit, documentItem]);

  const closeEditDrawer = (force = false) => {
    if (savingEdit && !force) return;
    setIsEditDrawerOpen(false);
    setEditDraft(null);
    setProcessingTimeDraft({ amount: '', unit: 'minutes' });
    setRequirementsDraft([]);
    setRequirementInput('');
    setUsesText('');
    setImageFile(null);
    setPdfFile(null);
  };

  const handleBackToDocuments = (event) => {
    if (!isEditDrawerOpen) return;

    event.preventDefault();
    setNotificationModal({
      type: 'warning',
      title: 'Finish editing first',
      message: 'Save or cancel the document edits before returning to the documents list.',
      zIndexClass: 'z-[120]',
      backdropBlur: false,
    });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditDraft((currentDraft) => {
      if (!currentDraft) return currentDraft;

      if (name.startsWith('details.')) {
        const detailField = name.split('.')[1];
        return {
          ...currentDraft,
          details: {
            ...currentDraft.details,
            [detailField]: value,
          },
        };
      }

      return {
        ...currentDraft,
        [name]: value,
      };
    });
  };

  const addRequirement = () => {
    const nextRequirement = requirementInput.trim();
    if (!nextRequirement) return;

    setRequirementsDraft((currentRequirements) => [...currentRequirements, nextRequirement]);
    setRequirementInput('');
  };

  const removeRequirement = (indexToRemove) => {
    setRequirementsDraft((currentRequirements) => currentRequirements.filter((_, index) => index !== indexToRemove));
  };

  const updateRequirement = (indexToUpdate, value) => {
    setRequirementsDraft((currentRequirements) => currentRequirements.map((requirement, index) => (
      index === indexToUpdate ? value : requirement
    )));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editDraft) return;

    if (!editDraft.name.trim() || !editDraft.shortDescription.trim()) {
      setNotificationModal({
        type: 'warning',
        title: 'Required details missing',
        message: 'Document name and short description are required.',
      });
      return;
    }

    try {
      setSavingEdit(true);

      let imagePath = editDraft.imagePath;
      let pdfPath = editDraft.details.pdfPath;

      if (imageFile) {
        imagePath = await uploadFile(imageFile);
      }

      if (pdfFile) {
        pdfPath = await uploadFile(pdfFile);
      }

      const token = localStorage.getItem('token');
      const submitData = {
        ...editDraft,
        id: editDraft.id || createDocumentSlug(editDraft.name),
        imagePath,
        details: {
          ...editDraft.details,
          processingTime: formatProcessingTime(processingTimeDraft),
          pdfPath,
          requirements: normalizeListItems(requirementsDraft),
          uses: normalizeListItems(usesText.split('\n')),
        },
      };

      const response = await fetch(`${API_BASE_URL}/api/document-types/${documentTypeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) throw new Error('Failed to update document type');

      const updatedDocument = await response.json().catch(() => submitData);
      setDocumentItem(updatedDocument || submitData);
      closeEditDrawer(true);
      setNotificationModal({
        type: 'success',
        title: 'Document updated',
        message: 'The document information has been saved.',
        autoClose: true,
        autoCloseDelay: 2200,
      });
    } catch (error) {
      setNotificationModal({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Unable to update this document.',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter the Super Admin password to continue.');
      return;
    }

    try {
      setDeleteLoading(true);
      setDeleteError('');
      const token = localStorage.getItem('token');

      const verifyResponse = await fetch(`${API_BASE_URL}/api/superadmin/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!verifyResponse.ok) {
        const errorBody = await verifyResponse.json().catch(() => null);
        throw new Error(errorBody?.message || 'Unable to verify the Super Admin password.');
      }

      const verification = await verifyResponse.json();
      if (!verification.valid) {
        setDeleteError(verification.message || 'Incorrect Super Admin password.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/document-types/${documentTypeId}`, {
        method: 'DELETE',
        headers: token ? {
          Authorization: `Bearer ${token}`,
        } : {},
      });

      if (!response.ok) throw new Error('Failed to delete document');

      router.push(`${basePath}/documents`);
    } catch (error) {
      setDeleteError(error.message || 'Unable to delete this document.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center bg-[#FAFAFA] px-4 pt-24">
        <div className="rounded-3xl border border-[#d8def2] bg-white p-10 text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#d8def2] border-b-[#243b8e]" />
          <p className="mt-4 font-medium text-slate-600">Loading document details...</p>
        </div>
      </div>
    );
  }

  if (!documentItem) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center bg-[#FAFAFA] px-4 pt-24">
        <div className="max-w-md rounded-3xl border border-red-100 bg-white p-10 text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <p className="font-bold text-red-600">Document not found</p>
          <Link href={`${basePath}/documents`} className="mt-4 inline-flex rounded-2xl bg-[#243b8e] px-5 py-3 text-sm font-extrabold text-white">
            Back to Documents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 pb-12 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`${basePath}/documents`}
            onClick={handleBackToDocuments}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-[#9eaddd] hover:text-[#122361]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Link>
        </div>

        <motion.div
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,390px)] xl:grid-cols-[minmax(0,1fr)_420px]"
          initial={{ opacity: 0, y: 18, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <section className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur lg:p-6">
            <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-[5rem] bg-gradient-to-br from-[#eef3ff] to-[#e6eefb]" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-3 py-1.5 text-xs font-bold text-[#122361] ring-1 ring-[#d8def2]">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {documentItem.details?.category || 'General'}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    <Clock3 className="h-3.5 w-3.5 text-[#243b8e]" />
                    {documentItem.details?.processingTime || 'Timeline to be confirmed'}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                    {requirements.length} requirements
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={openEditDrawer}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#122361] shadow-sm ring-1 ring-[#d8def2] transition-all hover:-translate-y-0.5 hover:bg-[#243b8e] hover:text-white"
                    aria-label="Edit document"
                    title="Edit document"
                  >
                    <Edit className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletePassword('');
                      setDeleteError('');
                      setShowDeleteConfirm(true);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm ring-1 ring-red-100 transition-all hover:-translate-y-0.5 hover:bg-red-600 hover:text-white"
                    aria-label="Delete document"
                    title="Delete document"
                  >
                    <Trash2 className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold uppercase leading-tight tracking-tight text-[#122361] lg:text-4xl">
                {documentItem.name}
              </h1>

              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                {documentItem.details?.longDescription || documentItem.shortDescription || 'No long description has been provided yet.'}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#d8def2] bg-[#eef3ff]/70 p-4">
                  <Clock3 className="h-5 w-5 text-[#122361]" />
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#2f84c0]">Processing</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-800">{documentItem.details?.processingTime || 'TBD'}</p>
                </div>
                <div className="rounded-2xl border border-[#d8def2] bg-white p-4 shadow-sm">
                  <FileCheck2 className="h-5 w-5 text-[#122361]" />
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#2f84c0]">Requirements</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-800">{requirements.length} checklist items</p>
                </div>
                <div className="rounded-2xl border border-[#d8def2] bg-white p-4 shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-[#122361]" />
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#2f84c0]">Visibility</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-800">Resident-facing</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-[#122361]" />
                    <h2 className="text-lg font-extrabold text-[#122361]">Common Uses</h2>
                  </div>
                  {uses.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {uses.slice(0, 6).map((useItem, index) => (
                        <span
                          key={`${useItem}-${index}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {useItem}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No listed uses for this document yet.</p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-[#122361]" />
                    <h2 className="text-lg font-extrabold text-[#122361]">Requirements</h2>
                  </div>
                  {requirements.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {requirements.slice(0, 4).map((requirement, index) => (
                        <li key={`${requirement}-${index}`} className="flex gap-2 text-sm font-semibold leading-6 text-slate-700">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                          {requirement}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No listed requirements for this document.</p>
                  )}
                </div>
              </div>

            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              <div className="mb-3 flex items-center justify-between px-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Document Preview</p>
                  <p className="text-sm font-bold text-slate-700">Official sample</p>
                </div>
                <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-bold text-[#122361] ring-1 ring-[#d8def2]">
                  Preview
                </span>
              </div>
              <div className="flex max-h-[calc(100vh-11rem)] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-[#eef3ff] p-3">
                <Image
                  src={imageSource}
                  alt={`${documentItem.name} preview`}
                  width={510}
                  height={660}
                  className="max-h-[calc(100vh-13rem)] w-auto rounded-xl object-contain shadow-sm"
                  priority
                />
              </div>
            </div>
          </aside>
        </motion.div>
      </div>

      <AnimatePresence>
        {isEditDrawerOpen && editDraft && (
          <motion.aside
            className="fixed bottom-0 right-0 top-[73px] z-[55] flex w-full max-w-[min(52vw,920px)] flex-col overflow-hidden border-l border-[#d8def2] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] max-lg:max-w-[min(92vw,720px)]"
            initial={{ x: '100%', opacity: 0.7 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.7 }}
            transition={{ duration: 0.34, ease: 'easeOut' }}
          >
            <div className="relative overflow-hidden border-b border-[#d8def2] bg-gradient-to-br from-[#122361] via-[#243b8e] to-[#2f84c0] p-5 text-white">
              <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/15" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#d8def2]">Document editor</p>
                  <h2 className="mt-2 text-2xl font-extrabold leading-tight">
                    {editDraft.name || 'Untitled document'}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#eef3ff]">
                    Changes apply only after saving. Cancel closes the editor without saving.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => closeEditDrawer()}
                  className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
                  aria-label="Cancel document editing"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#FAFAFA] p-5">
                <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#243b8e]" />
                    <h3 className="text-sm font-extrabold text-slate-800">Basic information</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Document name</span>
                      <input
                        type="text"
                        name="name"
                        value={editDraft.name}
                        onChange={handleEditChange}
                        required
                        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                        placeholder="Barangay Clearance"
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Short description</span>
                      <input
                        type="text"
                        name="shortDescription"
                        value={editDraft.shortDescription}
                        onChange={handleEditChange}
                        required
                        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                        placeholder="Brief resident-facing summary"
                      />
                    </label>
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Category</span>
                      <div className="mt-2">
                        <CustomDropdown
                          options={categoryOptions}
                          value={editDraft.details.category}
                          onChange={(value) => {
                            setEditDraft((currentDraft) => currentDraft ? {
                              ...currentDraft,
                              details: {
                                ...currentDraft.details,
                                category: value,
                              },
                            } : currentDraft);
                          }}
                          ariaLabel="Select document category"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Processing time</span>
                      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <CustomDropdown
                          options={processingUnitOptions}
                          value={processingTimeDraft.unit}
                          onChange={(unit) => {
                            setProcessingTimeDraft((currentDraft) => ({
                              amount: unit === 'varies' ? '' : currentDraft.amount,
                              unit,
                            }));
                          }}
                          ariaLabel="Select processing time unit"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={processingTimeDraft.amount}
                          onChange={(event) => setProcessingTimeDraft((currentDraft) => ({
                            ...currentDraft,
                            amount: event.target.value,
                          }))}
                          disabled={processingTimeDraft.unit === 'varies'}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          placeholder={processingTimeDraft.unit === 'varies' ? 'No fixed timeline' : 'How many?'}
                        />
                      </div>
                    </div>
                    <label className="sm:col-span-2">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Long description</span>
                      <textarea
                        name="details.longDescription"
                        value={editDraft.details.longDescription}
                        onChange={handleEditChange}
                        rows={4}
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                        placeholder="Detailed description shown in the document preview page"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                        <FileCheck2 className="h-4 w-4 text-[#243b8e]" />
                        Requirements
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">Add each requirement as a separate checklist item.</p>
                    </div>
                    <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-extrabold text-[#122361] ring-1 ring-[#d8def2]">
                      {requirementsDraft.length} item{requirementsDraft.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={requirementInput}
                      onChange={(event) => setRequirementInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addRequirement();
                        }
                      }}
                      className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                      placeholder="Type a requirement, then press Enter"
                    />
                    <button
                      type="button"
                      onClick={addRequirement}
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#243b8e] text-white shadow-[0_8px_18px_rgba(36,59,142,0.14)] transition hover:-translate-y-0.5 hover:bg-[#122361]"
                      aria-label="Add requirement"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {requirementsDraft.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {requirementsDraft.map((requirement, index) => (
                        <div key={`requirement-${index}`} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          <input
                            type="text"
                            value={requirement}
                            onChange={(event) => updateRequirement(index, event.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none"
                            aria-label={`Requirement ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeRequirement(index)}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove requirement ${index + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                      No requirements listed yet.
                    </p>
                  )}
                </section>

                <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                  <label className="block">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Common uses, one per line</span>
                    <textarea
                      value={usesText}
                      onChange={(event) => setUsesText(event.target.value)}
                      rows={4}
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-[#9eaddd] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
                      placeholder="Scholarship application&#10;Medical assistance&#10;Legal aid"
                    />
                  </label>
                </section>

                <section className="rounded-3xl border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                  <div className="mb-3 flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-[#243b8e]" />
                    <h3 className="text-sm font-extrabold text-slate-800">Preview files</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="rounded-2xl border border-dashed border-[#c2cbea] bg-[#eef3ff]/60 p-3">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-[#122361]">Image preview</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                        className="mt-2 block w-full text-xs font-semibold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-extrabold file:text-[#122361]"
                      />
                      <p className="mt-2 truncate text-xs font-medium text-slate-500">
                        {imageFile ? imageFile.name : editDraft.imagePath || 'No current image'}
                      </p>
                    </label>
                    <label className="rounded-2xl border border-dashed border-[#c2cbea] bg-[#eef3ff]/60 p-3">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-[#122361]">PDF sample</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
                        className="mt-2 block w-full text-xs font-semibold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-extrabold file:text-[#122361]"
                      />
                      <p className="mt-2 truncate text-xs font-medium text-slate-500">
                        {pdfFile ? pdfFile.name : editDraft.details.pdfPath || 'No current PDF'}
                      </p>
                    </label>
                  </div>
                </section>
              </div>

              <div className="border-t border-[#d8def2] bg-white p-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => closeEditDrawer()}
                    disabled={savingEdit}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:border-[#9eaddd] hover:text-[#122361] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="inline-flex flex-[1.25] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b8e] to-[#2f84c0] px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(36,59,142,0.14)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingEdit ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-b-white" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save changes
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
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <motion.form
              onSubmit={(event) => {
                event.preventDefault();
                handleDelete();
              }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="flex items-start justify-between border-b border-red-100 bg-gradient-to-r from-red-50 to-white p-5">
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                    <LockKeyhole className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-red-600">Super Admin verification</p>
                    <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                      Delete document?
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Enter the Super Admin password to permanently remove <span className="font-extrabold text-slate-800">{documentItem.name}</span>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteLoading) return;
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="rounded-full bg-white p-2 text-slate-400 shadow-sm transition hover:text-red-600"
                  aria-label="Close delete confirmation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label htmlFor="superadmin-document-delete-password" className="text-sm font-extrabold text-slate-700">
                    Super Admin Password
                  </label>
                  <input
                    id="superadmin-document-delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    placeholder="Enter password to continue"
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-100"
                    autoFocus
                  />
                  {deleteError && (
                    <p className="mt-2 rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-100">
                      {deleteError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (deleteLoading) return;
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:border-[#c2cbea] hover:text-[#122361]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(220,38,38,0.2)] transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleteLoading ? 'Verifying...' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <NotificationModal
        isOpen={!!notificationModal}
        onClose={() => setNotificationModal(null)}
        type={notificationModal?.type}
        title={notificationModal?.title}
        message={notificationModal?.message}
        autoClose={notificationModal?.autoClose}
        autoCloseDelay={notificationModal?.autoCloseDelay}
        zIndexClass={notificationModal?.zIndexClass}
        backdropBlur={notificationModal?.backdropBlur}
      />
    </div>
  );
}

export default function AdminDocumentDetailView() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-8 pt-24">
        <div className="rounded-3xl border border-[#d8def2] bg-white p-10 text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#d8def2] border-b-[#243b8e]" />
          <p className="mt-4 font-medium text-slate-600">Loading document...</p>
        </div>
      </div>
    }>
      <AdminDocumentDetailContent />
    </Suspense>
  );
}
