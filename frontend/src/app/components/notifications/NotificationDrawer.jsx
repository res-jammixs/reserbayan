'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  RefreshCw,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import RequestModal from '@/app/components/requests/RequestModal';
import AccountActivityModal from '@/app/components/AccountActivityModal';

const adminFilters = [
  { value: 'all', label: 'All' },
  { value: 'requests', label: 'Requests' },
  { value: 'verification', label: 'Verification' },
];

function isUnread(notification) {
  return notification?.isRead === 0 || notification?.isRead === false;
}

function getNotificationId(notification) {
  return notification?.notificationId || notification?.id;
}

function getNotificationIcon(type) {
  if (type?.includes('REJECTED') || type?.includes('CANCELLED')) {
    return XCircle;
  }

  if (type?.includes('APPROVED') || type?.includes('COMPLETED')) {
    return CheckCircle2;
  }

  if (type?.includes('ACCOUNT') || type?.includes('VERIFICATION')) {
    return UserCheck;
  }

  if (type?.includes('DOCUMENT') || type?.includes('REQUEST')) {
    return ClipboardList;
  }

  return AlertCircle;
}

function formatDateTime(value) {
  if (!value) return 'Recently';

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isAdminRole(role) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

async function getResponseErrorMessage(response, fallbackMessage) {
  const responseText = await response.text().catch(() => '');

  if (responseText) {
    try {
      const parsedBody = JSON.parse(responseText);
      return parsedBody.error || parsedBody.message || responseText;
    } catch {
      return responseText;
    }
  }

  return `${fallbackMessage} (${response.status})`;
}

export default function NotificationDrawer({ isOpen, onClose, role, user, onUnreadCountChange }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [messageNotification, setMessageNotification] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAccountActivity, setShowAccountActivity] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const adminMode = isAdminRole(role);
  const unreadCount = useMemo(() => notifications.filter(isUnread).length, [notifications]);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(notifications.length / pageSize));
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return notifications.slice(startIndex, startIndex + pageSize);
  }, [currentPage, notifications]);
  const selectedCount = selectedIds.size;
  const allSelected = notifications.length > 0 && selectedCount === notifications.length;

  const updateUnreadCount = useCallback(async (currentNotifications) => {
    if (!adminMode) {
      onUnreadCountChange?.(currentNotifications.filter(isUnread).length);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      onUnreadCountChange?.(0);
      return;
    }

    try {
      const response = await fetch('/api/admin-notifications?category=all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, 'Failed to load unread count'));
      }
      const allNotifications = await response.json();
      onUnreadCountChange?.(Array.isArray(allNotifications) ? allNotifications.filter(isUnread).length : 0);
    } catch (error) {
      console.error('Failed to refresh notification badge:', error);
      onUnreadCountChange?.(currentNotifications.filter(isUnread).length);
    }
  }, [adminMode, onUnreadCountChange]);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!adminMode && !user?.residentId) {
      setNotifications([]);
      onUnreadCountChange?.(0);
      return;
    }

    setLoading(true);

    try {
      const endpoint = adminMode
        ? `/api/admin-notifications?category=${activeFilter}`
        : `/api/notifications/resident/${user.residentId}`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, 'Failed to load notifications'));
      }

      const data = await response.json();
      const nextNotifications = Array.isArray(data) ? data : [];
      setNotifications(nextNotifications);
      updateUnreadCount(nextNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, adminMode, updateUnreadCount, user?.residentId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isOpen) {
      setSelectMode(false);
      setSelectedIds(new Set());
      setCurrentPage(1);
    }
  }, [isOpen]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [activeFilter, adminMode, user?.residentId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set();
      notifications.forEach((notification) => {
        const id = getNotificationId(notification);
        if (prev.has(id)) next.add(id);
      });
      return next;
    });
  }, [notifications]);

  const markAsRead = async (notification) => {
    if (!isUnread(notification)) return;

    const token = localStorage.getItem('token');
    const notificationId = getNotificationId(notification);
    const endpoint = adminMode
      ? `/api/admin-notifications/${notificationId}/read`
      : `/api/notifications/${notificationId}/read`;

    await fetch(endpoint, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });

    const nextNotifications = notifications.map((item) => (
      getNotificationId(item) === notificationId ? { ...item, isRead: 1 } : item
    ));
    setNotifications(nextNotifications);
    updateUnreadCount(nextNotifications);
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('token');
    const endpoint = adminMode
      ? '/api/admin-notifications/read-all'
      : `/api/notifications/resident/${user.residentId}/read-all`;

    await fetch(endpoint, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });

    const nextNotifications = notifications.map((item) => ({ ...item, isRead: 1 }));
    setNotifications(nextNotifications);
    updateUnreadCount(nextNotifications);
  };

  const deleteNotification = async (notification) => {
    const token = localStorage.getItem('token');
    const notificationId = getNotificationId(notification);
    const endpoint = adminMode
      ? `/api/admin-notifications/${notificationId}`
      : `/api/notifications/${notificationId}`;

    await fetch(endpoint, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    const nextNotifications = notifications.filter((item) => getNotificationId(item) !== notificationId);
    setNotifications(nextNotifications);
    updateUnreadCount(nextNotifications);
  };

  const deleteAllNotifications = async () => {
    const token = localStorage.getItem('token');
    const endpoint = adminMode
      ? '/api/admin-notifications'
      : `/api/notifications/resident/${user.residentId}`;

    await fetch(endpoint, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    setNotifications([]);
    onUnreadCountChange?.(0);
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set());
      }
      return next;
    });
  };

  const toggleSelection = (notificationId) => {
    if (!selectMode) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!selectMode || notifications.length === 0) return;
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(notifications.map(getNotificationId)));
  };

  const handleBulkRead = async () => {
    if (selectedIds.size === 0) return;

    if (selectedIds.size === notifications.length) {
      await markAllAsRead();
      setSelectedIds(new Set());
      setSelectMode(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const unreadTargets = notifications.filter((notification) => (
      selectedIds.has(getNotificationId(notification)) && isUnread(notification)
    ));

    if (unreadTargets.length === 0) {
      setSelectedIds(new Set());
      setSelectMode(false);
      return;
    }

    await Promise.all(unreadTargets.map((notification) => {
      const notificationId = getNotificationId(notification);
      const endpoint = adminMode
        ? `/api/admin-notifications/${notificationId}/read`
        : `/api/notifications/${notificationId}/read`;

      return fetch(endpoint, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    }));

    const nextNotifications = notifications.map((item) => (
      selectedIds.has(getNotificationId(item)) ? { ...item, isRead: 1 } : item
    ));
    setNotifications(nextNotifications);
    updateUnreadCount(nextNotifications);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const executeBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (selectedIds.size === notifications.length) {
      await deleteAllNotifications();
      setSelectedIds(new Set());
      setSelectMode(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const deleteTargets = notifications.filter((notification) => (
      selectedIds.has(getNotificationId(notification))
    ));

    await Promise.all(deleteTargets.map((notification) => {
      const notificationId = getNotificationId(notification);
      const endpoint = adminMode
        ? `/api/admin-notifications/${notificationId}`
        : `/api/notifications/${notificationId}`;

      return fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }));

    const remaining = notifications.filter((item) => !selectedIds.has(getNotificationId(item)));
    setNotifications(remaining);
    updateUnreadCount(remaining);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const selectedLabel = selectedIds.size === 1 ? 'notification' : 'notifications';
    const title = 'Confirm Deletion';
    const message = selectedIds.size === notifications.length
      ? 'Are you sure you want to delete all notifications? This action cannot be undone.'
      : `Are you sure you want to delete ${selectedIds.size} ${selectedLabel}? This action cannot be undone.`;

    setDeleteModal({
      isOpen: true,
      title,
      message,
      onConfirm: executeBulkDelete,
    });
  };

  const fetchDocumentRequest = async (requestId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/document-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Unable to open request details');
    return response.json();
  };

  const openAdminNotification = async (notification) => {
    const basePath = role === 'SUPER_ADMIN' ? 'superadmin' : 'admin';

    if (notification.targetType === 'DOCUMENT_REQUEST' && notification.targetId) {
      const request = await fetchDocumentRequest(notification.targetId);
      openModalAfterNavigation(`/${basePath}/management?tab=document-requests`, () => setSelectedRequest(request));
      return;
    }

    if (notification.targetType === 'RESIDENT_REQUEST' && notification.targetId) {
      onClose?.();
      router.push(`/${basePath}/management?tab=resident-requests&residentId=${notification.targetId}`);
    }
  };

  const openResidentNotification = async (notification) => {
    const type = notification.type || '';

    if (notification.targetType === 'DOCUMENT_REQUEST' && notification.targetId) {
      try {
        const request = await fetchDocumentRequest(notification.targetId);
        openModalAfterNavigation('/requests', () => setMessageNotification({ ...notification, request }));
        return;
      } catch (error) {
        console.error(error);
      }
    }

    openModalAfterNavigation('/dashboard', () => setMessageNotification(notification));

    if (type === 'ACCOUNT_REJECTED') {
      setShowAccountActivity(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      await markAsRead(notification);
      if (adminMode) {
        await openAdminNotification(notification);
      } else {
        await openResidentNotification(notification);
      }
    } catch (error) {
      console.error('Failed to open notification:', error);
    }
  };

  const reapplyDocument = async () => {
    const request = messageNotification?.request;
    if (!request || !user?.residentId) {
      router.push('/documents');
      return;
    }

    const token = localStorage.getItem('token');
    const dataPayload = {
      documentId: request.documentId,
      documentName: request.documentName,
      residentId: user.residentId,
      details: request.details,
    };
    const formData = new FormData();
    formData.append('data', JSON.stringify(dataPayload));

    const response = await fetch('/api/document-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (response.ok) {
      setMessageNotification(null);
      router.push('/requests');
    }
  };

  const openModalAfterNavigation = (path, openModal) => {
    onClose?.();
    router.push(path);
    window.setTimeout(openModal, 180);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className="fixed right-6 top-[62px] z-[61] flex max-h-[calc(100vh-80px)] w-[430px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] max-sm:left-3 max-sm:right-3 max-sm:top-[60px] max-sm:w-auto"
              initial={{ y: -8, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -8, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-slate-100 bg-white px-5 pb-3 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-950">Notifications</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {unreadCount} unread message{unreadCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectMode}
                      disabled={notifications.length === 0}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-extrabold text-slate-700 transition hover:border-[#c2cbea] hover:text-[#122361] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {selectMode ? 'Done' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 bg-white px-4 py-3">
                {adminMode && (
                  <div className="mb-3 flex gap-2 overflow-x-auto">
                    {adminFilters.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setActiveFilter(filter.value)}
                        className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold transition ${
                          activeFilter === filter.value ? 'bg-[#eef3ff] text-[#122361]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-white p-2">
                {loading ? (
                  <div className="flex min-h-[320px] items-center justify-center text-sm font-semibold text-slate-500">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <Bell className="h-12 w-12 text-slate-300" />
                    <p className="mt-3 font-extrabold text-slate-700">No notifications</p>
                    <p className="mt-1 text-sm text-slate-500">You are all caught up.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {paginatedNotifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      const unread = isUnread(notification);
                      const notificationId = getNotificationId(notification);
                      const selected = selectedIds.has(notificationId);

                      return (
                        <article
                          key={notificationId}
                          className={`group rounded-2xl p-2.5 transition ${
                            unread ? 'bg-[#eef3ff]/55' : 'bg-white'
                          } ${selected ? 'ring-1 ring-[#c2cbea]' : 'hover:bg-slate-50'}`}
                        >
                          <button
                            type="button"
                            onClick={() => (
                              selectMode
                                ? toggleSelection(notificationId)
                                : handleNotificationClick(notification)
                            )}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            {selectMode && (
                              <span
                                role="checkbox"
                                aria-checked={selected}
                                aria-label={selected ? 'Selected notification' : 'Select notification'}
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  selected ? 'border-[#243b8e] bg-[#243b8e] text-white' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {selected && <Check className="h-3 w-3" />}
                              </span>
                            )}
                            <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              unread ? 'bg-[#d8def2] text-[#122361]' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <Icon className="h-4 w-4" />
                              {unread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#243b8e]" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block line-clamp-1 text-sm font-extrabold text-slate-900">{notification.title}</span>
                              <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-600">{notification.message}</span>
                              {notification.additionalData && (
                                <span className="mt-1.5 line-clamp-1 block rounded-2xl bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                                  {notification.additionalData}
                                </span>
                              )}
                              <span className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                                <span>{formatDateTime(notification.createdAt)}</span>
                                {unread && (
                                  <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-[10px] font-extrabold text-[#122361]">
                                    Unread
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t border-slate-100 bg-white px-4 py-3">
                  {totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const page = index + 1;
                        const isActive = page === currentPage;
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`h-7 min-w-[28px] rounded-full px-2 text-xs font-extrabold transition ${
                              isActive
                                ? 'bg-[#243b8e] text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      disabled={!selectMode || notifications.length === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-[#c2cbea] hover:text-[#122361] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                        allSelected ? 'border-[#243b8e] bg-[#243b8e] text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {allSelected && <Check className="h-3 w-3" />}
                      </span>
                      Select all
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleBulkRead}
                        disabled={!selectMode || selectedCount === 0}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#122361] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Mark selected as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        disabled={!selectMode || selectedCount === 0}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Delete selected notifications"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, title: '', message: '', onConfirm: null })}
        onConfirm={deleteModal.onConfirm || (() => {})}
        type="delete"
        title={deleteModal.title}
        message={deleteModal.message}
        confirmText="Delete"
      />

      <AnimatePresence>
        {messageNotification && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <motion.div
              className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-6 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#122361]">
                  {messageNotification.type?.includes('REJECTED') ? <AlertTriangle className="h-6 w-6 text-red-600" /> : <CheckCircle2 className="h-6 w-6" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-extrabold text-slate-900">{messageNotification.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{messageNotification.message}</p>
                  {messageNotification.additionalData && (
                    <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold leading-6 text-red-700 ring-1 ring-red-100">
                      {messageNotification.additionalData}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMessageNotification(null)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:border-[#c2cbea] hover:text-[#122361]"
                >
                  Close
                </button>
                {messageNotification.type === 'ACCOUNT_REJECTED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessageNotification(null);
                      setShowAccountActivity(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#243b8e] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#122361]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reapply
                  </button>
                )}
                {messageNotification.targetType === 'DOCUMENT_REQUEST' && messageNotification.request && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequest(messageNotification.request);
                      setMessageNotification(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#243b8e] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#122361]"
                  >
                    <FileText className="h-4 w-4" />
                    View Request
                  </button>
                )}
                {messageNotification.type === 'REQUEST_REJECTED' && (
                  <button
                    type="button"
                    onClick={reapplyDocument}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-emerald-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reapply
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedRequest && (
        <RequestModal
          request={selectedRequest}
          user={adminMode ? null : user}
          onClose={() => {
            setSelectedRequest(null);
            fetchNotifications();
          }}
          cancelRequest={async (requestId) => {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/document-requests/${requestId}/cancel`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}` },
            });
            return response.ok ? { success: true } : { success: false, error: 'Unable to cancel request.' };
          }}
          onReRequest={fetchNotifications}
          onUpdateRequest={fetchNotifications}
        />
      )}

      {showAccountActivity && user && (
        <AccountActivityModal
          isOpen={showAccountActivity}
          onClose={() => setShowAccountActivity(false)}
          user={user}
        />
      )}

    </>
  );
}
