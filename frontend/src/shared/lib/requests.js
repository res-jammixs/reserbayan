export function getAttachmentCount(request) {
  if (typeof request?.attachmentCount === 'number') return request.attachmentCount;
  return request?.attachments?.length || 0;
}

export function getRequestStatusAccent(status) {
  const statusLower = status?.toLowerCase() || '';
  const normalizedStatus = statusLower.replace(/[\s_-]+/g, '-');

  const accents = {
    pending: {
      compact: 'from-amber-400 to-orange-400',
      bar: 'from-amber-400 via-orange-400 to-yellow-400',
      glow: 'from-amber-50 to-orange-50',
      icon: 'from-amber-500 to-orange-500',
    },
    approved: {
      compact: 'from-emerald-500 to-green-500',
      bar: 'from-emerald-500 via-green-500 to-teal-400',
      glow: 'from-emerald-50 to-green-50',
      icon: 'from-emerald-600 to-green-500',
    },
    'awaiting-hard-copy-submission': {
      compact: 'from-amber-500 to-[#2f84c0]',
      bar: 'from-amber-400 via-[#2f84c0] to-[#243b8e]',
      glow: 'from-amber-50 to-[#eef3ff]',
      icon: 'from-amber-500 to-[#2f84c0]',
    },
    'hard-copy-submitted': {
      compact: 'from-[#2f84c0] to-emerald-500',
      bar: 'from-[#243b8e] via-[#2f84c0] to-emerald-400',
      glow: 'from-[#eef3ff] to-emerald-50',
      icon: 'from-[#2f84c0] to-emerald-500',
    },
    'ready-for-pickup': {
      compact: 'from-[#2f84c0] to-emerald-500',
      bar: 'from-[#243b8e] via-[#2f84c0] to-emerald-400',
      glow: 'from-[#eef3ff] to-emerald-50',
      icon: 'from-[#2f84c0] to-emerald-500',
    },
    completed: {
      compact: 'from-[#243b8e] to-[#2f84c0]',
      bar: 'from-[#243b8e] via-[#2f84c0] to-[#2f84c0]',
      glow: 'from-[#eef3ff] to-[#eef3ff]',
      icon: 'from-[#243b8e] to-[#2f84c0]',
    },
    cancelled: {
      compact: 'from-slate-500 to-gray-500',
      bar: 'from-slate-500 via-gray-500 to-slate-400',
      glow: 'from-slate-50 to-gray-50',
      icon: 'from-slate-600 to-gray-500',
    },
  };

  if (normalizedStatus === 'rejected' || normalizedStatus === 'declined') {
    return {
      compact: 'from-red-500 to-rose-500',
      bar: 'from-red-500 via-rose-500 to-red-400',
      glow: 'from-red-50 to-rose-50',
      icon: 'from-red-600 to-rose-500',
    };
  }

  return accents[normalizedStatus] || {
    compact: 'from-[#243b8e] to-[#2f84c0]',
    bar: 'from-[#243b8e] via-[#2f84c0] to-[#2f84c0]',
    glow: 'from-[#eef3ff] to-[#eef3ff]',
    icon: 'from-[#122361] to-[#2f84c0]',
  };
}
