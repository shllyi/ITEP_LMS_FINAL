/**
 * Design tokens for the welcome screen.
 * Built from the supplied palette (snow, golden pollen, dark orange,
 * cool sky, lavender purple).
 */

export const palette = {
  page: '#f5eff2', // snow 50
  paper: '#ffffff',
  ink: '#20131a', // snow 900
  inkSoft: '#60394d', // snow 700
  inkMuted: '#9f6080', // snow 500
  line: '#d9bfcc', // snow 200
} as const;

export type ToneKey = 'lavender' | 'golden' | 'orange' | 'sky';

/** Each tone: soft background, strong fill, and a dark text color that sits well on the soft one. */
export const tones: Record<ToneKey, { soft: string; solid: string; ink: string }> = {
  lavender: { soft: '#e5d1fa', solid: '#7c19e6', ink: '#320a5c' },
  golden: { soft: '#fef1cd', solid: '#fcba03', ink: '#654a01' },
  orange: { soft: '#fee6cd', solid: '#fc8003', ink: '#653301' },
  sky: { soft: '#ccebff', solid: '#0199fe', ink: '#013d65' },
};

export const radius = { sm: 10, md: 20, lg: 28, xl: 36, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;