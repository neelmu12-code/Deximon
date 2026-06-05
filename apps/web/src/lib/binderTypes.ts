export type { CardSlot } from "@/components/profile/BinderPreview";

export const COVER_COLORS = [
  { id: 'oxblood',  label: 'Oxblood',      a: '#3b0a0e', b: '#260608', c: '#150305' },
  { id: 'navy',     label: 'Navy',          a: '#0a1a3b', b: '#060f26', c: '#030815' },
  { id: 'forest',   label: 'Forest',        a: '#0a3b1f', b: '#062612', c: '#031508' },
  { id: 'charcoal', label: 'Charcoal',      a: '#1a1a1a', b: '#0a0a0a', c: '#050505' },
  { id: 'plum',     label: 'Plum',          a: '#2a0a3b', b: '#180626', c: '#0c0315' },
  { id: 'gold',     label: 'Midnight Gold', a: '#3b2a0a', b: '#261c06', c: '#150e03' },
  { id: 'crimson',  label: 'Crimson',       a: '#3b0a1a', b: '#26060f', c: '#150308' },
  { id: 'steel',    label: 'Steel',         a: '#1a1f2b', b: '#0e1219', c: '#070910' },
] as const;

export type CoverColorId = typeof COVER_COLORS[number]['id'];

export type BinderCoverConfig = {
  type: 'color' | 'image';
  colorId: CoverColorId;
  showName: boolean;
  imageUrl: string | null;
};

export const DEFAULT_COVER: BinderCoverConfig = {
  type: 'color',
  colorId: 'oxblood',
  showName: true,
  imageUrl: null,
};
