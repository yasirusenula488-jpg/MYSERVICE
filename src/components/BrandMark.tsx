import React from 'react';

export const BrandMark: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="w-7 h-7 sm:w-[30px] sm:h-[30px] shrink-0"
      >
        <rect width="32" height="32" rx="8" fill="#2563EB" />
        <path
          d="M8.5 22V11.2L16 17.4L23.5 11.2V22"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="9.5" r="2" fill="#EAF2FF" />
      </svg>
      {!compact && (
        <span className="font-display text-[15px] sm:text-lg font-extrabold tracking-tight text-[#142B4A]">
          MY<span className="text-[#2563EB]">SERVICE</span>
        </span>
      )}
    </span>
  );
};
