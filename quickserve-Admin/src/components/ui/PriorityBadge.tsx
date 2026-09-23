import React from 'react';
import { RequestPriority } from '../../types';
import { AlertCircle, Flame, ShieldAlert } from 'lucide-react';

interface PriorityBadgeProps {
  priority: RequestPriority | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
  showIcon = true,
}) => {
  const normalized = (priority || '').toUpperCase() as RequestPriority;

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let IconComponent = AlertCircle;

  switch (normalized) {
    case 'HIGH':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      IconComponent = Flame;
      break;
    case 'MEDIUM':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
      IconComponent = ShieldAlert;
      break;
    case 'LOW':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 font-normal';
      IconComponent = AlertCircle;
      break;
    default:
      colorClasses = 'bg-neutral-100 text-neutral-700 border-neutral-200';
      IconComponent = AlertCircle;
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      id={`priority-badge-${normalized.toLowerCase()}`}
      className={`inline-flex items-center rounded-md border whitespace-nowrap tracking-wide select-none ${colorClasses} ${sizeClasses}`}
    >
      {showIcon && <IconComponent className={`${iconSize} shrink-0`} />}
      <span>{normalized}</span>
    </span>
  );
};

export default PriorityBadge;
