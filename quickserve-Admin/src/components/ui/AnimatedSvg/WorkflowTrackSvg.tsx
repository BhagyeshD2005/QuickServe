import React from 'react';
import { motion } from 'motion/react';
import { RequestStatus } from '../../../types';

interface WorkflowTrackSvgProps {
  status: RequestStatus;
  className?: string;
}

export const WorkflowTrackSvg: React.FC<WorkflowTrackSvgProps> = ({
  status,
  className = '',
}) => {
  const steps: { key: RequestStatus; label: string; x: number }[] = [
    { key: 'CREATED', label: 'Created', x: 20 },
    { key: 'ASSIGNED', label: 'Assigned', x: 95 },
    { key: 'ACCEPTED', label: 'Accepted', x: 170 },
    { key: 'IN_PROGRESS', label: 'In Progress', x: 245 },
    { key: 'COMPLETED', label: 'Completed', x: 320 },
  ];

  const getProgress = (s: RequestStatus): number => {
    switch (s) {
      case 'CREATED':
        return 20;
      case 'ASSIGNED':
        return 95;
      case 'ACCEPTED':
        return 170;
      case 'IN_PROGRESS':
        return 245;
      case 'COMPLETED':
        return 320;
      case 'CANCELLED':
        return 20;
      default:
        return 20;
    }
  };

  const currentX = getProgress(status);
  const isCancelled = status === 'CANCELLED';

  return (
    <div className={`w-full overflow-x-auto py-2 select-none ${className}`}>
      <svg
        viewBox="0 0 340 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full min-w-[340px]"
      >
        <defs>
          <linearGradient id="active-track-grad" x1="20" y1="20" x2="320" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Background track line */}
        <line x1="20" y1="20" x2="320" y2="20" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />

        {/* Filled progress line */}
        <motion.line
          x1="20"
          y1="20"
          x2={currentX}
          y2="20"
          stroke={isCancelled ? '#f43f5e' : 'url(#active-track-grad)'}
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={{ x2: 20 }}
          animate={{ x2: currentX }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Animated flow dash moving along active line */}
        {!isCancelled && currentX > 20 && (
          <motion.line
            x1="20"
            y1="20"
            x2={currentX}
            y2="20"
            stroke="#ffffff"
            strokeWidth="2"
            strokeDasharray="6 12"
            animate={{ strokeDashoffset: [0, -36] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Stage Nodes */}
        {steps.map((step) => {
          const isPassed = !isCancelled && currentX > step.x;
          const isCurrent = !isCancelled && currentX === step.x;

          return (
            <g key={step.key}>
              {/* Outer pulsing ring on current active step */}
              {isCurrent && (
                <motion.circle
                  cx={step.x}
                  cy="20"
                  r="12"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  fill="none"
                  animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.8, 0.2, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformOrigin: `${step.x}px 20px` }}
                />
              )}

              {/* Node Circle */}
              <circle
                cx={step.x}
                cy="20"
                r={isCurrent ? 6 : 4.5}
                fill={
                  isPassed
                    ? '#10b981'
                    : isCurrent
                    ? '#6366f1'
                    : '#cbd5e1'
                }
                stroke="#ffffff"
                strokeWidth="2"
              />

              {/* Text label */}
              <text
                x={step.x}
                y="40"
                textAnchor="middle"
                fontSize="9"
                fontWeight={isCurrent ? '700' : '500'}
                fill={
                  isCurrent
                    ? '#4f46e5'
                    : isPassed
                    ? '#059669'
                    : '#94a3b8'
                }
              >
                {step.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default WorkflowTrackSvg;
