"use client";

import * as React from 'react';

interface RoundelProps {
  size?: number;
  ringColor: string;
  barColor?: string;
  ariaLabel?: string;
  className?: string;
}

// A simplified, clean SVG roundel: colored ring with a centered bar.
// The proportions are chosen to read well at small sizes.
export function Roundel({
  size = 40,
  ringColor,
  barColor = '#ffffff',
  ariaLabel,
  className,
}: RoundelProps) {
  const strokeWidth = 18; // ring thickness
  const barHeight = 22;
  const radius = 50 - strokeWidth / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      className={className}
    >
      {/* Ring */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={ringColor}
        strokeWidth={strokeWidth}
      />
      {/* Bar */}
      <rect
        x="10"
        y={(100 - barHeight) / 2}
        width="80"
        height={barHeight}
        rx="6"
        fill={barColor}
      />
    </svg>
  );
}

export type { RoundelProps };


