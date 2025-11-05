"use client";

import * as React from 'react';

interface LozengeProps {
  width?: number;
  height?: number;
  fill: string;
  borderColor?: string;
  ariaLabel?: string;
  className?: string;
}

// Stadium/lozenge shape for bus and similar services
export function Lozenge({
  width = 48,
  height = 26,
  fill,
  borderColor,
  ariaLabel,
  className,
}: LozengeProps) {
  const rx = Math.min(height / 2, 14);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      className={className}
    >
      <rect
        x="0.5"
        y="0.5"
        width={width - 1}
        height={height - 1}
        rx={rx}
        fill={fill}
        stroke={borderColor ?? `${fill}33`}
      />
    </svg>
  );
}

export type { LozengeProps };


