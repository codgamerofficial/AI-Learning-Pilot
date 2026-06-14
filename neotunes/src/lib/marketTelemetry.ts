import AsyncStorage from '@react-native-async-storage/async-storage';
import { type EditorialHint, getEditorialTags } from './editorial';

type Bucket = 'india' | 'global' | 'diaspora';

interface TrackLike {
  id: string;
  title: string;
  artist: string;
}

interface MarketTelemetryState {
  impressions: Record<Bucket, number>;
  plays: Record<Bucket, number>;
  globalTrackPlayCount: Record<string, number>;
  globalRepeatPlays: number;
  playlistGenerations: number;
  playlistTracksGenerated: number;
  updatedAt: number;
}

export interface MarketTelemetryMetrics {
  indiaCtrProxy: number;
  globalRetentionProxy: number;
  diasporaPlayShare: number;
  playlistGenerations: number;
  playlistTracksGenerated: number;
  totalImpressions: number;
  totalPlays: number;
}

const STORAGE_KEY = 'neotunes_market_telemetry_v1';
const MAX_TRACK_KEYS = 400;
const TRIM_TO_TRACK_KEYS = 300;

function emptyBuckets(): Record<Bucket, number> {
  return { india: 0, global: 0, diaspora: 0 };
}

function createDefaultState(): MarketTelemetryState {
  return {
    impressions: emptyBuckets(),
    plays: emptyBuckets(),
    globalTrackPlayCount: {},
    globalRepeatPlays: 0,
    playlistGenerations: 0,
    playlistTracksGenerated: 0,
    updatedAt: Date.now(),
  };
}

let memState: MarketTelemetryState | null = null;
let writeChain: Promise<void> = Promise.resolve();

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function hydrateState(raw: unknown): MarketTelemetryState {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') return base;

  const source = raw as Partial<MarketTelemetryState>;
  const sourceImpressions = (source.impressions ?? {}) as Partial<Record<Bucket, number>>;
  const sourcePlays = (source.plays ?? {}) as Partial<Record<Bucket, number>>;

  return {
    impressions: {
      india: asNumber(sourceImpressions.india),
      global: asNumber(sourceImpressions.global),
      diaspora: asNumber(sourceImpressions.diaspora),
    },
    plays: {
      india: asNumber(sourcePlays.india),
      global: asNumber(sourcePlays.global),
      diaspora: asNumber(sourcePlays.diaspora),
    },
    globalTrackPlayCount:
      source.globalTrackPlayCount && typeof source.globalTrackPlayCount === 'object'
        ? Object.entries(source.globalTrackPlayCount).reduce<Record<string, number>>((acc, [key, value]) => {
            acc[key] = asNumber(value);
            return acc;
          }, {})
        : {},
    globalRepeatPlays: asNumber(source.globalRepeatPlays),
    playlistGenerations: asNumber(source.playlistGenerations),
    playlistTracksGenerated: asNumber(source.playlistTracksGenerated),
    updatedAt: asNumber(source.updatedAt) || Date.now(),
  };
}

async function getState(): Promise<MarketTelemetryState> {
  if (memState) return memState;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memState = createDefaultState();
      return memState;
    }
    memState = hydrateState(JSON.parse(raw));
    return memState;
  } catch {
    memState = createDefaultState();
    return memState;
  }
}

async function persistState(state: MarketTelemetryState): Promise<void> {
  memState = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures to avoid impacting playback UX.
  }
}

function tagToBucket(tag: string): Bucket {
  if (tag === 'India') return 'india';
  if (tag === 'Diaspora') return 'diaspora';
  return 'global';
}

function toBuckets(track: Omit<TrackLike, 'id'>, hint: EditorialHint): Bucket[] {
  return Array.from(new Set(getEditorialTags(track, hint).map(tagToBucket)));
}

function trimGlobalTrackCounts(state: MarketTelemetryState) {
  const keys = Object.keys(state.globalTrackPlayCount);
  if (keys.length <= MAX_TRACK_KEYS) return;

  for (const key of keys.slice(0, keys.length - TRIM_TO_TRACK_KEYS)) {
    delete state.globalTrackPlayCount[key];
  }
}

async function mutateState(mutator: (state: MarketTelemetryState) => void): Promise<void> {
  writeChain = writeChain.then(async () => {
    const state = await getState();
    mutator(state);
    state.updatedAt = Date.now();
    await persistState(state);
  }).catch(() => {
    // Keep chain alive after any unexpected error.
  });

  await writeChain;
}

export async function recordTrackImpressions(
  tracks: Array<Omit<TrackLike, 'id'> | TrackLike>,
  hint: EditorialHint = 'neutral',
): Promise<void> {
  if (!tracks.length) return;

  await mutateState((state) => {
    for (const track of tracks) {
      const buckets = toBuckets(track, hint);
      for (const bucket of buckets) {
        state.impressions[bucket] += 1;
      }
    }
  });
}

export async function recordTrackPlay(track: TrackLike, hint: EditorialHint = 'neutral'): Promise<void> {
  await mutateState((state) => {
    const buckets = toBuckets(track, hint);

    for (const bucket of buckets) {
      state.plays[bucket] += 1;
    }

    if (buckets.includes('global')) {
      const currentCount = state.globalTrackPlayCount[track.id] ?? 0;
      if (currentCount >= 1) {
        state.globalRepeatPlays += 1;
      }
      state.globalTrackPlayCount[track.id] = currentCount + 1;
      trimGlobalTrackCounts(state);
    }
  });
}

export async function recordPlaylistGenerated(trackCount: number): Promise<void> {
  await mutateState((state) => {
    state.playlistGenerations += 1;
    state.playlistTracksGenerated += Math.max(0, Math.floor(trackCount));
  });
}

export async function resetMarketTelemetry(): Promise<void> {
  writeChain = writeChain
    .then(async () => {
      const reset = createDefaultState();
      await persistState(reset);
    })
    .catch(() => {
      // Keep chain alive after any unexpected error.
    });

  await writeChain;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function getMarketTelemetryMetrics(): Promise<MarketTelemetryMetrics> {
  const state = await getState();
  const totalImpressions = state.impressions.india + state.impressions.global + state.impressions.diaspora;
  const totalPlays = state.plays.india + state.plays.global + state.plays.diaspora;

  const indiaCtrProxy = state.impressions.india > 0
    ? (state.plays.india / state.impressions.india) * 100
    : 0;

  const globalRetentionProxy = state.plays.global > 0
    ? (state.globalRepeatPlays / state.plays.global) * 100
    : 0;

  const diasporaPlayShare = totalPlays > 0
    ? (state.plays.diaspora / totalPlays) * 100
    : 0;

  return {
    indiaCtrProxy: round1(indiaCtrProxy),
    globalRetentionProxy: round1(globalRetentionProxy),
    diasporaPlayShare: round1(diasporaPlayShare),
    playlistGenerations: state.playlistGenerations,
    playlistTracksGenerated: state.playlistTracksGenerated,
    totalImpressions,
    totalPlays,
  };
}
