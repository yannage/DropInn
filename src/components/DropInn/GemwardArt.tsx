import { useState, type CSSProperties } from 'react';
import { Gem } from 'lucide-react';
import type { SceneTarget } from '../../lib/dropinn/types';

export const gemwardBackdrop = (locationId: string) => `/art/gemward-v2-${locationId === 'tavern' ? 'inn' : locationId}.webp`;
export const gemwardItemArt: Record<string, string> = {
  'ledger-copy': 'ledger', 'buyer-evidence': 'ledger', 'canal-key': 'canal-key',
  'recovered-prism': 'prism', 'ward-warning': 'ledger',
};
const people = new Set(['iris', 'nella', 'oren', 'tess', 'bram', 'keeper', 'town', 'neighbours', 'watcher']);
const art: Record<string, string> = {
  iris: 'mara-safe', nella: 'story-nella', oren: 'story-brindle', tess: 'story-pella', bram: 'ferryman-warning', keeper: 'ferryman-warning',
  'price-board': 'gemward-v2-price-board', 'display-case': 'gemward-v2-empty-gem-stand', noticeboard: 'gemward-v2-price-board', manifest: 'gemward-v2-ledger',
  hearth: 'story-kettle', lock: 'story-sluice', reeds: 'reeds-path', crate: 'story-parcels', ramp: 'story-rope',
  'prism-trail': 'gemward-v2-prism', cradle: 'gemward-v2-empty-gem-stand', town: 'story-pella',
  lanterns: 'story-lantern', spark: 'gemward-v2-prism', neighbours: 'story-pella',
};
/** Authored compositions keep hit regions stationary while only their painted pieces move. */
export function gemwardPlacement(location: string, index: number): CSSProperties {
  const layouts: Record<string, number[][]> = {
    shop: [[29, 51, 22], [71, 47, 20], [16, 25, 15], [56, 65, 20]],
    tavern: [[27, 49, 22], [70, 46, 21], [81, 23, 15], [49, 65, 18]],
    docks: [[28, 49, 22], [67, 30, 17], [76, 59, 23], [15, 69, 22]],
    warehouse: [[24, 63, 25], [70, 45, 23], [77, 68, 19], [40, 29, 15]],
    canal: [[28, 63, 23], [72, 43, 23], [73, 69, 21], [34, 29, 16]],
    road: [[24, 64, 23], [70, 42, 25], [76, 68, 21], [33, 26, 15]],
    beacon: [[48, 43, 28], [79, 52, 21], [28, 68, 17], [17, 43, 21]],
    'lantern-square': [[49, 39, 27], [78, 52, 20], [30, 69, 18], [18, 42, 21]],
  };
  const [x, y, width] = (layouts[location] ?? layouts.shop)[index] ?? [50, 50, 20];
  return { '--piece-x': `${x}%`, '--piece-y': `${y}%`, '--piece-width': `${width}%`, '--piece-order': index } as CSSProperties;
}
export function GemwardPiece({ target, variant, locationId, restored = false }: { target: SceneTarget; variant: string; locationId: string; restored?: boolean }) {
  const source = target.id === 'watcher' || target.id === 'encounter' ? `gemward-v2-${variant === 'smugglers' ? 'hired-guard' : 'ward-construct'}`
    : target.id === 'beacon' ? restored ? 'ward-restored' : 'broken-ward' : art[target.id] ?? target.artKey;
  const src = source ? `/art/${source}${source === 'broken-ward' ? '.png' : '.webp'}` : '';
  const [failed, setFailed] = useState('');
  return <span className={`gm-piece-art ${people.has(target.id) ? 'is-person' : 'is-prop'}`} aria-hidden="true">
    {src && failed !== src ? <img src={src} alt="" draggable={false} onError={() => setFailed(src)} /> : <span className="gm-art-fallback"><Gem strokeWidth={1.4} /></span>}
    {target.id === 'crate' && target.changed && <img className="gm-crate-light" src="/art/gemward-v2-prism.webp" alt="" draggable={false} />}
  </span>;
}
export function GemwardItem({ id }: { id: string }) {
  const file = gemwardItemArt[id];
  return file ? <img className="gm-item-art" src={`/art/gemward-v2-${file}.webp`} alt="" draggable={false} /> : <Gem className="gm-item-art" aria-hidden="true" />;
}
