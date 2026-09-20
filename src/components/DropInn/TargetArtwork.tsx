import { useState } from 'react';
import type { SceneTarget } from '../../lib/dropinn/types';

// Presentation only: these IDs come from authored content, never from image output.
const targetArt = new Map<string, string>([
  ['mara', '/art/mara.png'],
  ['tracks', '/art/tracks.png'],
  ['gate', '/art/gate.png'],
  ['herd', '/art/sheep.png'],
  ['pack', '/art/shadow-pack.png'],
  ['reeds', '/art/tall-reeds.png'],
  ['boat', '/art/stranded-boat.png'],
  ['ferryman', '/art/ferryman.png'],
  ['gloamfang', '/art/gloamfang.png'],
  ['ward', '/art/broken-ward.png'],
  ['bell', '/art/chapel-bell.png'],
  ['captives', '/art/captive-livestock.png'],
]);

const developedArt = new Map<string, string>([
  ['mara', '/art/mara-safe.webp'],
  ['gate', '/art/gate-sheltered.webp'],
  ['tracks', '/art/tracks-fragment.webp'],
  ['herd', '/art/herd-gathered.webp'],
  ['boat', '/art/boat-afloat.webp'],
  ['reeds', '/art/reeds-path.webp'],
  ['ferryman', '/art/ferryman-warning.webp'],
  ['ward', '/art/ward-restored.webp'],
  ['bell', '/art/bell-ringing.webp'],
  ['captives', '/art/captives-free.webp'],
]);

export type TargetPose = 'idle' | 'windup' | 'reaction';

const enemyArt = new Map<string, string>([
  ['pack', 'shadow-pack'],
  ['gloamfang', 'gloamfang'],
]);

export function TargetArtwork({ target, pose = 'idle' }: {
  target: Pick<SceneTarget, 'id' | 'changed' | 'artKey'>;
  pose?: TargetPose;
}) {
  const enemy = enemyArt.get(target.id);
  const src = target.artKey ? `/art/${target.artKey}${target.artKey === 'gate' ? '.png' : '.webp'}` : target.changed ? developedArt.get(target.id)
    : enemy && pose !== 'idle' ? `/art/${enemy}-${pose}.webp` : targetArt.get(target.id);
  const [failedSource, setFailedSource] = useState<string>();
  // Never replace a developed object with its contradictory initial illustration.
  if (!src || failedSource === src) return null;
  return <span className="di-target-art" data-pose={pose} aria-hidden="true">
    <img src={src} alt="" width={96} height={96} draggable={false}
      onError={() => setFailedSource(src)} />
  </span>;
}
