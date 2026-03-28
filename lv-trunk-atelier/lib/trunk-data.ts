export const STICKERS = ['🌸', '⚜️', '✦', '♛', '🌍', '⬡', '✿', '◈', '❋', '⌘'];

export interface CanvasOption {
  id: string;
  hex: string;
  label: string;
}

export const CANVAS_OPTIONS: Record<string, CanvasOption[]> = {
  monogram: [
    { id: 'traditional', hex: '#7B4F2C', label: 'Traditional' },
    { id: 'reverse', hex: '#E8D5B0', label: 'Reverse' },
    { id: 'pastel', hex: '#C4A0A0', label: 'Pastel Rose' },
  ],
  damier: [
    { id: 'ebene', hex: '#5C3A1E', label: 'Ebene' },
    { id: 'azur', hex: '#7A9BB0', label: 'Azur' },
    { id: 'graphite', hex: '#4A4A4A', label: 'Graphite' },
  ],
  archival: [
    { id: 'original', hex: '#2C3020', label: 'Original' },
    { id: 'camel', hex: '#9A7248', label: 'Restored' },
    { id: 'noir', hex: '#1A1A1A', label: 'Noir' },
  ],
};

export const TRUNK_DEFAULTS: Record<string, string> = {
  monogram: 'traditional',
  damier: 'ebene',
  archival: 'original',
};

export const TRUNK_NAMES: Record<string, string> = {
  monogram: 'Classic Monogram',
  damier: 'Damier Canvas',
  archival: 'Rare Archival',
};

export const HW_COLORS: Record<string, number> = {
  brass: 0xc9a84c,
  silver: 0xaaaab0,
  gold: 0xf5c400,
  rosegold: 0xc0737a,
};

export const HANDLE_COLORS: Record<string, number | null> = {
  natural: 0xc8a878,
  dark: 0x3d2411,
  chain: null,
};

export interface TrunkState {
  trunk: string;
  canvasColor: string;
  hardware: string;
  handle: string;
  initials: string;
  stickers: string[];
}

export const DEFAULT_STATE: TrunkState = {
  trunk: 'monogram',
  canvasColor: 'traditional',
  hardware: 'brass',
  handle: 'natural',
  initials: '',
  stickers: [],
};
