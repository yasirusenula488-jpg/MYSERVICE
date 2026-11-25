import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EAF2FF] to-[#F5F8FD] text-[#142B4A]/70 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Briefcase className="w-7 h-7 text-[#2563EB] mb-1.5" />
        {fallbackLabel && <span className="text-xs font-medium line-clamp-1">{fallbackLabel}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
