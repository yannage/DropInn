import { useState } from 'react';
import { BookOpen, Dices, Sparkles } from 'lucide-react';

const artwork = {
  spotlight: { file: 'ui-spotlight-charm-v1', Icon: Sparkles },
  journal: { file: 'ui-journal-v1', Icon: BookOpen },
  dice: { file: 'ui-dice-cup-v1', Icon: Dices },
};

/** Illustrations decorate existing labeled controls; they never own input. */
export function TabletopArtwork({ kind }: { kind: keyof typeof artwork }) {
  const { file, Icon } = artwork[kind];
  const [failed, setFailed] = useState<string>();
  return <span className={`di-tabletop-art is-${kind}`} aria-hidden="true">
    {failed === file ? <Icon size={24} /> : <img src={`/art/${file}.webp`} alt="" width={64} height={64} draggable={false} onError={() => setFailed(file)} />}
  </span>;
}
