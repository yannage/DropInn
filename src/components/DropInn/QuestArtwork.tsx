import { useState } from 'react';
import { Backpack } from 'lucide-react';
import type { QuestRunState, QuestTarget } from '../../lib/dropinn/questRunTypes';

/** Presentation only: changing a plate never changes a pinned adventure's rules. */
export const QUEST_SCENES: Record<string, string> = {
  'well-yard': 'stage-village', watercourse: 'mosswater-scene-watercourse',
  'old-conduit': 'mosswater-scene-arch', 'derelict-mill': 'mosswater-scene-mill',
  'herb-bank': 'stage-river', 'hill-spring': 'mosswater-scene-hill-spring',
};
export const QUEST_ITEM_ART: Record<string, string> = {
  'stained-cloth': 'mosswater-stained-cloth', 'repair-tools': 'mosswater-repair-kit',
  'clean-sample': 'mosswater-clean-sample', 'reed-shield': 'mosswater-reed-shield',
  'sluice-hook': 'mosswater-sluice-hook', 'amber-focus': 'mosswater-amber-focus',
};

export function questPieceArtwork(id: string, original: string | undefined, state: Pick<QuestRunState, 'facts' | 'ending' | 'usedOptions'>) {
  const has = (factId: string) => state.facts.some(fact => fact.id === factId);
  if (id === 'dye-vat' && has('source-isolated')) return state.usedOptions.includes('vat-isolate') ? 'mosswater-vat-contained' : 'mosswater-feed-clear';
  if (id === 'well' && state.ending?.id === 'repair') return 'mosswater-well-sealed';
  if (id === 'spring-pool') return 'mosswater-spring-pool';
  if (id === 'old-sluice') return has('channel-open') ? 'story-sluice' : 'mosswater-sluice-blocked';
  if (id === 'ridge-path' && has('ridge-shortcut')) return 'gate-sheltered';
  if (id === 'tool-cache' || id === 'mill-cache') return 'mosswater-repair-kit';
  return original;
}

export function questPiecePresentation(target: QuestTarget, state: Pick<QuestRunState, 'facts' | 'ending' | 'usedOptions'>) {
  const has = (factId: string) => state.facts.some(fact => fact.id === factId);
  const result = { name: target.name, context: target.context, artKey: questPieceArtwork(target.id, target.artKey, state) };
  if (target.id === 'old-sluice' && has('channel-open')) return { ...result, name: 'Open water gate', context: 'The silt is cleared. This channel is ready for the spring relay. Tested water and a safe carrier’s handline will bring it home.' };
  if (target.id === 'ridge-path' && has('ridge-shortcut')) return { ...result, name: 'Secured ridge handline', context: 'The braced fence anchors a safe handline. Your direct route between the hill spring and well yard is open on the map.' };
  if (target.id === 'dye-vat' && has('source-isolated')) return { ...result, name: state.usedOptions.includes('vat-isolate') ? 'Leak contained' : 'The feed runs clean', context: state.usedOptions.includes('vat-isolate') ? 'The patched vat keeps the dye out of the well. The creature can keep its dry shelter.' : 'The vat has been hauled away from the feed. Clean water reaches the village again.' };
  if (target.id === 'well' && state.ending) return { ...result, name: state.ending.id === 'repair' ? 'Well sealed' : 'The village well', context: state.ending.id === 'repair' ? 'The old well is closed. Neighbours carry clean water along your new spring relay.' : 'The well runs clean again. Mara can fill her kettle.' };
  if (target.id === 'mossback' && (has('encounter-cleared:mossback') || state.ending?.id === 'bargain')) return { ...result, artKey: 'tracks.png', name: state.ending?.id === 'bargain' ? 'A new neighbour' : 'A clear way through', context: state.ending?.id === 'bargain' ? 'The mossback has moved to the promised washpond. The village owes its new neighbour an undisturbed home.' : 'The encounter is over. The vat can be reached; the water still needs a remedy unless the party has already finished one.' };
  if (target.id === 'reed-pack' && has('encounter-cleared:reed-pack')) return { ...result, artKey: 'tracks.png', name: 'A clear way through', context: 'The pack no longer bars the passage. The mill repair kit and the direct dye-yard exit can now be reached.' };
  return result;
}

/** The adjacent item name stays visible if artwork cannot load. */
export function QuestItemArtwork({ id }: { id: string }) {
  const art = QUEST_ITEM_ART[id];
  const [failed, setFailed] = useState<string>();
  return <span className="qr-item-art" aria-hidden="true">{art && failed !== art
    ? <img src={`/art/${art}.webp`} alt="" width={72} height={72} draggable={false} onError={() => setFailed(art)} />
    : <Backpack size={24} />}</span>;
}
