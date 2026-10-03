/** Painted frames run left-to-right, then top-to-bottom. Each cell includes its own safe margin. */
export const FRAME_ATLASES = {
  'sheep-loading': { src: '/art/flipbook-sheep-loading.webp', width: 1536, height: 1024, columns: 4, rows: 2, durationMs: 1120, posterFrame: 0 },
  discovery: { src: '/art/flipbook-discovery.webp', width: 1536, height: 1024, columns: 4, rows: 2, durationMs: 800, posterFrame: 0 },
  encounter: { src: '/art/flipbook-encounter.webp', width: 1536, height: 1024, columns: 4, rows: 2, durationMs: 600, posterFrame: 0 },
} as const;

export type FrameAtlasName = keyof typeof FRAME_ATLASES;
export const FRAME_COUNT = 8;

export function frameBackgroundPosition(index: number): string {
  const frame = Number.isFinite(index) ? Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor(index))) : 0;
  return `${frame % 4 / 3 * 100}% ${Math.floor(frame / 4) * 100}%`;
}

/** Reconnecting during a recorded visual beat must not replay its beginning. */
export function framePlayback(atlas: FrameAtlasName, durationMs?: number, elapsedMs = 0, loop = false) {
  const duration = Number.isFinite(durationMs) && durationMs! > 0 ? Math.max(240, durationMs!) : FRAME_ATLASES[atlas].durationMs;
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const completed = !loop && elapsed >= duration;
  const offset = loop ? elapsed % duration : Math.min(duration, elapsed);
  return { duration, offset, completed, frame: completed ? FRAME_COUNT - 1 : Math.min(FRAME_COUNT - 1, Math.floor(offset / duration * FRAME_COUNT)) };
}
