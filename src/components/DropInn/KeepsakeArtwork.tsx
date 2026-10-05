import { useState } from 'react';
import { Star } from 'lucide-react';

const keepsakeArt = new Map([
  ['Mara’s copper bell', '/art/keepsake-copper-bell.png'],
  ['A silver river reed', '/art/keepsake-silver-reed.png'],
  ['The guardian’s moonstone', '/art/keepsake-moonstone.png'],
  ['Mosswater’s marked cup', '/art/mosswater-keepsake-cup.webp'],
  ['Mosswater’s knotted reed', '/art/mosswater-keepsake-reed.webp'],
  ['Mosswater’s well token', '/art/mosswater-keepsake-token.webp'],
]);

/** Reward names remain the source of meaning, including when art cannot load. */
export function KeepsakeArtwork({ name }: { name: string }) {
  const src = keepsakeArt.get(name);
  const [failedSource, setFailedSource] = useState<string>();
  return <span className="di-keepsake-art" aria-hidden="true">
    {src && failedSource !== src
      ? <img src={src} alt="" width={72} height={72} draggable={false} loading="lazy"
          onError={() => setFailedSource(src)} />
      : <Star size={28} />}
  </span>;
}
