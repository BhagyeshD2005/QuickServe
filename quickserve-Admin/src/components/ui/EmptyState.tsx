import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { EmptyIllustration } from './AnimatedSvg/EmptyIllustration';

interface EmptyStateProps {
  id?: string;
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  showSvgIllustration?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  id,
  icon: Icon,
  title,
  description,
  action,
  showSvgIllustration = true,
}) => {
  return (
    <div
      id={id || 'empty-state'}
      className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-neutral-300"
    >
      {showSvgIllustration ? (
        <div className="mb-2">
          <EmptyIllustration size={130} />
        </div>
      ) : Icon ? (
        <div className="p-3 bg-neutral-100 rounded-full text-neutral-500 mb-4">
          <Icon className="w-8 h-8" />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-neutral-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
