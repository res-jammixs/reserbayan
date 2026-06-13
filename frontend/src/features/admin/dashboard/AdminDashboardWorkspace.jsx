'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PageFade from '@/shared/components/motion/PageFade';
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  FilePlus,
  FileText,
  Loader,
  Megaphone,
  Send,
  Settings,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const quickActionIcons = {
  residents: Users,
  requests: FileText,
  documents: FilePlus,
  announcements: Megaphone,
  notifications: Bell,
  admin: UserPlus,
};

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value) {
  if (!value) return 'mm/dd/yyyy';
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
}

function CustomSelect({ id, value, onChange, options, placeholder = 'Select option', ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={selectRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`flex h-11 w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left text-sm font-semibold outline-none transition-all ${
          isOpen
            ? 'border-[#2f84c0] ring-4 ring-[#d8def2]'
            : 'border-slate-200 hover:border-[#c2cbea]'
        } ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}
      >
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[80] overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
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
                className={`flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-all ${
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

function CustomDatePicker({ id, value, onChange, ariaLabel }) {
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
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`flex h-11 w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left text-sm font-semibold outline-none transition-all ${
          isOpen
            ? 'border-[#2f84c0] ring-4 ring-[#d8def2]'
            : 'border-slate-200 hover:border-[#c2cbea]'
        } ${value ? 'text-slate-900' : 'text-slate-400'}`}
      >
        <Calendar className="h-4 w-4 shrink-0 text-[#2f84c0]" />
        <span className="flex-1">{formatDateForDisplay(value)}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[90] w-[19rem] overflow-hidden rounded-3xl bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => changeMonth(-1)} className="rounded-full p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#122361]">
              <ChevronDown className="h-5 w-5 rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => setPickerMode((currentMode) => currentMode === 'days' ? 'months' : 'days')}
              className="rounded-full px-3 py-1.5 text-sm font-extrabold text-slate-800 transition-all hover:bg-[#eef3ff] hover:text-[#122361]"
            >
              {monthNames[month]} {year}
            </button>
            <button type="button" onClick={() => changeMonth(1)} className="rounded-full p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#122361]">
              <ChevronDown className="h-5 w-5 -rotate-90" />
            </button>
          </div>

          {pickerMode === 'days' && (
            <>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
                {weekdayLabels.map((weekday) => (
                  <span key={weekday} className="py-1">{weekday}</span>
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
                      className={`h-9 rounded-xl text-sm font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#243b8e] text-white shadow-sm shadow-[#d8def2]'
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
            </>
          )}

          {pickerMode === 'months' && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setPickerMode('years')}
                className="mb-3 w-full rounded-2xl bg-[#eef3ff] px-3 py-2 text-sm font-extrabold text-[#122361] transition-all hover:bg-[#d8def2]"
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
                      className={`rounded-2xl px-3 py-2 text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-[#243b8e] text-white shadow-sm shadow-[#d8def2]'
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
            <div className="mt-4 max-h-72 overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-2">
                {years.map((yearOption) => {
                  const isSelected = yearOption === year;

                  return (
                    <button
                      key={yearOption}
                      type="button"
                      onClick={() => updateYear(yearOption)}
                      className={`rounded-2xl px-3 py-2 text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-[#243b8e] text-white shadow-sm shadow-[#d8def2]'
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

          {pickerMode === 'days' && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded-full px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(formatDateForInput(today));
                  setIsOpen(false);
                }}
                className="rounded-full bg-[#eef3ff] px-3 py-1.5 text-sm font-bold text-[#122361] hover:bg-[#d8def2]"
              >
                Today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingDashboard({ text }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-6">
      <div className="w-full max-w-5xl animate-pulse space-y-4">
        <div className="h-20 rounded-3xl border border-slate-200 bg-white" />
        <div className="grid gap-3 md:grid-cols-4">
          <div className="h-24 rounded-3xl border border-slate-200 bg-white md:col-span-2" />
          <div className="h-24 rounded-3xl border border-slate-200 bg-white" />
          <div className="h-24 rounded-3xl border border-slate-200 bg-white" />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="h-80 rounded-3xl border border-slate-200 bg-white" />
          <div className="h-80 rounded-3xl border border-slate-200 bg-white" />
        </div>
        <p className="text-center text-sm font-semibold text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function NotificationToast({ notification, onClose }) {
  return (
    <AnimatePresence>
      {notification.show && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.98 }}
          className={`fixed right-4 top-4 z-[70] max-w-sm rounded-2xl border p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${
            notification.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <p className="text-sm font-semibold">{notification.message}</p>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-full p-1 transition-colors hover:bg-black/5"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* UPDATED: Smaller metric cards */
function MetricCard({ label, value, icon: Icon, urgent }) {
  return (
    <div className="relative flex min-h-[4.75rem] items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      {urgent && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-4 ring-red-100" />}

      <div className="min-w-0">
        <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold leading-none text-[#00114e]">
          {value}
        </p>
      </div>

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#243b8e]">
        <Icon className="h-4.5 w-4.5" />
      </span>
    </div>
  );
}

/* UPDATED: Always 2 columns and 2 rows on normal screen sizes */
function MetricsPanel({ stats }) {
  const metrics = [
    {
      label: 'New Requests',
      value: stats.pendingRequests,
      icon: FileText,
      urgent: stats.pendingRequests > 0,
    },
    {
      label: 'Pending Accounts',
      value: stats.pendingResidents,
      icon: UserPlus,
      urgent: stats.pendingResidents > 0,
    },
    {
      label: 'Total Residents',
      value: stats.totalResidents,
      icon: Users,
    },
    {
      label: 'Active Announcements',
      value: stats.activeAnnouncements,
      icon: Megaphone,
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            urgent={metric.urgent}
          />
        ))}
      </div>
    </section>
  );
}

function QuickActionButton({ action }) {
  const Icon = quickActionIcons[action.icon] || Settings;

  return (
    <button
      type="button"
      onClick={action.onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8def2] bg-white px-4 text-sm font-extrabold text-[#122361] transition hover:border-[#2f84c0] hover:bg-[#eef3ff]"
    >
      <Icon className="h-4 w-4" />
      {action.label}
    </button>
  );
}

function PanelHeader({ icon: Icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#243b8e]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-extrabold text-[#122361]">{title}</h2>
          <p className="text-xs font-medium text-slate-500">{subtitle}</p>
        </div>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-extrabold text-[#243b8e] transition hover:bg-[#eef3ff] hover:text-[#122361]"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const normalizedStatus = status || 'Pending';
  const styles = {
    Pending: 'border-amber-200 bg-amber-50 text-amber-700',
    Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    'Ready for Pickup': 'border-[#c2cbea] bg-[#eef3ff] text-[#122361]',
    Rejected: 'border-red-200 bg-red-50 text-red-700',
    Completed: 'border-green-200 bg-green-50 text-green-700',
  };

  return (
    <span className={`inline-flex min-w-[78px] items-center justify-center rounded-full border px-3 py-1 text-[11px] font-extrabold ${styles[normalizedStatus] || 'border-slate-200 bg-slate-100 text-slate-600'}`}>
      {normalizedStatus}
    </span>
  );
}

function RequestsPanel({ requests, error, onViewRequest, onViewAllRequests }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <PanelHeader
        icon={Clock}
        title="Recent Requests"
        subtitle="Latest document submissions"
        actionLabel="View all"
        onAction={onViewAllRequests}
      />

      {error && (
        <div className="mx-5 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3 font-extrabold">Resident</th>
              <th className="px-5 py-3 font-extrabold">Document</th>
              <th className="px-5 py-3 font-extrabold">Date</th>
              <th className="px-5 py-3 font-extrabold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.slice(0, 6).map((request) => (
              <tr
                key={request.id}
                className="cursor-pointer transition hover:bg-[#eef3ff]/45"
                onClick={() => onViewRequest(request)}
              >
                <td className="px-5 py-4">
                  <p className="font-extrabold text-slate-900">{request.resident}</p>
                  {request.email && <p className="mt-0.5 text-xs font-medium text-slate-500">{request.email}</p>}
                </td>
                <td className="px-5 py-4">
                  <p className="max-w-[220px] truncate font-bold text-slate-700">{request.documentName}</p>
                  {request.details && <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-400">{request.details}</p>}
                </td>
                <td className="px-5 py-4">
                  <p className="text-xs font-bold text-slate-600">{request.date}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{request.time}</p>
                </td>
                <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                  <StatusBadge status={request.status} />
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="4" className="px-5 py-14 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                      <FileText className="h-7 w-7" />
                    </span>
                    <div>
                      <p className="font-extrabold text-slate-800">No recent requests</p>
                      <p className="mt-1 text-sm text-slate-500">Requests will appear here automatically.</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PendingAccountsPanel({ accounts, pendingCount, onViewAccount, onViewAll }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <PanelHeader
        icon={UserPlus}
        title="Pending Accounts"
        subtitle="Resident registrations to review"
        actionLabel="Review"
        onAction={onViewAll}
      />

      <div className="space-y-2 p-4">
        {accounts.slice(0, 4).map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => onViewAccount(account)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition hover:border-[#c2cbea] hover:bg-[#eef3ff]/45"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#243b8e] text-sm font-extrabold text-white">
                {account.name?.charAt(0) || 'R'}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-slate-900">{account.name}</span>
                <span className="block truncate text-xs font-medium text-slate-500">{account.email}</span>
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500">
              {account.date}
            </span>
          </button>
        ))}

        {accounts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
            <Check className="h-6 w-6 text-slate-300" />
            <p className="mt-2 text-sm font-extrabold text-slate-700">All caught up</p>
            <p className="mt-1 text-xs text-slate-500">No pending approvals.</p>
          </div>
        )}
      </div>

      {pendingCount > accounts.slice(0, 4).length && (
        <div className="border-t border-slate-100 px-4 py-3 text-xs font-bold text-slate-500">
          {pendingCount - accounts.slice(0, 4).length} more waiting in management.
        </div>
      )}
    </section>
  );
}

function AnnouncementComposer({
  title,
  content,
  priority,
  startDate,
  endDate,
  isVisible,
  loading,
  onTitleChange,
  onContentChange,
  onPriorityChange,
  onStartDateChange,
  onEndDateChange,
  onVisibilityChange,
  onPost,
  onViewAllAnnouncements,
}) {
  const isDisabled = loading || !title.trim() || !content.trim();

  return (
    <section className="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <PanelHeader
        icon={Megaphone}
        title="Post Announcement"
        subtitle="Publish an update for residents"
        actionLabel="All"
        onAction={onViewAllAnnouncements}
      />

      <div className="space-y-3 p-4">
        <input
          type="text"
          placeholder="Announcement title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2f84c0] focus:ring-4 focus:ring-[#d8def2]"
        />
        <textarea
          rows="3"
          placeholder="Write your message here..."
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2f84c0] focus:ring-4 focus:ring-[#d8def2]"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="announcement-priority" className="mb-1.5 block text-xs font-extrabold text-slate-600">Priority</label>
            <CustomSelect
              id="announcement-priority"
              value={priority}
              onChange={onPriorityChange}
              options={priorityOptions}
              ariaLabel="Select announcement priority"
            />
          </div>
          <div>
            <label htmlFor="announcement-start-date" className="mb-1.5 block text-xs font-extrabold text-slate-600">Start Date</label>
            <CustomDatePicker
              id="announcement-start-date"
              value={startDate}
              onChange={onStartDateChange}
              ariaLabel="Select announcement start date"
            />
          </div>
          <div>
            <label htmlFor="announcement-end-date" className="mb-1.5 block text-xs font-extrabold text-slate-600">End Date</label>
            <CustomDatePicker
              id="announcement-end-date"
              value={endDate}
              onChange={onEndDateChange}
              ariaLabel="Select announcement end date"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label htmlFor="announcement-visibility" className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
            <input
              id="announcement-visibility"
              type="checkbox"
              checked={isVisible}
              onChange={(event) => onVisibilityChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#243b8e] focus:ring-[#2f84c0]"
            />
            Visible to residents
          </label>
          <button
            type="button"
            onClick={onPost}
            disabled={isDisabled}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#243b8e] px-4 text-sm font-extrabold text-white transition hover:bg-[#122361] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? 'Posting...' : 'Post Now'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function AdminDashboardWorkspace({
  loading = false,
  loadingText = 'Loading dashboard...',
  roleLabel,
  user,
  stats,
  dataLoading,
  notification,
  onCloseNotification,
  quickActions,
  recentDocRequests,
  pendingAccounts,
  requestsError,
  onViewRequest,
  onViewAccount,
  onViewAllRequests,
  onViewPendingAccounts,
  announcementTitle,
  announcementContent,
  announcementPriority,
  announcementStartDate,
  announcementEndDate,
  announcementIsVisible,
  announcementLoading,
  onAnnouncementTitleChange,
  onAnnouncementContentChange,
  onAnnouncementPriorityChange,
  onAnnouncementStartDateChange,
  onAnnouncementEndDateChange,
  onAnnouncementVisibilityChange,
  onPostAnnouncement,
  onViewAllAnnouncements,
}) {
  if (loading || dataLoading) {
    return <LoadingDashboard text={loadingText} />;
  }

  const displayName = user?.firstName || user?.fullName || roleLabel || 'Admin';

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <NotificationToast notification={notification} onClose={onCloseNotification} />

      <PageFade as="main" className="mx-auto max-w-[100rem] px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#2f84c0]">{roleLabel}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#00114e] md:text-3xl">
                  Dashboard overview
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Welcome back, {displayName}. Key work is grouped for fast review.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <QuickActionButton key={action.label} action={action} />
                ))}
              </div>
            </div>
          </section>

          {/* UPDATED LAYOUT:
              Left column: Announcement on top, Recent Requests below.
              Right column: Small 2x2 metric cards, then Pending Accounts.
          */}
          <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
            <div className="grid gap-4">
              <AnnouncementComposer
                title={announcementTitle}
                content={announcementContent}
                priority={announcementPriority}
                startDate={announcementStartDate}
                endDate={announcementEndDate}
                isVisible={announcementIsVisible}
                loading={announcementLoading}
                onTitleChange={onAnnouncementTitleChange}
                onContentChange={onAnnouncementContentChange}
                onPriorityChange={onAnnouncementPriorityChange}
                onStartDateChange={onAnnouncementStartDateChange}
                onEndDateChange={onAnnouncementEndDateChange}
                onVisibilityChange={onAnnouncementVisibilityChange}
                onPost={onPostAnnouncement}
                onViewAllAnnouncements={onViewAllAnnouncements}
              />

              <RequestsPanel
                requests={recentDocRequests}
                error={requestsError}
                onViewRequest={onViewRequest}
                onViewAllRequests={onViewAllRequests}
              />
            </div>

            <div className="grid gap-4">
              <MetricsPanel stats={stats} />

              <PendingAccountsPanel
                accounts={pendingAccounts}
                pendingCount={stats.pendingResidents}
                onViewAccount={onViewAccount}
                onViewAll={onViewPendingAccounts}
              />
            </div>
          </section>
        </div>
      </PageFade>
    </div>
  );
}
