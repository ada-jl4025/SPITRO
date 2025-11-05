type LineColor = {
  background: string;
  text: string;
};

const DEFAULT_MODE_COLORS: Record<string, LineColor> = {
  tube: { background: '#0019A8', text: '#ffffff' },
  bus: { background: '#DC241F', text: '#ffffff' },
  dlr: { background: '#00A4A7', text: '#ffffff' },
  overground: { background: '#EE7C0E', text: '#ffffff' },
  tram: { background: '#0BD55C', text: '#0A2D22' },
  'river-bus': { background: '#1C3F94', text: '#ffffff' },
  'cable-car': { background: '#A50034', text: '#ffffff' },
  walking: { background: '#6B7280', text: '#ffffff' },
  default: { background: '#4B5563', text: '#ffffff' },
};

const LINE_COLOR_MAP: Record<string, LineColor> = {
  central: { background: '#E32017', text: '#ffffff' },
  circle: { background: '#FFD300', text: '#000000' },
  district: { background: '#00782A', text: '#ffffff' },
  hammersmithcity: { background: '#F4A9BE', text: '#000000' },
  hammersmithandcity: { background: '#F4A9BE', text: '#000000' },
  metropolitan: { background: '#9B0056', text: '#ffffff' },
  northern: { background: '#000000', text: '#ffffff' },
  piccadilly: { background: '#003688', text: '#ffffff' },
  victoria: { background: '#0098D4', text: '#ffffff' },
  waterlooandcity: { background: '#95CDBA', text: '#000000' },
  bakerloo: { background: '#B36305', text: '#ffffff' },
  jubilee: { background: '#A0A5A9', text: '#000000' },
  elizabeth: { background: '#6950A1', text: '#ffffff' },
  dlr: { background: '#00A4A7', text: '#ffffff' },
  overground: { background: '#EE7C0E', text: '#ffffff' },
  tram: { background: '#0BD55C', text: '#0A2D22' },
  waterbus: { background: '#1C3F94', text: '#ffffff' },
  emiratesairline: { background: '#A50034', text: '#ffffff' },
  cablecar: { background: '#A50034', text: '#ffffff' },
  thamesclipper: { background: '#0019A8', text: '#ffffff' },
  districtandcircle: { background: '#00782A', text: '#ffffff' },
  londonoverground: { background: '#EE7C0E', text: '#ffffff' },
};

const LINE_ALIAS_MAP: Record<string, string> = {
  'hammersmith & city': 'hammersmithandcity',
  'hammersmith and city': 'hammersmithandcity',
  'waterloo & city': 'waterlooandcity',
  'waterloo and city': 'waterlooandcity',
  'london overground': 'overground',
  'emirates air line': 'emiratesairline',
  'emirates airline': 'emiratesairline',
  'river bus': 'waterbus',
  'dlr': 'dlr',
  'tfl rail': 'elizabeth',
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/line$/i, '')
    .replace(/\s+/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');

export const getLineColor = (lineIdOrName?: string, modeName?: string): LineColor => {
  if (!lineIdOrName) {
    return modeName ? DEFAULT_MODE_COLORS[modeName] || DEFAULT_MODE_COLORS.default : DEFAULT_MODE_COLORS.default;
  }

  const trimmed = lineIdOrName.trim();
  const aliasKey = LINE_ALIAS_MAP[trimmed.toLowerCase()];

  if (aliasKey && LINE_COLOR_MAP[aliasKey]) {
    return LINE_COLOR_MAP[aliasKey];
  }

  const normalized = normalize(trimmed);

  if (LINE_COLOR_MAP[normalized]) {
    return LINE_COLOR_MAP[normalized];
  }

  return modeName ? DEFAULT_MODE_COLORS[modeName] || DEFAULT_MODE_COLORS.default : DEFAULT_MODE_COLORS.default;
};

export const getModeColor = (modeName?: string): LineColor => {
  if (!modeName) {
    return DEFAULT_MODE_COLORS.default;
  }

  return DEFAULT_MODE_COLORS[modeName] || DEFAULT_MODE_COLORS.default;
};

export type { LineColor };

// Short display labels for long line names
const LINE_SHORT_LABELS: Record<string, string> = {
  hammersmithandcity: 'H&C',
  waterlooandcity: 'W&C',
  londonoverground: 'Overground',
  overground: 'Overground',
  emiratesairline: 'Emirates',
  cablecar: 'Cable Car',
};

// Returns a compact display label for a line. Falls back to provided name/id with truncation.
export const getLineShortLabel = (lineIdOrName?: string, fallbackName?: string): string => {
  const raw = (lineIdOrName || fallbackName || '').trim();
  if (!raw) return '';

  const normalized = normalize(raw);
  // Known short labels
  if (LINE_SHORT_LABELS[normalized]) {
    return LINE_SHORT_LABELS[normalized];
  }

  // Replace common words to shorten
  let label = raw.replace(/\b(Underground|Line)\b/gi, '').replace(/\s+/g, ' ').trim();

  // Compress X & Y to X&Y initials if still long
  if (label.length > 16 && /&/.test(label)) {
    const parts = label.split('&').map(p => p.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      label = `${parts[0][0].toUpperCase()}&${parts[1][0].toUpperCase()}`;
    }
  }

  // Final truncation with ellipsis
  if (label.length > 18) {
    label = label.slice(0, 16).trimEnd() + '…';
  }

  return label;
};

