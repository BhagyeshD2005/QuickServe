import React from 'react';
import { motion } from 'motion/react';

interface EmptyIllustrationProps {
  className?: string;
  size?: number;
}

export const EmptyIllustration: React.FC<EmptyIllustrationProps> = ({
  className = '',
  size = 140,
}) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          {/* Subtle gradient for base platform */}
          <linearGradient id="empty-base-grad" x1="20" y1="130" x2="140" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.2" />
          </linearGradient>

          {/* Scanner gradient */}
          <linearGradient id="scan-beam-grad" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>

          {/* Card shadow */}
          <filter id="soft-shadow" x="35" y="25" width="90" height="110" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Outer orbital decorative ring */}
        <motion.ellipse
          cx="80"
          cy="125"
          rx="58"
          ry="18"
          stroke="#e2e8f0"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '80px 125px' }}
        />

        {/* Base shadow ellipse */}
        <ellipse cx="80" cy="125" rx="44" ry="12" fill="url(#empty-base-grad)" />

        {/* Floating background card */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect
            x="48"
            y="32"
            width="64"
            height="82"
            rx="8"
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth="1.5"
            transform="rotate(-5 80 73)"
          />
        </motion.g>

        {/* Main foreground clipboard card */}
        <motion.g
          filter="url(#soft-shadow)"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect
            x="45"
            y="30"
            width="70"
            height="88"
            rx="10"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* Header notch / clip */}
          <rect x="65" y="25" width="30" height="10" rx="5" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
          <circle cx="80" cy="30" r="2.5" fill="#6366f1" />

          {/* Skeleton lines representing data */}
          <rect x="58" y="48" width="44" height="5" rx="2.5" fill="#e2e8f0" />
          <rect x="58" y="60" width="36" height="4" rx="2" fill="#f1f5f9" />
          <rect x="58" y="70" width="40" height="4" rx="2" fill="#f1f5f9" />
          <rect x="58" y="80" width="28" height="4" rx="2" fill="#f1f5f9" />

          {/* Checklist bullets */}
          <circle cx="53" cy="62" r="2" fill="#94a3b8" />
          <circle cx="53" cy="72" r="2" fill="#94a3b8" />
          <circle cx="53" cy="82" r="2" fill="#94a3b8" />

          {/* Scanning beam moving up and down */}
          <motion.line
            x1="46"
            y1="45"
            x2="114"
            y2="45"
            stroke="url(#scan-beam-grad)"
            strokeWidth="3"
            animate={{ y1: [45, 105, 45], y2: [45, 105, 45] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.g>

        {/* Floating spark 1 */}
        <motion.g
          animate={{
            y: [-2, 4, -2],
            opacity: [0.4, 1, 0.4],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '32px 50px' }}
        >
          <path
            d="M32 44L34 49L39 51L34 53L32 58L30 53L25 51L30 49Z"
            fill="#818cf8"
          />
        </motion.g>

        {/* Floating spark 2 */}
        <motion.g
          animate={{
            y: [3, -3, 3],
            opacity: [0.3, 0.9, 0.3],
            scale: [0.9, 1.15, 0.9],
          }}
          transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          style={{ transformOrigin: '128px 46px' }}
        >
          <path
            d="M128 42L129.5 45.5L133 47L129.5 48.5L128 52L126.5 48.5L123 47L126.5 45.5Z"
            fill="#6366f1"
          />
        </motion.g>

        {/* Little floating orbital dot */}
        <motion.circle
          cx="124"
          cy="92"
          r="3"
          fill="#38bdf8"
          animate={{
            y: [0, -5, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        />
      </svg>
    </div>
  );
};

export default EmptyIllustration;
