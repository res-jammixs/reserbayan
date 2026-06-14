'use client';

import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { formatStatusLabel } from '@/shared/lib/date';

export function StatusBadge({ status, className = '', size = 'md' }) {
  const getStatusConfig = (status) => {
    const statusLower = status ? status.toLowerCase() : '';
    const normalizedStatus = statusLower.replace(/[\s_-]+/g, '-');
    
    const configs = {
      approved: {
        icon: CheckCircle,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      },
      'ready-for-pickup': {
        icon: CheckCircle,
        iconColor: 'text-[#2f84c0]',
        bgColor: 'bg-[#eef3ff]',
        textColor: 'text-[#122361]',
        borderColor: 'border-[#c2cbea]'
      },
      'awaiting-hard-copy-submission': {
        icon: Clock,
        iconColor: 'text-amber-600',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200'
      },
      'hard-copy-submitted': {
        icon: CheckCircle,
        iconColor: 'text-[#2f84c0]',
        bgColor: 'bg-[#eef3ff]',
        textColor: 'text-[#122361]',
        borderColor: 'border-[#c2cbea]'
      },
      completed: {
        icon: CheckCircle,
        iconColor: 'text-[#243b8e]',
        bgColor: 'bg-[#eef3ff]',
        textColor: 'text-[#122361]',
        borderColor: 'border-[#c2cbea]'
      },
      pending: {
        icon: Clock,
        iconColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200'
      },
      rejected: {
        icon: XCircle,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
      },
      cancelled: {
        icon: XCircle,
        iconColor: 'text-gray-600',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200'
      }
    };

    return configs[normalizedStatus] || {
      icon: AlertCircle,
      iconColor: 'text-gray-600',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200'
    };
  };

  const getSizeConfig = (size) => {
    const sizes = {
      sm: {
        container: 'px-2 py-1 gap-1.5',
        icon: 'w-3 h-3',
        text: 'text-xs'
      },
      md: {
        container: 'px-3 py-1.5 gap-2',
        icon: 'w-4 h-4',
        text: 'text-sm'
      },
      lg: {
        container: 'px-4 py-2 gap-2.5',
        icon: 'w-5 h-5',
        text: 'text-base'
      }
    };
    return sizes[size] || sizes.md;
  };

  const statusConfig = getStatusConfig(status);
  const sizeConfig = getSizeConfig(size);
  const StatusIcon = statusConfig.icon;
  const formattedStatus = formatStatusLabel(status);

  return (
    <div className={`
      inline-flex items-center rounded-full font-medium border min-w-[6rem] justify-center px-4
      ${statusConfig.bgColor}
      ${statusConfig.textColor}
      ${statusConfig.borderColor}
      ${sizeConfig.container}
      ${className}
    `}>
      <StatusIcon className={`${statusConfig.iconColor} ${sizeConfig.icon} flex-shrink-0`} />
      <span className={`font-medium ${sizeConfig.text} whitespace-nowrap`}>
        {formattedStatus}
      </span>
    </div>
  );
}

export default StatusBadge;
