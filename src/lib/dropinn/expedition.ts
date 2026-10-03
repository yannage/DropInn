import type { CharacterClassKey } from '../character';
import type { AdventureRoom, ChapterDefinition, PlayerAction, SceneTarget, TokenKind } from './types';
import type { ConsumableKind, ExpeditionCombatMove, ExpeditionInteraction, ExpeditionState } from './expeditionTypes';
export type { ExpeditionAction, ExpeditionState, ConsumableInstance, ConsumableOffer, ConsumableKind } from './expeditionTypes';

export const isExpedition = (room: Pick<AdventureRoom, 'adventureId' | 'adventureVersion'>) => room.adventureId === 'gemward' && room.adventureVersion === 1;
export const expeditionHash = (text: string) => { let n = 2166136261; for (const char of text) n = Math.imul(n ^ char.charCodeAt(0), 16777619); return n >>> 0; };
export function createExpedition(seed: string): ExpeditionState {
  return { seed, variant: expeditionHash(seed) % 2 ? 'smugglers' : 'ward', locationId: 'shop', questItems: [], discoveries: [], visited: ['shop'], explorationTurns: 0, stashes: {}, offers: {}, rewarded: [], costs: [] };
}
export const QUEST_ITEMS: Record<string, { label: string; description: string }> = {
  'ledger-copy': { label: 'Marked delivery ledger', description: 'A copied delivery mark identifies a way into the warehouse.' },
  'canal-key': { label: 'Canal lock key', description: 'Bram’s key opens the quieter water route.' },
  'ward-warning': { label: 'Keeper’s warning', description: 'The keeper explains what restoring the beacon sacrifices, and what releasing the light preserves.' },
  'recovered-prism': { label: 'The missing prism', description: 'The real prism is safe. Decide what its light should become.' },
  'buyer-evidence': { label: 'Warehouse record', description: 'The records identify who moved the prism. The party now has a lead to the guarded crate.' },
  'mooring-line': { label: 'Secured canal landing', description: 'A quiet landing is ready. Distract the watcher or follow the light to recover the prism without fighting.' },
  'quiet-passage': { label: 'Quiet passage', description: 'The party recovered the prism without disturbing its watcher.' },
};
export const FAVOUR_CHOICES = ['ledger-copy', 'canal-key'].map(id => ({ id, label: QUEST_ITEMS[id].label }));
export const CONSUMABLES: { id: ConsumableKind; label: string; description: string; when: 'exploration' | 'combat' | 'any' }[] = [
  { id: 'second-wind', label: 'Second wind', description: 'Recover up to 4 of your HP, including while downed.', when: 'any' },
  { id: 'smoke', label: 'Smoke flask', description: 'Block 3 damage from this battle’s announced strike; strongest cover wins.', when: 'combat' },
  { id: 'favour', label: 'Local favour', description: 'Choose a delivery ledger or canal key. Its route opens next turn.', when: 'exploration' },
  { id: 'dust', label: 'Spark dust', description: 'Double the progress from this exploration action.', when: 'exploration' },
  { id: 'binding', label: 'Binding thread', description: 'Boost your battle contribution by 2 before dividing progress between heroes.', when: 'combat' },
];
const tokens: TokenKind[] = ['fight', 'influence', 'investigate', 'assist'];
const people = new Set(['iris', 'nella', 'oren', 'tess', 'bram', 'keeper', 'town', 'watcher']);
const target = (id: string, name: string, description: string, artKey: string): SceneTarget => ({ id, name, description, context: description, artKey, tokens: people.has(id) || ['price-board', 'noticeboard', 'manifest', 'lock'].includes(id) ? tokens.filter(token => token !== 'fight') : tokens, effects: ['cover', 'distract', 'reveal', 'rescue'], actionCues: { fight: 'Clear a practical obstacle', influence: 'Ask what changed', investigate: 'Follow a useful detail', assist: 'Offer practical help' }, development: { name, description: `${description} Your first discovery is recorded; another intention may reveal something different.`, context: 'Use the recorded discovery to decide what to try next.' } });
const locations = [
  { id: 'shop', label: 'Iris’s gem shop', description: 'Two people know different parts of the missing-prism story.', art: 'village', targets: [target('iris', 'Iris the jeweller', 'Iris prices gems and knows the missing delivery.', 'mara-safe'), target('nella', 'Nella the apprentice', 'Nella last handled the prism and noticed its unusual light.', 'story-nella'), target('price-board', 'Gem price board', 'The repairs are costly: using the prism will destroy it.', ''), target('display-case', 'Empty display case', 'A delivery seal lies beside the empty velvet stand.', '')] },
  { id: 'tavern', label: 'The Lantern Inn', description: 'A courier’s story and a warm meal can prepare the party.', art: 'village', targets: [target('oren', 'Oren the innkeeper', 'Oren has food for anyone helping the town.', 'story-brindle'), target('tess', 'Tess the courier', 'Tess remembers which delivery left after sunset.', 'story-pella'), target('noticeboard', 'Town noticeboard', 'The keeper warns that both beacon choices have a cost.', ''), target('hearth', 'Dwindling hearth', 'Keep the warmth alive while neighbours share news.', '')] },
  { id: 'docks', label: 'The canal docks', description: 'Follow the water route or collect supplies for the road.', art: 'river', targets: [target('bram', 'Bram the ferryman', 'Bram holds the canal key and asks who needs passage.', 'ferryman-warning'), target('manifest', 'Shipping manifest', 'A marked crate went towards the old warehouse.', ''), target('lock', 'Canal lock', 'The lock needs Bram’s key; its gate is sound.', 'story-sluice'), target('reeds', 'Sheltered reeds', 'A dropped satchel holds a useful smoke flask.', 'reeds-path')] },
  { id: 'warehouse', label: 'Old warehouse', description: 'The delivery mark opens the yard; the prism is inside.', art: 'village', targets: [target('crate', 'Marked crate', 'The crate’s warm glow confirms you found the prism.', ''), target('watcher', 'Restless watcher', 'An obstacle stands between you and the prism.', ''), target('ramp', 'Loading ramp', 'A sheltered approach gives everyone a way in.', ''), target('prism-trail', 'Trail of light', 'The light points towards the damaged beacon.', '')] },
  { id: 'canal', label: 'Hidden canal', description: 'Bram’s key opens a quiet path below the beacon.', art: 'river', targets: [target('crate', 'Drifting crate', 'A warm glow slips through the crate’s seams.', ''), target('watcher', 'Waterway watcher', 'Something guards the narrow bank.', ''), target('ramp', 'Sheltered landing', 'Bring the party safely onto the bank.', 'reeds-path'), target('prism-trail', 'Light on water', 'The light points towards the damaged beacon.', '')] },
  { id: 'road', label: 'Open hill road', description: 'Always passable; the longer journey costs supplies.', art: 'village', targets: [target('crate', 'Abandoned handcart', 'The prism’s light escapes beneath a cloth.', ''), target('watcher', 'Roadside watcher', 'An obstacle waits near the handcart.', ''), target('ramp', 'Winding path', 'Lead everyone through the exposed bend.', 'reeds-path'), target('prism-trail', 'Faint beacon light', 'The light points towards the damaged beacon.', '')] },
  { id: 'beacon', label: 'Gemward beacon', description: 'Bring the light home and choose what the town gives up.', art: 'chapel', targets: [target('beacon', 'Broken beacon', 'Help restores the beacon; Influence releases the light. Both have a lasting cost.', 'broken-ward.png'), target('keeper', 'Keeper at dusk', 'The keeper explains what each choice preserves.', 'ferryman-warning'), target('cradle', 'Prism cradle', 'Prepare a safe home for the recovered light.', ''), target('town', 'Waiting townsfolk', 'Help neighbours prepare for the new evening.', 'story-lantern')] },
];
const chapter = (index: number): ChapterDefinition => ({ id: ['gemward-town', 'gemward-route', 'gemward-return'][index], title: ['A light goes missing', 'Follow the light', 'An evening changed'][index], location: ['Gemward', 'Beyond Gemward', 'The beacon'][index], intro: ['Gemward’s beacon is dark. Explore the shop, inn and docks to find the missing prism and choose a route together.', 'Your route leads to the missing prism. Prepare the approach; an encounter may interrupt the exploration round.', 'The prism is recovered. Restore the beacon at its stated cost, or release the light and help Gemward through dark evenings.'][index], objective: ['Discover a lead, then choose the party’s route.', 'Recover the prism and bring everyone home.', 'Choose the light’s future and help the town.'][index], threat: 'The light is fading; every route still leads onwards.', art: ['village', 'river', 'chapel'][index], targets: locations[index === 0 ? 0 : index === 1 ? 5 : 6].targets, progressGoal: [4, 8, 4][index], combat: false, keepsake: ['Iris’s glass bead', 'A prism-thread bracelet', 'Gemward’s little lantern'][index], catchUp: ['The evening beacon has gone dark. Talk, investigate or help at any town stop; discoveries can open routes.', 'The missing prism lies ahead. The party’s earlier route determines the approach, and every route can recover it.', 'The party brought the prism home. Decide its future and help the neighbours live with the cost.'][index], endings: { success: ['A useful lead opens the way beyond Gemward.', 'The party brings the prism back safely.', 'The town begins a changed evening.'][index], mixed: ['The party follows the open road with the facts it has.', 'The prism is safe, though the journey costs supplies.', 'Neighbours begin repairs and share their remaining light.'][index], setback: ['A clear trail along the open road keeps the search moving.', 'The party escapes with the prism at a cost.', 'The town survives the dark and begins again together.'][index] } });
export const GEMWARD_DEFINITION = { id: 'gemward', version: 1, title: 'Gemward: The Missing Light', pitch: 'Explore a town, uncover its missing prism, and choose the light’s future together.', chapters: [chapter(0), chapter(1), chapter(2)] };
export function expeditionLocations(room: AdventureRoom) {
  return locations.map(location => ({ id: location.id, label: location.label, description: location.description, available: room.chapter === 0 ? ['shop', 'tavern', 'docks'].includes(location.id) : location.id === (room.chapter === 1 ? room.expedition?.routeId ?? 'road' : 'beacon') }));
}
export function expeditionRoutes(room: AdventureRoom) {
  return [
    { id: 'warehouse', label: 'Warehouse', description: 'Trace the delivery, then face the guard. Start the encounter with 1 advantage.', requires: 'ledger-copy' },
    { id: 'canal', label: 'Canal', description: 'Secure a landing, then slip past the watcher. A quiet recovery can avoid battle.', requires: 'canal-key' },
    { id: 'road', label: 'Hill road', description: 'Always open. The longer journey costs supplies and adds 1 danger.', requires: undefined },
  ].map(route => ({ ...route, available: !route.requires || !!room.expedition?.questItems.includes(route.requires) }));
}
export function expeditionStash(room: AdventureRoom, userId: string) { return room.expedition?.stashes[userId] ?? []; }
export function combatMoves(classKey: CharacterClassKey, humanCount = 1): ExpeditionCombatMove[] {
  const points = (value: number) => Number((value / Math.max(1, humanCount)).toFixed(2));
  const special = { fighter: ['Shield wall', `Gain ${points(1)} battle progress and block 4 damage.`], rogue: ['Expose weakness', `Gain ${points(2)} battle progress and give the party +1 progress next round.`], wizard: ['Unravel ward', `Gain ${points(3)} battle progress against Guard, otherwise ${points(2)}.`], cleric: ['Guiding light', `Gain ${points(1)} battle progress and heal the most wounded hero by 3.`] }[classKey];
  const counter = (bonus = 0) => `win ${points(3 + bonus)} progress, tie ${points(2)}, lose ${points(1)}.`;
  return [
    { token: 'fight', label: classKey === 'fighter' ? 'Power strike' : classKey === 'cleric' ? 'Radiant strike' : 'Strike', stance: 'strike', description: `Beats Trick; ${counter(classKey === 'fighter' ? 1 : 0)}${classKey === 'cleric' ? ' A winning counter also restores 1 of your HP.' : ''}` },
    { token: 'influence', label: classKey === 'rogue' ? 'Clever feint' : 'Trick', stance: 'trick', description: `Beats Guard; ${counter(classKey === 'rogue' ? 1 : 0)}` },
    { token: 'investigate', label: classKey === 'wizard' ? 'Arcane guard' : 'Guard', stance: 'guard', description: `Beats Strike; ${counter()} Also block ${classKey === 'wizard' ? 3 : 2} damage.` },
    { token: 'assist', label: special[0], description: special[1] },
  ];
}
const interaction = (id: string, label: string, description: string, extra: Partial<ExpeditionInteraction> = {}): ExpeditionInteraction => ({ id, label, description, ...extra });
function finaleContext(room: AdventureRoom) {
  return `At the beacon, Help votes to restore the town’s light and ${room.expedition?.variant === 'smugglers' ? 'destroy the maker-mark evidence against the smugglers' : 'bind the living spark again'}. Influence votes to release the light, ${room.expedition?.variant === 'smugglers' ? 'preserving the evidence' : 'freeing the spark'} but leaving Gemward dark until repairs. Other actions abstain. Ties or no votes release the light; the resolved choice is permanent.`;
}
export function expeditionInteractions(room: AdventureRoom, locationId: string, targetId: string, token: TokenKind): ExpeditionInteraction[] {
  if (room.expedition?.battle?.status === 'active') return [];
  const sceneTarget = locations.find(location => location.id === locationId)?.targets.find(item => item.id === targetId);
  if (!sceneTarget || !sceneTarget.tokens.includes(token)) return [];
  const truth = room.expedition?.variant === 'smugglers' ? 'A smuggler paid for a late delivery. The prism’s maker mark can prove the theft, but restoring the beacon destroys that evidence.' : 'Nella moved the failing prism to save its living spark. Restoring the beacon traps the spark again; releasing it means dark evenings until repairs.';
  if (room.chapter === 2 && targetId === 'beacon' && room.expedition?.finaleChoice) return [interaction(`beacon:sustain:${token}`,
    room.expedition.finaleChoice === 'restore' ? 'Sustain the restored beacon' : 'Prepare the town’s lanterns',
    `${room.expedition.finaleChoice === 'restore' ? 'The beacon has absorbed the prism. Help the town keep its light steady.' : 'The light was released. Help neighbours through dark evenings while repairs begin.'} The party’s recorded choice stays in effect.`)];
  if (room.chapter === 2 && targetId === 'beacon' && (token === 'assist' || token === 'influence')) return [token === 'assist'
    ? interaction('beacon:restore', 'Restore the beacon', `Relight Gemward now as the beacon absorbs the prism. ${room.expedition?.variant === 'smugglers' ? 'Its maker mark, the proof against the smugglers, is destroyed.' : 'The living spark remains bound inside the beacon.'} This party vote is permanent once resolved.`, { finaleChoice: 'restore' })
    : interaction('beacon:release', 'Release the light', `Keep ${room.expedition?.variant === 'smugglers' ? 'the maker-mark evidence' : 'the spark free'}, but leave Gemward dark until repairs. Ties and no votes choose this route.`, { finaleChoice: 'release' })];
  // Route items unlock different sequences, not just different starting numbers.
  if (room.chapter === 1 && !room.expedition?.encounterResolved) {
    if (locationId === 'warehouse' && ((['crate', 'prism-trail'].includes(targetId) && token === 'investigate') || (targetId === 'watcher' && token === 'influence'))) {
      return [interaction('warehouse:identify-buyer', 'Trace the delivery mark', room.expedition?.questItems.includes('buyer-evidence')
        ? 'The delivery is traced. The guard has noticed the search; the encounter begins after everyone finishes this turn.'
        : `${room.expedition?.variant === 'smugglers' ? 'The records name the smuggler’s buyer.' : 'The records show Nella brought the prism here to shelter its spark.'} The party can approach the guarded crate next turn.`, { questItem: 'buyer-evidence' })];
    }
    if (locationId === 'canal' && ['ramp', 'crate'].includes(targetId) && token === 'assist') {
      return [interaction('canal:moor', 'Secure a quiet landing', 'Tie the skiff to the landing. Next turn, distract the watcher or trace the light to slip past without fighting.', { questItem: 'mooring-line' })];
    }
    if (locationId === 'canal' && room.expedition?.questItems.includes('mooring-line')
      && (targetId === 'watcher' && token === 'influence' || targetId === 'prism-trail' && token === 'investigate')) {
      return [interaction('canal:quiet-recovery', token === 'influence' ? 'Draw the watcher away' : 'Follow the sheltered light', 'Use the secured landing to recover the prism quietly. Everyone’s accepted actions finish; no battle is needed.', { questItem: 'quiet-passage' })];
    }
  }
  const labels: Record<string, Partial<Record<TokenKind, string>>> = {
    iris: { influence: 'Ask about the missing delivery', investigate: 'Compare delivery marks', assist: 'Repair the jeweller’s scales' },
    nella: { influence: 'Ask about the fading light', investigate: 'Examine Nella’s sketch', assist: 'Sort the scattered gems' },
    oren: { influence: 'Ask about late visitors', investigate: 'Check the delivery chit', assist: 'Serve a warm meal' },
    tess: { influence: 'Ask about the night delivery', investigate: 'Trace Tess’s delivery mark', assist: 'Mend the courier’s satchel' },
    bram: { influence: 'Ask for canal passage', investigate: 'Read the water marks', assist: 'Help Bram load the skiff' },
    'price-board': { influence: 'Ask what repairs would cost', investigate: 'Read the repair estimate', assist: 'Check the keeper’s figures' },
    'display-case': { fight: 'Lift the fallen display stand', influence: 'Ask who packed the case', investigate: 'Inspect the delivery seal', assist: 'Repair the display stand' },
    noticeboard: { influence: 'Discuss the keeper’s warning', investigate: 'Read the beacon notice', assist: 'Post the repair notice' },
    manifest: { influence: 'Ask about the marked shipment', investigate: 'Read the shipping record', assist: 'Sort the delivery records' },
    lock: { influence: 'Ask Bram for the lock key', investigate: 'Inspect the canal gate', assist: 'Help prepare the lock' },
    hearth: { fight: 'Split kindling', influence: 'Gather neighbours by the fire', investigate: 'Check the fuel supply', assist: 'Tend the dwindling hearth' },
    reeds: { fight: 'Clear a path through reeds', influence: 'Call to the dockhands', investigate: 'Search the dropped satchel', assist: 'Mark a dry path' },
    crate: { fight: 'Brace the prism crate', investigate: 'Inspect the glowing seams', influence: 'Ask about the shipment', assist: 'Secure the crate' },
    watcher: { influence: 'Speak to the watcher', investigate: 'Study the watcher’s patrol', assist: 'Prepare a safe approach' },
    ramp: { fight: 'Clear the approach', influence: 'Coordinate the crossing', investigate: 'Find firm footing', assist: 'Brace the landing' },
    'prism-trail': { fight: 'Clear fallen debris', influence: 'Call the party to the light', investigate: 'Follow the light', assist: 'Mark the way home' },
    keeper: { influence: 'Discuss the lasting cost', investigate: 'Inspect the repair plans', assist: 'Help prepare tomorrow’s repairs' },
    cradle: { fight: 'Steady the stone cradle', influence: 'Call for the keeper’s guidance', investigate: 'Study the prism’s fitting', assist: 'Prepare the light’s resting place' },
    town: { influence: 'Explain what the party found', investigate: 'Find homes needing lanterns', assist: 'Share light with the neighbours' },
    beacon: { fight: 'Clear loose beacon stones', investigate: 'Study the beacon’s damage' },
  };
  const label = labels[targetId]?.[token] ?? (token === 'influence' ? 'Ask what is new' : token === 'investigate' ? 'Follow the details' : token === 'assist' ? 'Offer practical help' : 'Clear a way');
  const extra: Partial<ExpeditionInteraction> = {};
  let description = token === 'influence' ? 'Share news and coordinate the party’s next step.' : token === 'investigate' ? 'Inspect the scene and record a useful detail for the party.' : token === 'assist' ? 'Advance the shared plan with practical help.' : 'Clear a physical obstacle safely; this does not attack a person.';
  if (['iris', 'tess', 'manifest', 'display-case'].includes(targetId) && ['influence', 'investigate'].includes(token)) { extra.questItem = 'ledger-copy'; description = 'A copied delivery mark identifies the warehouse. That route becomes available next turn.'; }
  if (['bram', 'lock'].includes(targetId) && ['influence', 'assist'].includes(token)) { extra.questItem = 'canal-key'; description = 'Bram lends the canal key. The sheltered canal route will be available next turn.'; }
  if (['nella', 'price-board', 'noticeboard', 'keeper'].includes(targetId)) { extra.questItem = 'ward-warning'; description = truth; }
  if (token === 'assist' && ['iris', 'nella', 'oren', 'tess', 'bram'].includes(targetId)) extra.consumable = ({ iris: 'favour', nella: 'dust', oren: 'second-wind', tess: 'binding', bram: 'smoke' } as const)[targetId as 'iris'];
  if (targetId === 'reeds' && token === 'investigate') extra.consumable = 'smoke';
  const result = [interaction(`${targetId}:${token}`, label, description, extra)];
  if (targetId === 'iris' && token === 'influence') result.unshift(interaction('iris:pricing', 'Ask about gem prices', 'Iris checks the price list and discovers missing stock. A copied delivery mark opens the warehouse route next turn.', { questItem: 'ledger-copy' }));
  return result;
}
export function expeditionScene(room: AdventureRoom, locationId?: string): ChapterDefinition {
  const base = GEMWARD_DEFINITION.chapters[Math.min(2, room.chapter)];
  if (!room.expedition) return { ...base, situation: base.intro };
  const state = room.expedition;
  if (state.battle?.status === 'active') return { ...base, title: 'A battle interrupts', location: 'The prism’s hiding place', combat: true, enemySource: 'encounter', objective: 'Overcome the encounter, then resume the search.', situation: `Enemy stance: ${state.battle.stance}. Battle round ${state.battle.round} of 4; ${state.battle.progress}/${state.battle.goal} progress.`, threat: state.variant === 'smugglers' ? 'A hired guard bars the way to the prism.' : 'A frightened ward construct guards the living spark.', targets: [target('encounter', state.variant === 'smugglers' ? 'Hired guard' : 'Ward construct', `The enemy announces ${state.battle.stance}. Strike beats Trick; Trick beats Guard; Guard beats Strike.`, 'ferryman-warning'), target('cover', 'Sheltered approach', 'Guard protects the announced hero.', 'reeds-path'), target('opening', 'Exposed weakness', 'Trick turns the enemy’s guard aside.', 'tracks-fragment'), target('allies', 'Party’s resolve', 'Your class Help remains available while downed.', 'mara-safe')], progressGoal: base.progressGoal };
  const location = locations.find(item => item.id === (locationId ?? state.locationId)) ?? locations[0];
  const targets = location.targets.map(item => ({ ...item,
    ...(item.id === 'beacon' && state.finaleChoice ? { name: state.finaleChoice === 'restore' ? 'Restored beacon' : 'Quiet beacon', artKey: state.finaleChoice === 'restore' ? 'ward-restored' : '', description: state.finaleChoice === 'restore' ? 'The prism is absorbed and the beacon shines. Help the town sustain its light.' : 'The prism’s light was released. Help the neighbours share lanterns until repairs.' } : {}),
    changed: state.discoveries.some(id => id.startsWith(`${item.id}:`))
      || location.id === 'warehouse' && item.id === 'crate' && state.questItems.includes('buyer-evidence')
      || location.id === 'canal' && item.id === 'ramp' && state.questItems.includes('mooring-line'),
    context: room.chapter === 2 && item.id === 'beacon' ? expeditionInteractions(room, 'beacon', 'beacon', 'assist')[0].description + ' ' + expeditionInteractions(room, 'beacon', 'beacon', 'influence')[0].description : item.context,
    actionCues: Object.fromEntries(item.tokens.map(token => [token, expeditionInteractions(room, location.id, item.id, token)[0]?.label ?? item.actionCues?.[token]])),
  }));
  let situation = location.description;
  let objective = base.objective;
  if (room.chapter === 1) {
    if (state.encounterResolved) {
      situation = state.questItems.includes('quiet-passage') ? 'The prism is safe and the watcher is undisturbed. Finish an action here to bring the light home.' : 'The encounter is over. Finish an action here to carry the recovered prism home.';
      objective = 'Bring the recovered prism back to Gemward.';
    } else if (state.battle?.status === 'queued') {
      situation = 'Everyone’s exploration actions are complete. The party faces the watcher next turn.';
    } else if (location.id === 'warehouse') {
      situation = state.questItems.includes('buyer-evidence') ? 'The records reveal who moved the prism. The guard will interrupt after this exploration turn.' : 'Investigate the crate or speak to its watcher to identify who moved the prism.';
      objective = state.questItems.includes('buyer-evidence') ? 'Prepare to face the guard at the marked crate.' : 'Trace who moved the prism.';
    } else if (location.id === 'canal') {
      situation = state.questItems.includes('mooring-line') ? 'The landing is secure. Influence the watcher or Investigate the light to recover the prism quietly.' : 'Help at the crate or landing to secure a quiet approach before the watcher notices.';
      objective = state.questItems.includes('mooring-line') ? 'Slip past the watcher using the secured landing.' : 'Prepare a quiet landing for the party.';
    } else situation = 'The open road leads to the prism. The watcher will confront the party after everyone acts.';
  }
  if (state.finaleChoice) situation = state.finaleChoice === 'restore' ? 'The beacon shines again. Its promised cost remains; help the town settle into the evening.' : 'The released light is safe. Share lanterns while Gemward begins its promised repairs.';
  const endings = room.chapter === 2 && state.ending ? { success: state.ending, mixed: state.ending, setback: state.ending } : base.endings;
  return { ...base, location: location.label, art: location.art, targets, endings, objective, situation, ...(room.chapter === 2 && !state.finaleChoice ? { catchUp: finaleContext(room) } : {}) };
}
/** History resolves a confirmed location, rather than the viewer's current tab. */
export function expeditionTarget(locationId: string | undefined, targetId: string | undefined) {
  return locations.find(location => location.id === locationId)?.targets.find(item => item.id === targetId);
}
export function expeditionActionPreview(room: AdventureRoom, userId: string, action: PlayerAction): { label: string; description: string } {
  const seat = room.seats.find(item => item.actorId === userId);
  const humanCount = room.seats.filter(item => item.kind === 'human').length;
  if (room.expedition?.battle?.status === 'active') {
    const item = expeditionStash(room, userId).find(item => item.id === action.expedition?.consumableId);
    if (action.targetKind === 'hero' || seat && seat.hp <= 0) return { label: 'Protect', description: `Block 2 damage for the threatened hero, or 3 with a good release. ${item?.kind === 'binding' ? `Binding thread adds ${Number((2 / Math.max(1, humanCount)).toFixed(2))} battle progress.` : 'No battle progress.'}` };
    const preview = combatMoves(seat?.character.classKey ?? 'fighter', humanCount).find(move => move.token === action.token) ?? { label: 'Creative move', description: 'A supported idea helps this encounter.' };
    return { ...preview, description: `${preview.description}${item?.kind === 'binding' ? ` Binding thread adds ${Number((2 / Math.max(1, humanCount)).toFixed(2))} more battle progress.` : ''}` };
  }
  const options = expeditionInteractions(room, action.expedition?.locationId ?? room.expedition?.locationId ?? 'shop', action.targetId, action.token);
  const option = options.find(option => option.id === action.expedition?.interactionId) ?? options[0] ?? { label: 'Creative move', description: 'A supported idea helps the scene.' };
  return room.chapter === 2 && !room.expedition?.finaleChoice && !('finaleChoice' in option && option.finaleChoice)
    ? { ...option, description: `This action abstains from the beacon vote. Without a deciding Restore vote, Gemward stays dark until repairs. ${option.description} ${finaleContext(room)}` }
    : option;
}
