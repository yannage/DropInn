import { useState } from 'react';

const scenes = {
  village: { src: '/art/scene-village.png', description: 'A crooked green inn, two little sheep, and a broken fence beneath a lopsided moon.' },
  river: { src: '/art/scene-river.png', description: 'A winding blue river, crooked wooden bridge, and stranded rowboat among the reeds.' },
  chapel: { src: '/art/scene-chapel.png', description: 'A wonky old chapel with a leaning bell tower and three little ward stones.' },
};

export function sceneArtwork(scene: string) {
  return scenes[scene as keyof typeof scenes] ?? {
    src: `/art/${/^(stage-|gemward-|mosswater-|avalon-)/.test(scene) ? scene : `stage-${scene}`}.webp`,
    description: 'An illustrated adventure setting.',
  };
}

/** Local illustrations share a crop-safe composition across banners and cards. */
export function SceneArt({ scene = 'village', className = '' }: {
  scene?: string;
  className?: string;
}) {
  const art = sceneArtwork(scene);
  const [failedSource, setFailedSource] = useState<string>();
  if (failedSource === art.src) {
    return <div className={`di-scene-art di-scene-fallback ${className}`} aria-hidden="true" />;
  }
  return <img className={`di-scene-art di-scene-${scene} ${className}`}
    src={art.src} alt={art.description} width={1536} height={1024}
    style={scene === 'avalon-scene-inn' ? { objectPosition: 'center top' } : undefined}
    draggable={false} decoding="async" onError={() => setFailedSource(art.src)} />;
}
