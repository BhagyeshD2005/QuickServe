import React from 'react';

interface AvatarProps {
  id?: string;
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string | null;
}

export const Avatar: React.FC<AvatarProps> = ({
  id,
  name = '',
  email = '',
  size = 'md',
  src,
}) => {
  const getInitials = () => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'QS';
  };

  const colors = [
    'bg-indigo-600 text-white',
    'bg-violet-600 text-white',
    'bg-purple-600 text-white',
    'bg-sky-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white',
  ];

  const getColorIndex = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % colors.length);
  };

  const sizeClasses = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
  }[size];

  const colorClass = colors[getColorIndex(name || email || 'QS')];

  if (src) {
    return (
      <img
        id={id}
        src={src}
        alt={name || 'Avatar'}
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover shrink-0 ${sizeClasses}`}
      />
    );
  }

  return (
    <div
      id={id}
      className={`rounded-full flex items-center justify-center font-semibold tracking-wider shrink-0 select-none ${sizeClasses} ${colorClass}`}
    >
      {getInitials()}
    </div>
  );
};

export default Avatar;
