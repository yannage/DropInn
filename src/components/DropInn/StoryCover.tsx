import { SceneArt } from './SceneArt';

/** Reuse the actual tabletop cast so the story's cover matches the game. */
export function StoryCover({ adventureId, scene }: { adventureId: string; scene: string }) {
  if (adventureId !== 'mosswater') return <SceneArt scene={scene} />;
  return <div className="di-story-cover">
    <SceneArt scene="stage-village" />
    <img className="di-story-cover-piece di-story-cover-well" src="/art/mosswater-well.webp" alt="" width={256} height={256} draggable={false} onError={event => { event.currentTarget.hidden = true; }} />
    <img className="di-story-cover-piece di-story-cover-mossback" src="/art/mosswater-mossback.webp" alt="" width={256} height={256} draggable={false} onError={event => { event.currentTarget.hidden = true; }} />
  </div>;
}
