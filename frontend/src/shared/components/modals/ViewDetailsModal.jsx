import { useState } from 'react';
import {
  X,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Eye,
  EyeOff,
  AlertTriangle,
  BadgeCheck,
  Clock,
  IdCard,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ViewDetailsModal({ isOpen, onClose, resident, documentRequest, title = "Details", showActions = false, onApprove, onReject }) {
  const [showPassword, setShowPassword] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedAttachment, setExpandedAttachment] = useState(null);

  const actualResident = documentRequest ? {
    residentId: documentRequest.residentId,
    firstName: documentRequest.residentFirstName,
    middleName: documentRequest.residentMiddleName,
    lastName: documentRequest.residentLastName,
    residentEmail: documentRequest.residentEmail,
    phoneNumber: documentRequest.residentPhoneNumber,
    birthdate: documentRequest.residentBirthdate,
    gender: documentRequest.residentGender,
    addressLine1: documentRequest.residentAddressLine1,
    sitio: documentRequest.residentSitio,
    barangay: documentRequest.residentBarangay,
    city: documentRequest.residentCity,
    province: documentRequest.residentProvince,
    region: documentRequest.residentRegion,
    createdAt: documentRequest.residentCreatedAt,
    validIdPath: documentRequest.residentValidIdPath,
  } : resident;

  if (!isOpen || !actualResident) return null;

  const isRejected = (status) => status?.toLowerCase() === 'rejected';
  const rejectionReason = documentRequest?.rejectionReason || resident?.rejectionReason;

  const fullName = [actualResident.firstName, actualResident.middleName, actualResident.lastName]
    .filter((name) => name && name !== 'N/A')
    .join(' ')
    .trim() || 'Unknown Resident';

  const status = actualResident.status || documentRequest?.status || 'Active record';
  const statusLower = status?.toLowerCase();
  const isApproved = statusLower === 'approved';
  const isPending = statusLower === 'pending';

  const validIdUrl = actualResident.validIdPath
    ? `/${actualResident.validIdPath.replace(/\\/g, '/')}`
    : '';

  const addressSummary = [
    actualResident.addressLine1,
    actualResident.sitio,
    actualResident.barangay,
    actualResident.city,
    actualResident.province,
  ].filter(Boolean).join(', ') || 'Not provided';

  const formatDate = (date) => {
    if (!date) return 'Not provided';
    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime()) ? 'Not provided' : parsedDate.toLocaleDateString();
  };

  const getStatusIcon = () => {
    if (isRejected(status)) return AlertTriangle;
    if (isPending) return Clock;
    return BadgeCheck;
  };

  const StatusIcon = getStatusIcon();

  const InfoCard = ({ icon: Icon, label, value, className = '' }) => (
    <div className={`flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm ${className}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#243b8e]">
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-slate-900">{value || 'Not provided'}</p>
      </div>
    </div>
  );

  const SmallDetail = ({ label, value }) => (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-bold text-slate-900">{value || 'Not provided'}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative mx-auto flex h-full max-w-5xl items-center justify-center p-2 sm:p-4">
        <motion.div
          className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="border-b border-slate-200 bg-gradient-to-r from-[#eef3ff] to-white px-5 py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#122361] to-[#2f84c0] text-white shadow-sm">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 id="modal-title" className="text-xl font-bold text-[#00114e]">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className={`grid gap-2.5 ${actualResident.role ? 'lg:grid-cols-[1.35fr_0.5fr_0.5fr_0.7fr_0.38fr]' : 'lg:grid-cols-[1.45fr_0.55fr_0.85fr_0.45fr]'}`}>
              <div className="rounded-2xl border border-[#c2cbea] bg-gradient-to-r from-[#eef3ff] to-[#d8def2] p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2f84c0] text-white">
                    <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#122361]">Resident Information</p>
                    <p className="truncate text-base font-extrabold text-[#00114e]">{fullName}</p>
                  </div>
                </div>
              </div>

              {actualResident.role && (
                <div className="rounded-2xl border border-[#c2cbea] bg-[#eef3ff] p-2.5 text-[#00114e]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2f84c0] text-white">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">Role</p>
                      <p className="truncate text-sm font-extrabold">{actualResident.role}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className={`rounded-2xl border p-2.5 ${
                isRejected(status) ? 'border-red-200 bg-red-50 text-red-900' :
                isPending ? 'border-amber-200 bg-amber-50 text-amber-900' :
                isApproved ? 'border-emerald-200 bg-emerald-50 text-emerald-900' :
                'border-[#c2cbea] bg-[#eef3ff] text-[#00114e]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${
                    isRejected(status) ? 'bg-red-500' :
                    isPending ? 'bg-amber-500' :
                    isApproved ? 'bg-emerald-500' :
                    'bg-[#2f84c0]'
                  }`}>
                    <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">Status</p>
                    <p className="truncate text-sm font-extrabold">{status}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">Account Created</p>
                    <p className="text-sm font-extrabold text-emerald-900">{formatDate(actualResident.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#c2cbea] bg-[#eef3ff] p-2.5 text-right">
                <p className="text-xs font-semibold text-[#122361]">Resident ID</p>
                <p className="text-base font-extrabold text-[#00114e]">{actualResident.residentId ? `#${actualResident.residentId}` : 'N/A'}</p>
              </div>
            </div>

            {isRejected(documentRequest?.status || resident?.status) && rejectionReason && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-red-900">
                  <AlertTriangle className="h-5 w-5" />
                  Rejection Reason
                </h3>
                <p className="rounded-xl border border-red-100 bg-white p-3 text-sm text-red-800">
                  {rejectionReason}
                </p>
              </div>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <div className="min-w-0 space-y-3">
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-950">
                    <UserRound className="h-5 w-5 text-[#243b8e]" aria-hidden="true" />
                    Personal Information
                  </h3>
                  <div className="grid gap-2.5 md:grid-cols-2">
                    <InfoCard icon={Mail} label="Email" value={actualResident.residentEmail} />
                    <InfoCard icon={Phone} label="Phone Number" value={actualResident.phoneNumber} />
                    <InfoCard icon={Calendar} label="Birthdate" value={formatDate(actualResident.birthdate)} />
                    <InfoCard icon={Users} label="Gender" value={actualResident.gender} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-950">
                    <MapPin className="h-5 w-5 text-[#243b8e]" aria-hidden="true" />
                    Address Information
                  </h3>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Full Address</p>
                      <p className="mt-1 line-clamp-2 text-[13px] font-bold text-slate-900">{addressSummary}</p>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <SmallDetail label="Sitio" value={actualResident.sitio} />
                      <SmallDetail label="Barangay" value={actualResident.barangay} />
                      <SmallDetail label="City" value={actualResident.city} />
                      <SmallDetail label="Province" value={actualResident.province} />
                      <SmallDetail label="Region" value={actualResident.region} />
                      <SmallDetail label="Address Line 1" value={actualResident.addressLine1} />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="min-w-0 space-y-3">
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-950">
                    <FileText className="h-5 w-5 text-[#243b8e]" aria-hidden="true" />
                    Additional Information
                  </h3>
                  <div className="w-full rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                    <div className="mb-2.5 flex min-w-0 items-center gap-2.5 rounded-xl bg-[#eef3ff] p-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#243b8e] shadow-sm">
                        <IdCard className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#243b8e]">Valid ID Preview</p>
                        <p className="truncate text-[13px] font-bold text-[#00114e]">
                          {actualResident.validIdPath ? actualResident.validIdPath.split(/[\\/]/).pop() : 'No ID uploaded'}
                        </p>
                      </div>
                    </div>

                    {validIdUrl ? (
                      <button
                        type="button"
                        onClick={() => setExpandedImage(validIdUrl)}
                        className="group mb-2.5 flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                      >
                        <img
                          src={validIdUrl}
                          alt="Valid ID"
                          className="h-full w-full object-contain transition-opacity group-hover:opacity-90"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                            event.currentTarget.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="hidden h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                          Unable to load preview
                        </div>
                      </button>
                    ) : (
                      <div className="mb-2.5 flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
                        No valid ID preview
                      </div>
                    )}

                    <div className="space-y-2">
                      <SmallDetail label="Created At" value={formatDate(actualResident.createdAt)} />
                      <SmallDetail label="Status" value={status} />
                      {actualResident.plainPassword && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Password</p>
                            <button
                              onClick={() => setShowPassword(!showPassword)}
                              className="flex items-center gap-1 text-xs font-bold text-[#243b8e] hover:text-[#122361]"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              {showPassword ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          <p className="mt-1 truncate font-mono text-sm font-bold text-slate-900">
                            {showPassword ? actualResident.plainPassword : '••••••••'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </aside>
            </div>

            {documentRequest && (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-purple-200 bg-purple-50 p-3">
                  <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-950">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Document Request Information
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    <SmallDetail label="Document Type" value={documentRequest.documentName || 'N/A'} />
                    <SmallDetail label="Submitted At" value={formatDate(documentRequest.submittedAt)} />
                    <div className="md:col-span-2">
                      <SmallDetail label="Request Details" value={documentRequest.details || 'No details provided'} />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                  <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-950">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    Requirements Attachments ({documentRequest.attachments?.length || 0})
                  </h3>
                  {documentRequest.attachments?.length > 0 ? (
                    <div className="max-h-36 space-y-2 overflow-y-auto">
                      {documentRequest.attachments.map((attachment, index) => (
                        <button
                          key={attachment.id || index}
                          onClick={() => setExpandedAttachment(attachment)}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2 text-left"
                        >
                          <span className="truncate text-sm font-bold text-slate-900">{attachment.fileName || 'Unnamed file'}</span>
                          <span className="text-xs font-bold text-emerald-600">View</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-slate-100 bg-white p-3 text-center text-sm text-slate-500">No attachments submitted</p>
                  )}
                </section>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
            {showActions && (
              <>
                <button
                  onClick={onReject}
                  className="rounded-xl bg-red-600 px-6 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-red-700"
                >
                  Reject
                </button>
                <button
                  onClick={onApprove}
                  className="rounded-xl bg-green-600 px-6 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-green-700"
                >
                  Approve
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>

      {expandedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 backdrop-blur-md">
          <div className="relative max-h-full max-w-4xl">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-12 right-0 z-60 flex h-8 w-8 items-center justify-center rounded-full bg-white text-2xl font-bold text-slate-700 shadow-sm hover:text-slate-900"
            >
              ×
            </button>
            <img
              src={expandedImage}
              alt="Expanded ID"
              className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
              onClick={() => setExpandedImage(null)}
              style={{ cursor: 'zoom-out' }}
            />
            <p className="mt-4 rounded-full bg-white px-3 py-1 text-center text-sm text-slate-700 opacity-75 shadow-sm">
              Click image or × to close
            </p>
          </div>
        </div>
      )}

      {expandedAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 backdrop-blur-md">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900">{expandedAttachment.fileName || 'Attachment'}</h3>
              <button
                onClick={() => setExpandedAttachment(null)}
                className="text-2xl font-bold text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto p-4">
              {expandedAttachment.fileType?.startsWith('image/') ? (
                <img
                  src={`/uploads/${expandedAttachment.filePath?.replace(/\\/g, '/')}`}
                  alt={expandedAttachment.fileName || 'Attachment'}
                  className="h-auto w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    event.currentTarget.nextSibling.style.display = 'block';
                  }}
                />
              ) : (
                <div className="py-8 text-center">
                  <div className="mb-4 text-6xl">📄</div>
                  <p className="mb-4 text-slate-600">This file type cannot be previewed directly.</p>
                  <a
                    href={`/uploads/${expandedAttachment.filePath?.replace(/\\/g, '/')}`}
                    download={expandedAttachment.fileName}
                    className="inline-flex items-center rounded-lg bg-[#243b8e] px-4 py-2 text-white transition-colors hover:bg-[#122361]"
                  >
                    Download File
                  </a>
                </div>
              )}
              <div className="hidden py-8 text-center">
                <div className="mb-4 text-6xl">❌</div>
                <p className="text-slate-600">Unable to load the file.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
