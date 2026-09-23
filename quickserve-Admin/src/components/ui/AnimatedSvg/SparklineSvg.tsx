import React from 'react';
import { motion } from 'motion/react';

interface SparklineSvgProps {
  color?: 'indigo' | 'emerald' | 'amber' | 'blue' | 'neutral';
  height?: number;
  className?: string;
}

export const SparklineSvg: React.FC<SparklineSvgProps> = ({
  color = 'indigo',
  height = 36,
  className = '',
}) => {
  const colorMap = {
    indigo: {
      line: '#818cf8',
      fillStart: 'rgba(99, 102, 241, 0.12)',
      fillEnd: 'rgba(99, 102, 241, 0)',
    },
    emerald: {
      line: '#34d399',
      fillStart: 'rgba(16, 185, 129, 0.14)',
      fillEnd: 'rgba(16, 185, 129, 0)',
    },
    amber: {
      line: '#fbbf24',
      fillStart: 'rgba(245, 158, 11, 0.14)',
      fillEnd: 'rgba(245, 158, 11, 0)',
    },
    blue: {
      line: '#60a5fa',
      fillStart: 'rgba(59, 130, 246, 0.14)',
      fillEnd: 'rgba(59, 130, 246, 0)',
    },
    neutral: {
      line: '#cbd5e1',
      fillStart: 'rgba(203, 213, 225, 0.15)',
      fillEnd: 'rgba(203, 213, 225, 0)',
    },
  }[color];

  const id = React.useId();

  return (
    <div className={`w-full overflow-hidden pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 160 40"
        height={height}
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={colorMap.fillStart} />
            <stop offset="100%" stopColor={colorMap.fillEnd} />
          </linearGradient>
        </defs>

        {/* Gradient fill underneath */}
        <motion.path
          d="M 0 35 Q 30 15, 60 25 T 120 18 T 160 12 L 160 40 L 0 40 Z"
          fill={`url(#grad-${id})`}
          animate={{
            d: [
              'M 0 35 Q 30 15, 60 25 T 120 18 T 160 12 L 160 40 L 0 40 Z',
              'M 0 32 Q 35 22, 70 14 T 130 22 T 160 10 L 160 40 L 0 40 Z',
              'M 0 35 Q 30 15, 60 25 T 120 18 T 160 12 L 160 40 L 0 40 Z',
            ],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Animated Stroke Line */}
        <motion.path
          d="M 0 35 Q 30 15, 60 25 T 120 18 T 160 12"
          stroke={colorMap.line}
          strokeWidth="1.75"
          strokeLinecap="round"
          fill="none"
          animate={{
            d: [
              'M 0 35 Q 30 15, 60 25 T 120 18 T 160 12',
              'M 0 32 Q 35 22, 70 14 T 130 22 T 160 10',
              'M 0 35 Q 30 15, 60 25 T 120 18 T 160 12',
            ],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Pulsing leading node dot */}
        <motion.circle
          cx="160"
          cy="12"
          r="2.5"
          fill={colorMap.line}
          animate={{
            cy: [12, 10, 12],
            scale: [1, 1.4, 1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
};

export default SparklineSvg;
