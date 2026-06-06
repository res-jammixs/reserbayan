'use client';
import { API_BASE_URL } from '@/lib/api';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  Eye,
  EyeOff,
  Loader,
  Megaphone,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import PageFade from '@/shared/components/motion/PageFade';

const priorityOptions = [
  { value: 'ALL', label: 'All priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const formPriorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const statusOptions = [
  { value: 'ALL', label: 'All status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const visibilityOptions = [
  { value: 'ALL', label: 'All visibility' },
  { value: 'VISIBLE', label: 'Visible' },
  { value: 'HIDDEN', label: 'Hidden' },
];

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForPicker(value) {
  if (!value) return 'Select date';

  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
}

function formatDate(dateString) {
  if (!dateString) return 'Not set';

  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString) {
  if (!dateString) return 'Not set';

  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getPriorityStyles(priority) {
  switch (priority) {
    case 'URGENT':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'HIGH':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'MEDIUM':
      return 'border-[#c2cbea] bg-[#eef3ff] text-[#122361]';
    case 'LOW':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function CustomDropdown({
  id,
  icon: Icon = SlidersHorizontal,
  value,
  onChange,
  options,
  ariaLabel,
}) {
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
    <div ref={dropdownRef} className="relative z-20">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`flex h-10 w-full items-center gap-2 rounded-xl border bg-white px-3 text-left text-sm font-semibold outline-none transition ${
          isOpen
            ? 'border-[#2f84c0] ring-4 ring-[#d8def2]'
            : 'border-slate-200 hover:border-[#c2cbea]'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate text-slate-700">
          {selectedOption?.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                  isSelected
                    ? 'bg-[#243b8e] text-white'
                    : 'text-slate-700 hover:bg-[#eef3ff] hover:text-[#122361]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomDatePicker({ id, value, onChange, ariaLabel}) {
  const pickerRef = useRef(null);
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const today = new Date();

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate || today);
  const [pickerMode, setPickerMode] = useState('days');

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const currentYear = today.getFullYear();
  const startYear = Math.min(currentYear - 5, year - 5);

  const years = Array.from({ length: 21 }, (_, index) => startYear + index);

  const firstDayOfMonth = new Date(year, month, 1);
  const firstCalendarDate = new Date(firstDayOfMonth);
  firstCalendarDate.setDate(firstCalendarDate.getDate() - firstDayOfMonth.getDay());

  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCalendarDate);
    date.setDate(firstCalendarDate.getDate() + index);
    return date;
  });

  const changeMonth = (offset) => {
    setPickerMode('days');
    setViewDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const updateMonth = (monthIndex) => {
    setViewDate((currentDate) => new Date(currentDate.getFullYear(), monthIndex, 1));
    setPickerMode('days');
  };

  const updateYear = (selectedYear) => {
    setViewDate((currentDate) => new Date(selectedYear, currentDate.getMonth(), 1));
    setPickerMode('months');
  };

  return (
    <div ref={pickerRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`flex h-10 w-full items-center gap-2 rounded-xl border bg-white px-3 text-left text-sm font-semibold outline-none transition ${
          isOpen
            ? 'border-[#2f84c0] ring-4 ring-[#d8def2]'
            : 'border-slate-200 hover:border-[#c2cbea]'
        } ${value ? 'text-slate-700' : 'text-slate-400'}`}
      >
        <Calendar className="h-4 w-4 shrink-0 text-[#2f84c0]" />
        <span className="flex-1">{formatDateForPicker(value)}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-[calc(100%+0.45rem)] z-[90] w-[18rem] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#122361]"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </button>

            <button
              type="button"
              onClick={() => setPickerMode((current) => current === 'days' ? 'months' : 'days')}
              className="rounded-lg px-3 py-1.5 text-sm font-extrabold text-slate-800 transition hover:bg-[#eef3ff] hover:text-[#122361]"
            >
              {monthNames[month]} {year}
            </button>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#122361]"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </button>
          </div>

          {pickerMode === 'days' && (
            <>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
                {weekdayLabels.map((weekday) => (
                  <span key={weekday} className="py-1">
                    {weekday}
                  </span>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {calendarDays.map((date) => {
                  const dateValue = formatDateForInput(date);
                  const isCurrentMonth = date.getMonth() === month;
                  const isSelected = value === dateValue;

                  return (
                    <button
                      key={dateValue}
                      type="button"
                      onClick={() => {
                        onChange(dateValue);
                        setIsOpen(false);
                      }}
                      className={`h-8 rounded-lg text-sm font-semibold transition ${
                        isSelected
                          ? 'bg-[#243b8e] text-white'
                          : isCurrentMonth
                            ? 'text-slate-700 hover:bg-[#eef3ff] hover:text-[#122361]'
                            : 'text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-50"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onChange(formatDateForInput(today));
                    setIsOpen(false);
                  }}
                  className="rounded-lg bg-[#eef3ff] px-3 py-1.5 text-sm font-bold text-[#122361] hover:bg-[#d8def2]"
                >
                  Today
                </button>
              </div>
            </>
          )}

          {pickerMode === 'months' && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setPickerMode('years')}
                className="mb-3 w-full rounded-xl bg-[#eef3ff] px-3 py-2 text-sm font-extrabold text-[#122361] transition hover:bg-[#d8def2]"
              >
                Change year: {year}
              </button>

              <div className="grid grid-cols-3 gap-2">
                {monthNames.map((monthName, monthIndex) => {
                  const isSelected = monthIndex === month;

                  return (
                    <button
                      key={monthName}
                      type="button"
                      onClick={() => updateMonth(monthIndex)}
                      className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                        isSelected
                          ? 'bg-[#243b8e] text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-[#eef3ff] hover:text-[#122361]'
                      }`}
                    >
                      {monthName.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {pickerMode === 'years' && (
            <div className="mt-4 max-h-64 overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-2">
                {years.map((yearOption) => {
                  const isSelected = yearOption === year;

                  return (
                    <button
                      key={yearOption}
                      type="button"
                      onClick={() => updateYear(yearOption)}
                      className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                        isSelected
                          ? 'bg-[#243b8e] text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-[#eef3ff] hover:text-[#122361]'
                      }`}
                    >
                      {yearOption}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-xl font-extrabold text-[#00114e]">
            {value}
          </p>
        </div>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3ff] text-[#243b8e]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

export default function AnnouncementsManagement({ apiBase = `${API_BASE_URL}/api/superadmin`, roleLabel = 'Announcements'}) {
  const API_BASE = apiBase;

  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState('ALL');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  const [expandedAnnouncements, setExpandedAnnouncements] = useState(new Set());

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    startDate: '',
    endDate: '',
    priority: 'MEDIUM',
    isVisible: true,
  });

  const [formLoading, setFormLoading] = useState(false);

  const stats = useMemo(() => {
    return {
      total: announcements.length,
      active: announcements.filter((announcement) => announcement.isActive).length,
      visible: announcements.filter((announcement) => announcement.isVisible).length,
      urgent: announcements.filter((announcement) => announcement.priority === 'URGENT').length,
    };
  }, [announcements]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });

    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const closeNotification = () => {
    setNotification({ show: false, message: '', type: 'success' });
  };

  const fetchAnnouncements = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/announcements`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data);
        setFilteredAnnouncements(data);
      } else {
        showNotification('Failed to fetch announcements', 'error');
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showNotification('Error connecting to server', 'error');
    }
  }, []);

  useEffect(() => {
    let filtered = announcements;

    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.toLowerCase().trim();

      filtered = filtered.filter((announcement) =>
        announcement.title?.toLowerCase().includes(normalizedSearch) ||
        announcement.content?.toLowerCase().includes(normalizedSearch) ||
        announcement.postedBy?.toLowerCase().includes(normalizedSearch)
      );
    }

    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter((announcement) => announcement.priority === priorityFilter);
    }

    if (statusFilter !== 'ALL') {
      const isActive = statusFilter === 'ACTIVE';
      filtered = filtered.filter((announcement) => announcement.isActive === isActive);
    }

    if (visibilityFilter !== 'ALL') {
      const isVisible = visibilityFilter === 'VISIBLE';
      filtered = filtered.filter((announcement) => announcement.isVisible === isVisible);
    }

    setFilteredAnnouncements(filtered);
  }, [announcements, searchTerm, priorityFilter, statusFilter, visibilityFilter]);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      startDate: '',
      endDate: '',
      priority: 'MEDIUM',
      isVisible: true,
    });
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const closeFormModal = () => {
    if (formLoading) return;

    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedAnnouncement(null);
    resetForm();
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      showNotification('Title and content are required', 'error');
      return;
    }

    try {
      setFormLoading(true);

      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      const announcementData = {
        ...formData,
        postedBy: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      const response = await fetch(`${API_BASE}/announcements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(announcementData),
      });

      if (response.ok) {
        const newAnnouncement = await response.json();

        setAnnouncements((currentAnnouncements) => [newAnnouncement, ...currentAnnouncements]);
        setShowCreateModal(false);
        resetForm();
        showNotification('Announcement created successfully.', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(errorData.error || 'Failed to create announcement', 'error');
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      showNotification('Error connecting to server', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      showNotification('Title and content are required', 'error');
      return;
    }

    try {
      setFormLoading(true);

      const token = localStorage.getItem('token');

      const announcementData = {
        ...formData,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      const response = await fetch(`${API_BASE}/announcements/${selectedAnnouncement.announcementId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(announcementData),
      });

      if (response.ok) {
        const updatedAnnouncement = await response.json();

        setAnnouncements((currentAnnouncements) =>
          currentAnnouncements.map((announcement) =>
            announcement.announcementId === updatedAnnouncement.announcementId
              ? updatedAnnouncement
              : announcement
          )
        );

        setShowEditModal(false);
        setSelectedAnnouncement(null);
        resetForm();
        showNotification('Announcement updated successfully.', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(errorData.error || 'Failed to update announcement', 'error');
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
      showNotification('Error connecting to server', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/announcements/${selectedAnnouncement.announcementId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setAnnouncements((currentAnnouncements) =>
          currentAnnouncements.filter(
            (announcement) => announcement.announcementId !== selectedAnnouncement.announcementId
          )
        );

        setShowDeleteModal(false);
        setSelectedAnnouncement(null);
        showNotification('Announcement deleted successfully.', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(errorData.error || 'Failed to delete announcement', 'error');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showNotification('Error connecting to server', 'error');
    }
  };

  const toggleVisibility = async (announcement) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/announcements/${announcement.announcementId}/toggle-visibility`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setAnnouncements((currentAnnouncements) =>
          currentAnnouncements.map((currentAnnouncement) =>
            currentAnnouncement.announcementId === announcement.announcementId
              ? { ...currentAnnouncement, isVisible: !currentAnnouncement.isVisible }
              : currentAnnouncement
          )
        );

        showNotification('Visibility updated successfully.', 'success');
      } else {
        showNotification('Failed to update visibility', 'error');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      showNotification('Error connecting to server', 'error');
    }
  };

  const openEditModal = (announcement) => {
    setSelectedAnnouncement(announcement);

    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      startDate: announcement.startDate ? new Date(announcement.startDate).toISOString().split('T')[0] : '',
      endDate: announcement.endDate ? new Date(announcement.endDate).toISOString().split('T')[0] : '',
      priority: announcement.priority || 'MEDIUM',
      isVisible: Boolean(announcement.isVisible),
    });

    setShowEditModal(true);
  };

  const openDeleteModal = (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDeleteModal(true);
  };

  const toggleExpanded = (announcementId) => {
    setExpandedAnnouncements((currentSet) => {
      const newSet = new Set(currentSet);

      if (newSet.has(announcementId)) {
        newSet.delete(announcementId);
      } else {
        newSet.add(announcementId);
      }

      return newSet;
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('ALL');
    setStatusFilter('ALL');
    setVisibilityFilter('ALL');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || (role !== 'SUPER_ADMIN' && role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    setUser(storedUser);
    setLoading(false);
    fetchAnnouncements();
  }, [router, fetchAnnouncements]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-7 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#d8def2] border-b-[#243b8e]" />
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading announcements...
          </p>
        </div>
      </div>
    );
  }

  const hasFilters =
    searchTerm ||
    priorityFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    visibilityFilter !== 'ALL';

  return (
    <PageFade className="min-h-screen bg-[#FAFAFA] pt-18">
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            className={`fixed right-4 top-4 z-[100] max-w-sm rounded-xl border bg-white p-4 shadow-sm ${
              notification.type === 'success'
                ? 'border-emerald-200 text-emerald-700'
                : 'border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}

              <p className="text-sm font-semibold">{notification.message}</p>

              <button
                type="button"
                onClick={closeNotification}
                className="ml-auto rounded-lg p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#243b8e] ring-1 ring-[#d8def2]">
                <Megaphone className="h-5 w-5" />
              </span>

              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#2f84c0]">
                  {roleLabel}
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#00114e]">
                  Announcements Management
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Create, review, and manage resident-facing announcements.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#243b8e] px-4 text-sm font-extrabold text-white transition hover:bg-[#122361]"
            >
              <Plus className="h-4 w-4" />
              New Announcement
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[100rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total" value={stats.total} icon={Megaphone} />
          <StatCard label="Active" value={stats.active} icon={Activity} />
          <StatCard label="Visible" value={stats.visible} icon={Eye} />
          <StatCard label="Urgent" value={stats.urgent} icon={AlertCircle} />
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_180px_180px_180px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, content, or author"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f84c0] focus:ring-4 focus:ring-[#d8def2]"
              />
            </label>

            <CustomDropdown
              id="priority-filter"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={priorityOptions}
              ariaLabel="Filter announcements by priority"
              icon={AlertCircle}
            />

            <CustomDropdown
              id="status-filter"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              ariaLabel="Filter announcements by status"
              icon={Activity}
            />

            <CustomDropdown
              id="visibility-filter"
              value={visibilityFilter}
              onChange={setVisibilityFilter}
              options={visibilityOptions}
              ariaLabel="Filter announcements by visibility"
              icon={Eye}
            />

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-600">
              Showing <span className="text-[#122361]">{filteredAnnouncements.length}</span> announcement
              {filteredAnnouncements.length === 1 ? '' : 's'}
            </p>
          </div>

          {filteredAnnouncements.length > 0 ? (
            <div className="grid gap-3">
              <AnimatePresence>
                {filteredAnnouncements.map((announcement) => {
                  const isExpanded = expandedAnnouncements.has(announcement.announcementId);

                  return (
                    <motion.article
                      key={announcement.announcementId}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <div className="p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(announcement.announcementId)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#243b8e] ring-1 ring-[#d8def2]">
                                <Megaphone className="h-5 w-5" />
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h2 className="min-w-0 truncate text-base font-extrabold text-slate-900">
                                    {announcement.title}
                                  </h2>

                                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${getPriorityStyles(announcement.priority)}`}>
                                    {announcement.priority}
                                  </span>

                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${
                                      announcement.isActive
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                                    }`}
                                  >
                                    {announcement.isActive ? 'Active' : 'Inactive'}
                                  </span>

                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${
                                      announcement.isVisible
                                        ? 'border-[#c2cbea] bg-[#eef3ff] text-[#122361]'
                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                                    }`}
                                  >
                                    {announcement.isVisible ? 'Visible' : 'Hidden'}
                                  </span>
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                                  <span>Posted by {announcement.postedBy || 'Unknown'}</span>
                                  <span className="hidden text-slate-300 sm:inline">•</span>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatDateTime(announcement.createdAt)}
                                  </span>
                                </div>

                                <p
                                  className={`mt-3 text-sm leading-6 text-slate-600 ${
                                    isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                                  }`}
                                >
                                  {announcement.content}
                                </p>
                              </div>

                              <span className="mt-1 rounded-lg bg-slate-50 p-1 text-slate-400">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </span>
                            </div>
                          </button>

                          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                            <button
                              type="button"
                              onClick={() => toggleVisibility(announcement)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50"
                            >
                              {announcement.isVisible ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              {announcement.isVisible ? 'Hide' : 'Show'}
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(announcement)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#eef3ff] px-3 text-xs font-extrabold text-[#122361] transition hover:bg-[#d8def2]"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(announcement)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-red-50 px-3 text-xs font-extrabold text-red-600 transition hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      {(announcement.startDate || announcement.endDate) && (
                        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                            <Calendar className="h-4 w-4 text-[#243b8e]" />
                            <span className="font-extrabold text-slate-700">Validity:</span>
                            <span>{formatDate(announcement.startDate)}</span>
                            <span className="text-slate-300">to</span>
                            <span>{formatDate(announcement.endDate)}</span>
                          </div>
                        </div>
                      )}
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#243b8e]">
                <Megaphone className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                No announcements found
              </h3>

              <p className="mt-1 text-sm font-medium text-slate-500">
                {hasFilters
                  ? 'Try adjusting your filters or search keywords.'
                  : 'Create your first announcement to publish updates for residents.'}
              </p>

              {!hasFilters && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#243b8e] px-4 text-sm font-extrabold text-white transition hover:bg-[#122361]"
                >
                  <Plus className="h-4 w-4" />
                  Create Announcement
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#243b8e]">
                    <Megaphone className="h-5 w-5" />
                  </span>

                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      {showCreateModal ? 'Create Announcement' : 'Edit Announcement'}
                    </h2>
                    <p className="mt-0.5 text-sm font-medium text-slate-500">
                      Keep the announcement clear, concise, and resident-friendly.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Close form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="space-y-4 p-5">
                <div>
                  <label htmlFor="announcement-title" className="mb-1.5 block text-sm font-extrabold text-slate-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="announcement-title"
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter announcement title"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2f84c0] focus:ring-4 focus:ring-[#d8def2]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="announcement-content" className="mb-1.5 block text-sm font-extrabold text-slate-700">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="announcement-content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    rows={5}
                    placeholder="Write the announcement details here..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2f84c0] focus:ring-4 focus:ring-[#d8def2]"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor="announcement-priority" className="mb-1.5 block text-sm font-extrabold text-slate-700">
                      Priority
                    </label>
                    <CustomDropdown
                      id="announcement-priority"
                      value={formData.priority}
                      onChange={(value) =>
                        setFormData((currentData) => ({
                          ...currentData,
                          priority: value,
                        }))
                      }
                      options={formPriorityOptions}
                      ariaLabel="Select announcement priority"
                      icon={AlertCircle}
                    />
                  </div>

                  <div>
                    <label htmlFor="announcement-start-date" className="mb-1.5 block text-sm font-extrabold text-slate-700">
                      Start Date
                    </label>
                    <CustomDatePicker
                      id="announcement-start-date"
                      value={formData.startDate}
                      onChange={(value) =>
                        setFormData((currentData) => ({
                          ...currentData,
                          startDate: value,
                        }))
                      }
                      ariaLabel="Select announcement start date"
                    />
                  </div>

                  <div>
                    <label htmlFor="announcement-end-date" className="mb-1.5 block text-sm font-extrabold text-slate-700">
                      End Date
                    </label>
                    <CustomDatePicker
                      id="announcement-end-date"
                      value={formData.endDate}
                      onChange={(value) =>
                        setFormData((currentData) => ({
                          ...currentData,
                          endDate: value,
                        }))
                      }
                      ariaLabel="Select announcement end date"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <span>
                    <span className="block text-sm font-extrabold text-slate-700">
                      Visible to residents
                    </span>
                    <span className="block text-xs font-medium text-slate-500">
                      Turn this off if the announcement should be saved but hidden.
                    </span>
                  </span>

                  <input
                    type="checkbox"
                    name="isVisible"
                    checked={formData.isVisible}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-slate-300 text-[#243b8e] focus:ring-[#2f84c0]"
                  />
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={formLoading || !formData.title.trim() || !formData.content.trim()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#243b8e] px-4 text-sm font-extrabold text-white transition hover:bg-[#122361] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {formLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        {showCreateModal ? 'Creating...' : 'Updating...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {showCreateModal ? 'Create Announcement' : 'Update Announcement'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && selectedAnnouncement && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="border-b border-red-100 bg-red-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 ring-1 ring-red-100">
                    <AlertCircle className="h-5 w-5" />
                  </span>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Delete Announcement?
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p className="text-sm leading-6 text-slate-600">
                  Are you sure you want to delete{' '}
                  <span className="font-extrabold text-slate-900">
                    “{selectedAnnouncement.title}”
                  </span>
                  ?
                </p>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedAnnouncement(null);
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white transition hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageFade>
  );
}
