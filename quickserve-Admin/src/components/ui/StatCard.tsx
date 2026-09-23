import React from 'react';
import { LucideIcon } from 'lucide-react';
import { SparklineSvg } from './AnimatedSvg/SparklineSvg';

interface StatCardProps {
  id?: string;
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconTextColor?: string;
  badge?: {
    text: string;
    type?: 'neutral' | 'success' | 'warning' | 'info';
  };
  showSparkline?: boolean;
  sparklineColor?: 'indigo' | 'emerald' | 'amber' | 'blue' | 'neutral';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-indigo-50',
  iconTextColor = 'text-indigo-600',
  badge,
  showSparkline = true,
  sparklineColor,
  onClick,
}) => {
  // Derive sparkline color
  const resolvedColor =
    sparklineColor ||
    (badge?.type === 'success'
      ? 'emerald'
      : badge?.type === 'warning'
      ? 'amber'
      : badge?.type === 'info'
      ? 'blue'
      : iconTextColor.includes('emerald')
      ? 'emerald'
      : iconTextColor.includes('amber')
      ? 'amber'
      : iconTextColor.includes('blue')
      ? 'blue'
      : 'indigo');

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative overflow-hidden bg-white rounded-xl border border-neutral-200/80 p-5 shadow-xs transition-all duration-200 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md' : ''
      }`}
    >
      <div>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-neutral-900">{value}</span>
              {badge && (
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    badge.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : badge.type === 'warning'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : badge.type === 'info'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                  }`}
                >
                  {badge.text}
                </span>
              )}
            </div>
          </div>
          <div className={`p-2.5 rounded-xl ${iconBgColor} ${iconTextColor} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {subtitle && <p className="mt-2 text-xs text-neutral-500 leading-normal">{subtitle}</p>}
      </div>

      {showSparkline && (
        <div className="mt-3 -mx-5 -mb-5 pt-1 border-t border-neutral-100/60 opacity-80">
          <SparklineSvg color={resolvedColor} height={24} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
