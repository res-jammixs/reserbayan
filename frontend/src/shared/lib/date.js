export function formatShortDate(dateValue, fallback = 'Not updated yet') {
  if (!dateValue) return fallback;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDateTime(dateValue, fallback = 'Recently') {
  if (!dateValue) return fallback;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatStatusLabel(status) {
  if (!status) return '';
  const normalizedStatus = status.toLowerCase().replace(/[\s_-]+/g, '-');
  if (normalizedStatus === 'ready-for-pickup') {
    return 'Ready for Pickup';
  }
  if (normalizedStatus === 'awaiting-hard-copy-submission') {
    return 'Awaiting Hard Copy Submission';
  }
  if (normalizedStatus === 'hard-copy-submitted') {
    return 'Hard Copy Submitted';
  }
  return status.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
