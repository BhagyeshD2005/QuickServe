import React from 'react';
import { motion } from 'motion/react';

interface DispatchRadarProps {
  className?: string;
  theme?: 'dark' | 'light';
  size?: number;
}

export const DispatchRadar: React.FC<DispatchRadarProps> = ({
  className = '',
  theme = 'dark',
  size = 280,
}) => {
  const isDark = theme === 'dark';

  const ringStroke = isDark ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.15)';
  const gridStroke = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const coreFill = isDark ? '#4f46e5' : '#6366f1';

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          {/* Radar sweep gradient */}
          <linearGradient id="radar-sweep-grad" x1="150" y1="150" x2="280" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
            <stop offset="80%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.45" />
          </linearGradient>

          {/* Core glow */}
          <radialGradient id="core-glow" cx="150" cy="150" r="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Concentric rings */}
        <circle cx="150" cy="150" r="130" stroke={ringStroke} strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="150" cy="150" r="95" stroke={ringStroke} strokeWidth="1" />
        <circle cx="150" cy="150" r="60" stroke={ringStroke} strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="150" cy="150" r="25" stroke={ringStroke} strokeWidth="1" />

        {/* Crosshair grid lines */}
        <line x1="20" y1="150" x2="280" y2="150" stroke={gridStroke} strokeWidth="1" />
        <line x1="150" y1="20" x2="150" y2="280" stroke={gridStroke} strokeWidth="1" />
        <line x1="58" y1="58" x2="242" y2="242" stroke={gridStroke} strokeWidth="0.75" strokeDasharray="2 4" />
        <line x1="242" y1="58" x2="58" y2="242" stroke={gridStroke} strokeWidth="0.75" strokeDasharray="2 4" />

        {/* Rotating Radar Sweep Cone */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '150px 150px' }}
        >
          <path
            d="M 150 150 L 280 150 A 130 130 0 0 0 242 58 Z"
            fill="url(#radar-sweep-grad)"
          />
          <line x1="150" y1="150" x2="280" y2="150" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.7" />
        </motion.g>

        {/* Dynamic Connected Flow Arc */}
        <motion.path
          d="M 95 100 Q 150 40 215 90"
          stroke="#38bdf8"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 6"
          animate={{ strokeDashoffset: [0, -30] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />

        <motion.path
          d="M 80 185 Q 150 250 220 205"
          stroke="#818cf8"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 6"
          animate={{ strokeDashoffset: [-30, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        />

        {/* Central Core Pulse */}
        <motion.circle
          cx="150"
          cy="150"
          r="30"
          fill="url(#core-glow)"
          animate={{ scale: [0.85, 1.2, 0.85], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '150px 150px' }}
        />
        <circle cx="150" cy="150" r="6" fill={coreFill} />
        <circle cx="150" cy="150" r="2.5" fill="#ffffff" />

        {/* Blip 1: Assigned Agent (Top Right) */}
        <g>
          <motion.circle
            cx="215"
            cy="90"
            r="8"
            stroke="#10b981"
            strokeWidth="1.5"
            fill="none"
            animate={{ scale: [0.6, 1.8], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
            style={{ transformOrigin: '215px 90px' }}
          />
          <circle cx="215" cy="90" r="4" fill="#10b981" />
          <text x="224" y="93" fill={isDark ? '#6ee7b7' : '#059669'} fontSize="9" fontWeight="600">
            Agent Dispatched
          </text>
        </g>

        {/* Blip 2: In-Progress Request (Left) */}
        <g>
          <motion.circle
            cx="95"
            cy="100"
            r="8"
            stroke="#38bdf8"
            strokeWidth="1.5"
            fill="none"
            animate={{ scale: [0.6, 1.8], opacity: [1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 1 }}
            style={{ transformOrigin: '95px 100px' }}
          />
          <circle cx="95" cy="100" r="4" fill="#38bdf8" />
          <text x="50" y="93" fill={isDark ? '#7dd3fc' : '#0284c7'} fontSize="9" fontWeight="600">
            Active Job
          </text>
        </g>

        {/* Blip 3: Completed Point (Bottom Right) */}
        <g>
          <motion.circle
            cx="220"
            cy="205"
            r="8"
            stroke="#818cf8"
            strokeWidth="1.5"
            fill="none"
            animate={{ scale: [0.6, 1.8], opacity: [1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 1.6 }}
            style={{ transformOrigin: '220px 205px' }}
          />
          <circle cx="220" cy="205" r="4" fill="#818cf8" />
          <text x="210" y="222" fill={isDark ? '#a5b4fc' : '#4f46e5'} fontSize="9" fontWeight="600">
            Verified
          </text>
        </g>

        {/* Orbiting Telemetry Marker */}
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '150px 150px' }}
        >
          <circle cx="150" cy="55" r="3" fill="#f59e0b" />
          <circle cx="150" cy="55" r="6" stroke="#fbbf24" strokeWidth="0.75" strokeDasharray="2 2" />
        </motion.g>
      </svg>
    </div>
  );
};

export default DispatchRadar;
