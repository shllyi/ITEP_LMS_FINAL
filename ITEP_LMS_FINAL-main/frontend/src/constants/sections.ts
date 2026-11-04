export const SECTIONS = [
  'BSIT 1A',
  'BSIT 1B',
  'BSIT 2A',
  'BSIT 2B',
  'BSIT S3A',
  'BSIT NS3A',
  'BSIT S4A',
  'BSIT NS4A',
] as const;

export type SectionType = typeof SECTIONS[number];
