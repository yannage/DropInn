// Explicit build-time authoring helper. Runtime never reads Markdown or executes player prose.
import { readFile, writeFile } from 'node:fs/promises';
const configs = [
  { file: 'the-last-flight-of-the-teacup', id: 'last-flight-teacup', art: 'teacup', enemy: 'teacup-gull',
    pitch: 'Rescue a runaway postal airship. Choose what to bring home.',
    keepsakes: ['A knotted boarding cord', 'A little brass feather', 'Pella’s dented brass badge'],
    endings: [
      ['The boarding line holds and everyone reaches the deck with the parcels intact.', 'Everyone reaches the deck, but loose parcels tumble into the clouds.', 'The dock net catches the rescuers and is hauled aboard; the last mooring is lost.'],
      ['The kettle glows and the ship steadies. Pella opens both escape routes.', 'The engine coughs, but the crew prepares both routes.', 'The engine gives one last burst. Pella points to the vent and the lifeboat: both can save everyone.'],
      ['Everyone reaches the dock safely. Pella opens a shared rescue service.', 'Everyone reaches the dock; neighbors gather the scattered parcels.', 'The guests land in the emergency nets. Neighbors build a temporary shelter.'],
    ],
    bridges: ['The lifeboat diagram shows a detachable sail canopy; a marked seam is the emergency vent.', 'The vent tears the festival sail to save the ship. The lifeboat salvages the sail but leaves the ship behind.', 'Pella hangs a new sign: People first. Parcels when possible.'],
    branch: { prompt: 'What will you bring home?', fallback: 'lifeboat', fallbackText: 'Tie or no choice: take the lifeboat. Everyone and the sail return; the ship is lost.', options: [
      { id: 'vent', targetId: 'teacup-return-valve', label: 'Save the ship', consequence: 'Tear the festival sail to descend. Everyone returns; the sail is lost.' },
      { id: 'lifeboat', targetId: 'teacup-return-boat', label: 'Save the sail', consequence: 'Salvage it as the lifeboat canopy. Everyone returns; the ship is lost.' },
    ] },
    branchEndings: { vent: 'The torn sail hangs from the battered airship; its cloth cannot be restored. The crew shares what remains.', lifeboat: 'The airship is gone. Its salvaged sail roofs a new ferry shelter at the dock.' },
  },
  { file: 'the-inn-that-misplaced-tomorrow', id: 'inn-misplaced-tomorrow', art: 'tomorrow',
    pitch: 'Find the missing dawn inside an inn stuck at breakfast.',
    keepsakes: ['A marked toast crumb', 'A tiny dawn jar', 'A mismatched breakfast spoon'],
    endings: [
      ['The clock opens. Brindle admits asking his helper to make the perfect morning last.', 'Burnt toast reveals the workshop door behind the clock.', 'The clock coughs its door open and ejects Brindle’s note.'],
      ['Tock gladly offers the dawn chime. Both sustaining patterns are exposed.', 'The party catches the glowing jar as its shelf collapses.', 'Tock delivers the jar before the collection can shatter.'],
      ['Sunlight moves over a warm, uneven breakfast. Brindle pulls up a chair for Tock.', 'Morning returns amid burnt toast. Neighbors bring food to share.', 'The clock stops working, but ordinary sunrise returns. Brindle fetches a hand bell.'],
    ],
    bridges: ['The note reads: make this morning last. The helper has followed it literally.', 'Two cables bind the chime: the perfect recipe or Tock’s breakfast memory must be spent to free it.', 'The spoon falls. This time, someone picks it up.'],
    branch: { prompt: 'What will you let go?', fallback: 'recipe', fallbackText: 'Tie or no choice: unwind the recipe and preserve Tock’s memories.', options: [
      { id: 'recipe', targetId: 'tomorrow-return-recipe', label: 'Keep the memories', consequence: 'Unwind the perfect recipe. Tock remembers; breakfast becomes an experiment.' },
      { id: 'memory', targetId: 'tomorrow-return-memory', label: 'Keep the recipe', consequence: 'Spend only Tock’s learned breakfast routine. Help it relearn; its identity and friendships remain.' },
    ] },
    branchEndings: { recipe: 'The recipe cylinder is blank. Tock remembers each shared morning, and everyone helps invent the next.', memory: 'The recipe survives. Tock’s breakfast spool is empty; Brindle sits beside it to teach the routine again.' },
  },
  { file: 'the-orchard-that-walked-away', id: 'orchard-walked-away', art: 'orchard', enemy: 'orchard-bramble',
    pitch: 'Follow a wandering orchard and share the water it needs.',
    keepsakes: ['A painted root marker', 'A woven root bracelet', 'A carved apple seed'],
    endings: [
      ['The party reaches the trees with a steady harvest ladder.', 'The trees are found beyond a trail of spilled fruit.', 'The trees pause at a low bank, creating a safe climb without the ladder.'],
      ['The child is safe, the guardian calms and both water routes are clear.', 'Everyone reaches the bank, though the bramble guardian remains wary.', 'Elder Apple kneels to release the child. A burst sluice exposes both channels.'],
      ['The trees settle beside flowing water and the shared harvest begins.', 'The nearer trees settle. Villagers arrange watering for those further away.', 'The trees settle at the public riverside; villagers carry baskets along a new path.'],
    ],
    bridges: ['Dust coats the roots. Nella’s old map shows a stream where the soil is now dry.', 'The child is safe. The ornamental mill diverts the stream: open the orchard wall or retire the decorative wheel.', 'The baskets return. This year, everyone knows who watered the trees.'],
    branch: { prompt: 'Make room for the water', fallback: 'spillway', fallbackText: 'Tie or no choice: open a small, reversible spillway through the wall.', options: [
      { id: 'wall', targetId: 'orchard-return-wall', label: 'Share the grove', consequence: 'Open the orchard wall into a public water corridor. The mill keeps turning.' },
      { id: 'wheel', targetId: 'orchard-return-wheel', label: 'Retire the mill', consequence: 'Stop the ornamental wheel and restore its channel. The sheltered orchard remains.' },
    ] },
    branchEndings: { wall: 'The orchard wall is open to a shared water corridor. The ornamental mill still turns.', wheel: 'The decorative wheel stands still beside a new gathering space. Water reaches the sheltered orchard.', spillway: 'A small spillway waters the roots. Most of the wall remains, ready for a later community decision.' },
  },
];
const strip = text => text.replace(/\*\*/g, '').trim();
const artwork = {
  teacup: ['story-rope','story-pella','story-parcels','herd-gathered','story-kettle','story-sail','story-gull','boat-afloat','story-kettle','boat-afloat','herd-gathered','story-lantern'],
  tomorrow: ['story-spoon','story-brindle','story-clock','story-toast','story-jar','story-tock','story-cylinder','story-spool','story-cylinder','story-spool','story-clock','story-breakfast'],
  orchard: ['story-roots','story-nella','gate','story-ladder','story-treehouse','story-appletree','story-sluice','story-bramble','story-wall','story-mill','story-appletree','story-baskets'],
};
const closing = {
  teacup: { vent: { artKey:'story-sail-torn', caption:'A torn sail. A rescued crew. A new purpose.' }, lifeboat:{ artKey:'story-sail', caption:'The ship is gone. Its sail shelters the next rescue.' } },
  tomorrow: { recipe:{ artKey:'story-cylinder-blank',caption:'The recipe is gone. Tomorrow is yours to invent.' }, memory:{ artKey:'story-spool-empty',caption:'An empty breakfast spool. A friend ready to teach.' } },
  orchard: { wall:{artKey:'story-wall-open',caption:'An open grove. Water and harvest shared.'}, wheel:{artKey:'story-mill',caption:'The wheel rests. The orchard drinks again.'}, spillway:{artKey:'story-sluice',caption:'A little spillway. A community deciding what comes next.'} },
};
const adventures = [];
for (const config of configs) {
  const source = await readFile(`docs/stories/${config.file}.md`, 'utf8');
  const sections = source.split(/^## Chapter /m).slice(1);
  const chapters = sections.map((section, index) => {
    const title = section.split('\n')[0].replace(/^\d+ — /, '').trim();
    const targets = [...section.matchAll(/^\| `([^`]+)` \/ ([^|]+)\| ([^|]+)\| ([^|]+)\|/gm)].map(([, id, name, actions, developed], targetIndex) => {
      const tokens = [...actions.matchAll(/(Fight|Influence|Investigate|Help):/g)].map(match => ({ Fight: 'fight', Influence: 'influence', Investigate: 'investigate', Help: 'assist' })[match[1]]);
      const artKey = artwork[config.art][index * 4 + targetIndex];
      return { id, name: name.trim(), artKey, description: actions.trim(), tokens, effects: ['cover','distract','reveal','rescue'],
        development: { name: name.trim(), artKey: artKey === 'story-clock' ? 'story-clock-open' : artKey === 'gate' ? 'gate-sheltered' : artKey, description: developed.trim(), tokens: tokens.filter(token => token !== 'fight').includes('assist') ? tokens.filter(token => token !== 'fight') : ['investigate','assist'] } };
    });
    if (targets.length !== 4) throw new Error(`Expected four targets in ${config.id}/${index}`);
    const objective = strip(section.match(/Arrival: \*\*“([^”]+)”\*\*/)[1]);
    const catchUp = section.match(/Catch-up: “([^”]+)”/)[1];
    const intro = index === 0 ? `${config.pitch} ${catchUp}` : catchUp;
    return { id: section.match(/ID: `([^`]+)`/)[1], title, location: title, intro, catchUp, objective,
      art: config.art, firstTarget: targets[0].id, targets, progressGoal: [24,26,30][index], combat: index === 1 && !!config.enemy,
      ...(index === 1 && config.enemy ? { enemySource: config.enemy } : {}),
      threat: config.enemy && index === 1 ? `${config.enemy === 'teacup-gull' ? 'The brass gull dives at the exposed crew' : 'The bramble guardian lashes toward an exposed hero'}. Protect or interrupt the announced strike.` : ['The way forward is slipping out of reach.', 'The situation tightens while the party works.', 'The final opportunity is closing.'][index],
      keepsake: config.keepsakes[index], endings: Object.fromEntries(['success','mixed','setback'].map((kind,i) => [kind, `${config.endings[index][i]} ${config.bridges[index]}`])),
      ...(index === 2 ? { branch: config.branch } : {}),
    };
  });
  adventures.push({ id: config.id, version: 1, title: source.match(/^# (.+)/)[1], pitch: config.pitch, chapters, branchEndings: config.branchEndings, closing: closing[config.art] });
}
const destination = 'src/lib/dropinn/adventures.ts';
const generated = `// Generated by scripts/build-story-data.mjs from reviewed story packets and explicit runtime policy.\nimport type { AdventureDefinition } from './registry';\nexport const NEW_ADVENTURES: AdventureDefinition[] = ${JSON.stringify(adventures, null, 2)};\n`;
const previous = await readFile(destination, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
// Avoid invalidating Vite's shared store imports when authoring output has not changed.
if (previous !== generated) { await writeFile(destination, generated); console.log('Rebuilt story definitions. Restart Vite before browser verification.'); }
else console.log('Story definitions unchanged.');
