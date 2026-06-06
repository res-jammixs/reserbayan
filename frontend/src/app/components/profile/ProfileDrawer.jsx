'use client';
import { API_BASE_URL } from '@/lib/api';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AtSign,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Home,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import ConfirmationModal from '@/app/components/ConfirmationModal';

const emptyResidentForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  residentEmail: '',
  phoneNumber: '',
  birthdate: '',
  gender: '',
  addressLine1: '',
  sitio: '',
  barangay: '',
  city: '',
  province: '',
  region: '',
};

const emptyAdminForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  residentEmail: '',
  username: '',
  phoneNumber: '',
  address: '',
  position: '',
};

function isAdminRole(role) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

function fullName(user) {
  if (!user) return 'Profile';
  return `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.replace(/\s+/g, ' ').trim()
    || user.username
    || user.residentEmail
    || 'Profile';
}

function normalizeDate(value) {
  if (!value) return '';
  return String(value).split('T')[0];
}

function formatDate(value) {
  if (!value) return 'Not provided';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAddress(user, adminMode) {
  if (!user) return 'Not provided';
  if (adminMode) return user.address || 'Not provided';

  const parts = [
    user.addressLine1,
    user.sitio,
    user.barangay,
    user.city,
    user.province,
    user.region,
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : 'Not provided';
}

function createInitialForm(user, role) {
  if (!user) return isAdminRole(role) ? emptyAdminForm : emptyResidentForm;

  if (isAdminRole(role)) {
    return {
      ...emptyAdminForm,
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      lastName: user.lastName || '',
      residentEmail: user.residentEmail || '',
      username: user.username || '',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
      position: user.position || '',
    };
  }

  return {
    ...emptyResidentForm,
    firstName: user.firstName || '',
    middleName: user.middleName || '',
    lastName: user.lastName || '',
    residentEmail: user.residentEmail || '',
    phoneNumber: user.phoneNumber || '',
    birthdate: normalizeDate(user.birthdate),
    gender: user.gender || '',
    addressLine1: user.addressLine1 || '',
    sitio: user.sitio || '',
    barangay: user.barangay || '',
    city: user.city || '',
    province: user.province || '',
    region: user.region || '',
  };
}

function initialsFor(user) {
  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || (user?.username?.charAt(0).toUpperCase() || 'U');
}

function FieldInput({ label, name, value, onChange, type = 'text', placeholder, required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2f84c0] focus:bg-white focus:ring-4 focus:ring-[#d8def2]"
      />
    </label>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#243b8e]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>
        <span className="mt-0.5 block break-words text-sm font-bold text-slate-800">{value || 'Not provided'}</span>
      </span>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[1.5rem] border border-[#d8def2] bg-white p-4 shadow-[0_8px_20px_rgba(18,35,97,0.10)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#243b8e] text-white">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-base font-extrabold text-[#122361]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function ProfileDrawer({ isOpen, onClose, user, role }) {
  const adminMode = isAdminRole(role);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(() => createInitialForm(user, role));
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState(null);

  const roleLabel = useMemo(() => {
    if (role === 'SUPER_ADMIN') return 'Superadmin Account';
    if (role === 'ADMIN') return 'Admin Account';
    return 'Resident Account';
  }, [role]);

  useEffect(() => {
    if (!isOpen) return;
    setEditing(false);
    setMessage(null);
    setFormData(createInitialForm(user, role));
  }, [isOpen, role, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleCancel = () => {
    setFormData(createInitialForm(user, role));
    setEditing(false);
    setMessage(null);
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to update profile.');
      }

      if (result.token) {
        localStorage.setItem('token', result.token);
      }
      if (result.role) {
        localStorage.setItem('role', result.role);
      }
      localStorage.setItem('user', JSON.stringify(result.user));
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: result.user }));

      setEditing(false);
      setMessage({ type: 'success', text: 'Profile changes saved successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const requestSave = (event) => {
    event.preventDefault();
    setConfirmOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && user && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-slate-950/20 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className="fixed bottom-0 right-0 top-0 z-[61] flex w-[37.5vw] min-w-[420px] max-w-[560px] flex-col overflow-hidden border-l border-[#d8def2] bg-[#FAFAFA] shadow-[0_8px_20px_rgba(15,23,42,0.08)] max-sm:left-3 max-sm:right-0 max-sm:top-0 max-sm:w-auto max-sm:min-w-0"
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-[#d8def2] bg-white px-5 pb-4 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#2f84c0]">Profile</p>
                    <h2 className="mt-1 text-2xl font-extrabold text-[#122361]">
                      Account Details
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Close profile drawer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="overflow-hidden rounded-[1.75rem] border border-[#d8def2] bg-white shadow-[0_8px_20px_rgba(18,35,97,0.10)]">
                  <div className="bg-gradient-to-br from-[#00114e] via-[#243b8e] to-[#2f84c0] p-5 text-white">
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/95 text-2xl font-extrabold text-[#122361] shadow-sm">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          initialsFor(user)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-extrabold">{fullName(user)}</h3>
                        <p className="mt-1 truncate text-sm font-semibold text-[#d8def2]">{user.residentEmail}</p>
                        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold ring-1 ring-white/20">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {message && (
                    <div
                      className={`mx-4 mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${
                        message.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                          : 'bg-red-50 text-red-700 ring-1 ring-red-100'
                      }`}
                    >
                      {message.type === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      {message.text}
                    </div>
                  )}

                  <form id="profile-drawer-form" onSubmit={requestSave} className="space-y-4 p-4">
                    {editing ? (
                      <>
                        <Section title="Identity" icon={IdCard}>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FieldInput label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
                            <FieldInput label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
                          </div>
                          <FieldInput label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} />
                          {adminMode && (
                            <FieldInput label="Username" name="username" value={formData.username} onChange={handleChange} required />
                          )}
                        </Section>

                        <Section title="Contact" icon={Phone}>
                          <FieldInput label="Email" name="residentEmail" value={formData.residentEmail} onChange={handleChange} type="email" required />
                          <FieldInput label="Phone Number" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
                        </Section>

                        {adminMode ? (
                          <Section title="Office Details" icon={BriefcaseBusiness}>
                            <FieldInput label="Position" name="position" value={formData.position} onChange={handleChange} />
                            <FieldInput label="Address" name="address" value={formData.address} onChange={handleChange} />
                          </Section>
                        ) : (
                          <>
                            <Section title="Personal" icon={User}>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <FieldInput label="Birthdate" name="birthdate" value={formData.birthdate} onChange={handleChange} type="date" />
                                <FieldInput label="Gender" name="gender" value={formData.gender} onChange={handleChange} />
                              </div>
                            </Section>
                            <Section title="Address" icon={Home}>
                              <FieldInput label="Address Line" name="addressLine1" value={formData.addressLine1} onChange={handleChange} />
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <FieldInput label="Sitio" name="sitio" value={formData.sitio} onChange={handleChange} />
                                <FieldInput label="Barangay" name="barangay" value={formData.barangay} onChange={handleChange} />
                                <FieldInput label="City" name="city" value={formData.city} onChange={handleChange} />
                                <FieldInput label="Province" name="province" value={formData.province} onChange={handleChange} />
                              </div>
                              <FieldInput label="Region" name="region" value={formData.region} onChange={handleChange} />
                            </Section>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <Section title="Personal Information" icon={IdCard}>
                          <InfoRow icon={User} label="Full Name" value={fullName(user)} />
                          {!adminMode && <InfoRow icon={CalendarDays} label="Birthdate" value={formatDate(user.birthdate)} />}
                          {!adminMode && <InfoRow icon={BadgeCheck} label="Gender" value={user.gender || 'Not provided'} />}
                          {adminMode && <InfoRow icon={AtSign} label="Username" value={user.username || 'Not provided'} />}
                          {adminMode && <InfoRow icon={BriefcaseBusiness} label="Position" value={user.position || 'Not provided'} />}
                        </Section>

                        <Section title="Contact Details" icon={Phone}>
                          <InfoRow icon={Mail} label="Email" value={user.residentEmail || 'Not provided'} />
                          <InfoRow icon={Phone} label="Phone Number" value={user.phoneNumber || 'Not provided'} />
                          <InfoRow icon={MapPin} label="Address" value={formatAddress(user, adminMode)} />
                        </Section>

                        <Section title="Account" icon={ShieldCheck}>
                          <InfoRow icon={ShieldCheck} label="Role" value={roleLabel} />
                          <InfoRow icon={BadgeCheck} label="Status" value={user.status || 'Active'} />
                          <InfoRow icon={Clock3} label="Member Since" value={formatDate(user.createdAt)} />
                        </Section>
                      </>
                    )}
                  </form>
                </div>
              </div>

              <div className="border-t border-[#d8def2] bg-white px-5 py-4">
                {editing ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="profile-drawer-form"
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#122361] to-[#2f84c0] text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(47,135,195,0.28)] transition hover:brightness-105 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? 'Saving' : 'Save Changes'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setMessage(null);
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#122361] to-[#2f84c0] text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(47,135,195,0.28)] transition hover:brightness-105"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={saveProfile}
        type="approve"
        title="Save Profile Changes?"
        message="Please confirm that you want to update your profile information."
        confirmText="Save Changes"
        cancelText="Review"
        confirmButtonClass="bg-[#122361] hover:bg-[#17205A]"
      />
    </>
  );
}
