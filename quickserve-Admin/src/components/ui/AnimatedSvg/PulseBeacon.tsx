import React from 'react';
import { motion } from 'motion/react';

interface PulseBeaconProps {
  color?: 'emerald' | 'indigo' | 'amber' | 'rose';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PulseBeacon: React.FC<PulseBeaconProps> = ({
  color = 'emerald',
  size = 'md',
  className = '',
}) => {
  const colorMap = {
    emerald: {
      core: '#10b981',
      ring: '#34d399',
      glow: 'rgba(16, 185, 129, 0.25)',
    },
    indigo: {
      core: '#6366f1',
      ring: '#818cf8',
      glow: 'rgba(99, 102, 241, 0.25)',
    },
    amber: {
      core: '#f59e0b',
      ring: '#fbbf24',
      glow: 'rgba(245, 158, 11, 0.25)',
    },
    rose: {
      core: '#f43f5e',
      ring: '#fb7185',
      glow: 'rgba(244, 63, 94, 0.25)',
    },
  }[color];

  const dimension = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
    >
      {/* Outer expanding ripple */}
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke={colorMap.ring}
        strokeWidth="1.5"
        fill={colorMap.glow}
        initial={{ scale: 0.4, opacity: 0.8 }}
        animate={{ scale: [0.4, 1.15, 0.4], opacity: [0.8, 0, 0.8] }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Mid pulse ring */}
      <motion.circle
        cx="12"
        cy="12"
        r="6"
        stroke={colorMap.ring}
        strokeWidth="1.5"
        initial={{ opacity: 0.6 }}
        animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.05, 0.9] }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Solid center dot */}
      <circle cx="12" cy="12" r="3.5" fill={colorMap.core} />
    </svg>
  );
};

export default PulseBeacon;
