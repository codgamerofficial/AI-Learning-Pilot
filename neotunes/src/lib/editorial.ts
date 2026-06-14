export type EditorialHint = 'global' | 'india' | 'fusion' | 'neutral';
export type EditorialTag = 'India' | 'Global' | 'Diaspora';

interface TrackLike {
  title: string;
  artist: string;
}

const INDIA_PATTERN = /\b(india|indian|hindi|bollywood|punjabi|tamil|telugu|desi|kollywood|tollywood|zee music|t-series)\b/i;
const DIASPORA_PATTERN = /\b(diaspora|south asian|indo[- ]?canadian|indo[- ]?uk|uk desi|desi pop|global desi|brown munde)\b/i;

export const EDITORIAL_TAG_THEME: Record<EditorialTag, { background: string; border: string; text: string }> = {
  India: { background: '#FF9933', border: '#0A0A0A', text: '#0A0A0A' },
  Global: { background: '#00D4FF', border: '#0A0A0A', text: '#0A0A0A' },
  Diaspora: { background: '#005CA9', border: '#FFFFFF', text: '#FFFFFF' },
};

export function getEditorialTags(track: TrackLike, hint: EditorialHint = 'neutral'): EditorialTag[] {
  const text = `${track.title} ${track.artist}`;
  const hasIndiaSignal = INDIA_PATTERN.test(text);
  const hasDiasporaSignal = DIASPORA_PATTERN.test(text);

  const tags: EditorialTag[] = [];

  if (hasIndiaSignal || hint === 'india') {
    tags.push('India');
  }

  if (hasDiasporaSignal) {
    tags.push('Diaspora');
  }

  if (hint === 'global' || hint === 'fusion' || tags.length === 0) {
    tags.push('Global');
  }

  if (hint === 'fusion' && !tags.includes('India')) {
    tags.push('India');
  }

  return Array.from(new Set(tags)).slice(0, 3);
}
