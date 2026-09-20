import { useState } from 'react';
import { Heart, MessageCircle, Search, Swords } from 'lucide-react';
import type { TokenKind } from '../../lib/dropinn/types';

export type IllustratedToken = Exclude<TokenKind, 'spotlight'>;
const fallbackIcons = { fight: Swords, influence: MessageCircle, investigate: Search, assist: Heart };

/** Decorative only; the enclosing button keeps its label and pointer gestures. */
export function TokenArtwork({ token }: { token: IllustratedToken }) {
  const [failedSource, setFailedSource] = useState<string>();
  const src = `/art/token-${token}.png`;
  const Icon = fallbackIcons[token];
  return <span className={`di-token-art ${failedSource === src ? 'di-token-art-fallback' : ''}`} aria-hidden="true">
    {failedSource === src ? <Icon size={26} /> :
      <img src={src} alt="" width={64} height={64} draggable={false} onError={() => setFailedSource(src)} />}
  </span>;
}
