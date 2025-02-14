import React from 'react';

interface CircularProgressProps {
  value: number;
  size?: number;
  thickness?: number;
  className?: string;
  trackClassName?: string;
}

export function CircularProgress({
  value,
  size = 100,
  thickness = 4,
  className = 'text-current',
  trackClassName = 'text-gray-200'
}: CircularProgressProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className={className}>
      <circle
        className={trackClassName}
        strokeWidth={thickness}
        fill="transparent"
        r={radius}
        cx={size/2}
        cy={size/2}
      />
      <circle
        stroke="currentColor"
        strokeWidth={thickness}
        fill="transparent"
        r={radius}
        cx={size/2}
        cy={size/2}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={progress}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  );
} 