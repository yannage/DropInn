import { useState } from 'react';

const stages = ['village', 'river', 'chapel'] as const;

/** Decorative environment only; all interactive subjects are separate buttons. */
export function SceneStageArt({ chapter, art, className = '' }: { chapter: number; art?: string; className?: string }) {
  const stage = art ?? stages[chapter];
  const src = stage ? `/art/stage-${stage}.webp` : undefined;
  const [failedSource, setFailedSource] = useState<string>();
  if (!src || failedSource === src) return null;
  return <img className={`di-stage-art ${className}`.trim()} src={src} width={1536} height={1024}
    alt="" aria-hidden="true" draggable={false} onError={() => setFailedSource(src)} />;
}
