"use client";

import * as React from 'react';
import { Roundel } from './roundel';
import { Lozenge } from './lozenge';
import { getLineColor, getModeColor } from '@/lib/line-colors';

interface TflBadgeProps {
  mode?: string;
  lineIdOrName?: string;
  size?: number; // for roundel
  className?: string;
  ariaLabel?: string;
}

// Chooses an appropriate branded glyph for a TFL mode/line.
export function TflBadge({ mode, lineIdOrName, size = 40, className, ariaLabel }: TflBadgeProps) {
  const normalizedMode = (mode || '').toLowerCase();

  // Determine colors
  const lineColor = getLineColor(lineIdOrName, normalizedMode);
  const modeColor = getModeColor(normalizedMode);

  // For bus-like modes, use lozenge; otherwise, use roundel
  if (normalizedMode === 'bus') {
    return (
      <Lozenge
        width={Math.round(size * 1.1)}
        height={Math.round(size * 0.6)}
        fill={modeColor.background}
        borderColor={`${modeColor.background}66`}
        ariaLabel={ariaLabel}
        className={className}
      />
    );
  }

  // Overground typically orange ring; keep bar in TFL blue for recognizability
  if (normalizedMode === 'overground') {
    return (
      <Roundel
        size={size}
        ringColor={lineColor.background}
        barColor="#0019A8"
        ariaLabel={ariaLabel}
        className={className}
      />
    );
  }

  // Default: roundel with line color ring and white bar for clarity
  return (
    <Roundel
      size={size}
      ringColor={lineColor.background}
      barColor="#ffffff"
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}

export type { TflBadgeProps };


