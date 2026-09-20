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

export function TargetArtwork({ target }: { target: Pick<SceneTarget, 'id' | 'changed'> }) {
  const src = targetArt.get(target.id);
  const [failedSource, setFailedSource] = useState<string>();
  // Initial artwork may contradict a developed scene (e.g. a repaired gate).
  if (target.changed || !src || failedSource === src) return null;
  return <span className="di-target-art" aria-hidden="true">
    <img src={src} alt="" width={96} height={96} draggable={false}
      onError={() => setFailedSource(src)} />
  </span>;
}
