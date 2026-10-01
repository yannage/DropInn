import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, Dices, Heart, LockKeyhole, Scissors, Shield, Smile, Sparkles, Swords, Undo2, UserRound, WandSparkles, X } from 'lucide-react';
import { CHARACTER_CLASS_PRESETS, HERO_COLORS, MOONLIT_BLUE, type CharacterClassKey, type CharacterProfile } from '../../lib/character';
import { HERO_HATS, HERO_HAIR, HERO_SHOES, HERO_PARTS, normalizeCustomization, ownsHat, displayHeroName, type HeroHat } from '../../lib/cosmetics';
import { PASS_TITLES } from '../../lib/dropinn/storyPass';
import { useAdventureStore } from '../../store/adventureStore';
import { HeroAvatar, HeroHatPreview } from './HeroAvatar';
import { CollectionWardrobe } from './Collection';
import { collectionUnlocks } from '../../lib/dropinn/collection';
import type { HeroCustomizerTarget } from './HeroProgression';
import { SUPPORTER_STYLES } from '../../lib/dropinn/payments';
import { surpriseHeroLook } from '../../lib/heroDesigner';
import './hero-designer.css';

const designerTabs = [
  { id: 'character', label: 'Hero', icon: UserRound },
  { id: 'face', label: 'Face', icon: Smile },
  { id: 'hats', label: 'Wardrobe', icon: Sparkles },
] as const;
const callings = {
  wizard: { icon: WandSparkles, description: 'Clever ideas. A little magic.', strength: 'Clever & charming' },
  fighter: { icon: Swords, description: 'Big heart. Bigger courage.', strength: 'Strong & sturdy' },
  rogue: { icon: Scissors, description: 'A trick for every tight spot.', strength: 'Resourceful & nimble' },
  cleric: { icon: Heart, description: 'A little light for your friends.', strength: 'Charming & thoughtful' },
} as const;
type DesignerDraft = CharacterProfile & ReturnType<typeof normalizeCustomization>;
const identityKey = (hero: DesignerDraft) => JSON.stringify([hero.name, hero.classKey, hero.accent, hero.appearance, hero.equipment]);

export function HeroCustomizer({ character, onClose, initialTarget = {} }: { character: CharacterProfile; onClose: () => void; initialTarget?: HeroCustomizerTarget }) {
  const [original] = useState(() => ({ ...character, ...normalizeCustomization(character) }));
  const [draft, setDraft] = useState(original);
  const [history, setHistory] = useState<DesignerDraft[]>([]);
  const [tab, setTab] = useState<(typeof designerTabs)[number]['id']>(initialTarget.tab ?? 'character');
  const [facePart, setFacePart] = useState<'hair' | 'eyes' | 'nose' | 'mouth'>('eyes');
  const [lookBeat, setLookBeat] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const savingRef = useRef(saving);
  savingRef.current = saving;
  const loading = useAdventureStore(state => state.loading);
  const collection = collectionUnlocks(useAdventureStore(state => state.collection));
  const payments = useAdventureStore(state => state.account?.payments);
  const showSupporter = payments?.environment === 'production' || new URLSearchParams(location.search).get('payments') === 'sandbox' || location.pathname === '/checkout';
  const hats = HERO_HATS.filter(hat => !hat.supporter || showSupporter || ownsHat(hat, character.inventory, collection));
  const preview = { ...draft, inventory: character.inventory, cosmeticUnlocks: collection };
  const equipped = HERO_HATS.find(hat => hat.id === draft.equipment.hat);
  const owned = hats.filter(hat => ownsHat(hat, character.inventory, collection)).length;
  const changed = identityKey(draft) !== identityKey(original);
  const changeDraft = (next: DesignerDraft, message = '') => {
    if (saving || identityKey(next) === identityKey(draft)) return;
    setHistory(previous => [...previous.slice(-19), draft]);
    setDraft(next);
    setSaveError('');
    if (next.accent !== draft.accent || next.appearance !== draft.appearance || next.equipment !== draft.equipment) setLookBeat(value => value + 1);
    setAnnouncement(message);
  };
  const undo = () => {
    const previous = history.at(-1);
    if (!previous || saving) return;
    setDraft(previous);
    setHistory(history.slice(0, -1));
    setLookBeat(value => value + 1);
    setAnnouncement('Last change undone.');
    setSaveError('');
  };

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!savingRef.current) closeRef.current(); }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary, a[href], [tabindex="0"]') ?? []).filter(node => node.tabIndex >= 0 && node.getClientRects().length > 0);
      const first = nodes[0], last = nodes.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      if (root) root.inert = wasInert;
      document.removeEventListener('keydown', keydown);
      if (previous?.isConnected) previous.focus();
      else document.querySelector<HTMLButtonElement>('.di-arrival-hero button')?.focus();
    };
  }, []);

  useEffect(() => {
    const panel = dialog.current?.querySelector('#hero-builder-panel');
    if (panel) panel.scrollTop = 0;
  }, [tab]);

  useEffect(() => {
    const target = initialTarget.styleId ?? initialTarget.hatId;
    if (tab !== 'hats' || !target) return;
    const frame = requestAnimationFrame(() => {
      const element = Array.from(dialog.current?.querySelectorAll<HTMLElement>('[data-cosmetic-id]') ?? []).find(node => node.dataset.cosmeticId === target);
      element?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab, initialTarget.styleId, initialTarget.hatId]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || loading) return;
    setSaving(true); setSaveError('');
    try {
      await useAdventureStore.getState().setHero(draft.name, draft.classKey, draft.accent, { appearance: draft.appearance, equipment: draft.equipment });
      const { error, saveStatus, saveError: storageError } = useAdventureStore.getState();
      if (error || saveStatus === 'failed') setSaveError(error || storageError || 'Your hero could not be saved. Please try again.');
      else onClose();
    } catch {
      setSaveError('Your hero could not be saved. Your changes are still here — try again.');
    } finally { setSaving(false); }
  };

  const hatChoice = (hat: HeroHat) => {
    const unlocked = ownsHat(hat, character.inventory, collection);
    const selected = draft.equipment.hat === hat.id;
    return <button type="button" key={hat.id} disabled={!unlocked} aria-pressed={selected} data-cosmetic-id={hat.id} className={`${unlocked ? '' : 'di-hat-locked'} ${initialTarget.hatId === hat.id && !initialTarget.styleId ? 'di-cosmetic-highlight' : ''}`} onClick={() => { if (!selected) changeDraft({ ...draft, equipment: { ...draft.equipment, hat: hat.id, hatColor: null, hatTrim: null } }); }}>
      <span className="di-hat-paper"><HeroHatPreview hat={hat} color={draft.accent} />{selected ? <Check size={18} aria-hidden="true" /> : !unlocked ? <LockKeyhole size={16} aria-hidden="true" /> : null}</span>
      <strong>{hat.label}</strong><small>{selected ? 'Trying on' : unlocked ? hat.keepsake || hat.supporter ? 'Yours · ready to wear' : 'Starter · ready to wear' : hat.supporter ? 'Optional supporter pack' : `Earn ${hat.keepsake} in ${hat.chapter}`}</small>
    </button>;
  };

  return createPortal(<div className="di-app di-customizer-backdrop">
    <div className="di-customizer di-designer" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="hero-builder-title" tabIndex={-1}>
      <header className="di-builder-heading">
        <div><p className="di-eyebrow"><Sparkles size={13} aria-hidden="true" /> THE INN’S DRESSING ROOM</p><h2 id="hero-builder-title">A little hero. A lot of you.</h2></div>
        <button type="button" className="di-builder-close" aria-label="Close character builder" disabled={saving} onClick={onClose}><X size={22} /></button>
      </header>
      <form onSubmit={event => void save(event)}>
        <div className="di-builder-workspace">
          <aside className="di-builder-preview">
            <div className="di-portrait-paper"><span className="di-paper-note">Looking like an adventure.</span><div className={`di-designer-model ${lookBeat ? 'has-changed' : ''}`} key={lookBeat}><HeroAvatar hero={preview} /></div><span className="di-paper-spark di-spark-one" aria-hidden="true">✦</span><span className="di-paper-spark di-spark-two" aria-hidden="true">✧</span><span className="di-designer-stage" aria-hidden="true" /></div>
            <div className="di-designer-identity"><span className="di-designer-sticker">ONE OF A KIND</span><h3>{displayHeroName({ ...draft, name: draft.name.trim() || 'Wren' })}</h3><p>{CHARACTER_CLASS_PRESETS[draft.classKey].label} · {equipped?.label ?? 'a lovely bare head'}</p></div>
            <div className="di-designer-play"><button type="button" className="di-surprise-look" disabled={saving} onClick={() => changeDraft({ ...draft, ...surpriseHeroLook(preview, collection) }, 'A fresh look! Keep it, tweak it, or undo.')}><Dices size={19} aria-hidden="true" /> Surprise me</button><button className="di-designer-undo" type="button" disabled={!history.length || saving} onClick={undo} aria-label="Undo last change" title="Undo last change"><Undo2 size={18} aria-hidden="true" /></button></div>
            <p className="di-builder-caption">Mix, match, make a little mischief.<br />Your look is just for fun. Your calling sets your abilities.</p>
          </aside>
          <fieldset className="di-builder-options" disabled={saving}>
            <legend className="di-sr-only">Hero designer controls</legend>
            <div className="di-builder-tabs" role="tablist" aria-label="Customize your hero">
              {designerTabs.map(({ id: value, label, icon: Icon }) => <button key={value} id={`hero-tab-${value}`} role="tab" type="button" aria-selected={tab === value} aria-controls="hero-builder-panel" tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault(); const index = designerTabs.findIndex(item => item.id === tab); const next = event.key === 'Home' ? 'character' : event.key === 'End' ? 'hats' : designerTabs[(index + (event.key === 'ArrowRight' ? 1 : 2)) % designerTabs.length].id;
                  setTab(next); document.getElementById(`hero-tab-${next}`)?.focus();
                }
              }}><Icon size={17} aria-hidden="true" />{label}</button>)}
            </div>
            <div id="hero-builder-panel" role="tabpanel" aria-labelledby={`hero-tab-${tab}`}>
              {tab === 'character' ? <>
                <div className="di-designer-section-intro"><h3>Every adventure needs a hero.</h3><p>What should we call you?</p></div>
                <div className="di-builder-identity"><label htmlFor="builder-name">Hero name <small>optional</small></label><input id="builder-name" value={draft.name} maxLength={18} placeholder="Wren" autoComplete="off" onChange={event => changeDraft({ ...draft, name: event.target.value })} />
                  <fieldset><legend>Your calling</legend><div className="di-builder-class-grid">{(Object.keys(CHARACTER_CLASS_PRESETS) as CharacterClassKey[]).map(key => { const Icon = callings[key].icon; return <button key={key} type="button" aria-label={CHARACTER_CLASS_PRESETS[key].label} aria-pressed={draft.classKey === key} onClick={() => changeDraft({ ...draft, classKey: key })}><Icon size={23} aria-hidden="true" /><strong>{CHARACTER_CLASS_PRESETS[key].label}</strong><small>{callings[key].description}</small>{draft.classKey === key && <Check className="di-designer-picked" size={15} aria-hidden="true" />}</button>; })}</div><p className="di-calling-detail"><Shield size={14} aria-hidden="true" />{CHARACTER_CLASS_PRESETS[draft.classKey].hp} health · {callings[draft.classKey].strength}<span>Change your calling between adventures.</span></p></fieldset>
                </div>
                <fieldset className="di-builder-colors"><legend>A splash of color</legend><div>{[...HERO_COLORS,MOONLIT_BLUE].map(color => {const unlocked=color.value!==MOONLIT_BLUE.value || collection.items?.includes('color:moonlit-blue');return <button type="button" key={color.value} disabled={!unlocked} aria-label={`${color.name} body color${unlocked?'':' locked'}`} aria-pressed={draft.accent === color.value} onClick={() => changeDraft({ ...draft, accent: color.value })}><span style={{ background: color.value }}>{draft.accent === color.value && <Check size={17} />}</span><small>{color.name}{!unlocked?' · Story Pass':''}</small></button>;})}</div></fieldset>
                <fieldset className="di-part-picker di-body-picker"><legend>A little shape of your own</legend><div>{HERO_PARTS.body.map(part => <button type="button" key={part.id} aria-pressed={draft.appearance.body === part.id} onClick={() => changeDraft({ ...draft, appearance: { ...draft.appearance, body: part.id } })}><HeroAvatar hero={{ ...preview, appearance: { ...draft.appearance, body: part.id } }} decorative /><span>{part.label}</span>{draft.appearance.body === part.id && <Check className="di-designer-picked" size={15} aria-hidden="true" />}</button>)}</div></fieldset>
              </> : tab === 'face' ? <>
                <div className="di-designer-section-intro"><h3>A face full of personality.</h3><p>A crooked grin? A suspicious squint? Very you.</p></div>
                <div className="di-face-categories" role="group" aria-label="Face features">{(['hair', 'eyes', 'nose', 'mouth'] as const).map(part => <button type="button" key={part} aria-pressed={facePart === part} onClick={() => setFacePart(part)}>{part[0].toUpperCase() + part.slice(1)}</button>)}</div>
                <fieldset className="di-part-picker di-face-picker"><legend>{facePart === 'hair' ? 'Top it off' : facePart === 'eyes' ? 'The eyes have it' : facePart === 'nose' ? 'Follow your nose' : 'Say it with a smile'}</legend><div>
                  {facePart === 'hair' && <button type="button" aria-pressed={!draft.appearance.hair} onClick={() => changeDraft({ ...draft, appearance: { ...draft.appearance, hair: null } })}><HeroAvatar hero={{ ...preview, appearance: { ...draft.appearance, hair: null }, equipment: { ...draft.equipment, hat: null } }} decorative /><span>No hair</span>{!draft.appearance.hair && <Check className="di-designer-picked" size={15} aria-hidden="true" />}</button>}
                  {(facePart === 'hair' ? HERO_HAIR : HERO_PARTS[facePart]).map(part => {
                    const unlocked = !part.unlockId || collection.items?.includes(part.unlockId);
                    const selected = draft.appearance[facePart] === part.id;
                    return <button key={part.id} type="button" disabled={!unlocked} aria-pressed={selected} onClick={() => changeDraft({ ...draft, appearance: { ...draft.appearance, [facePart]: part.id } })}><HeroAvatar hero={{ ...preview, appearance: { ...draft.appearance, [facePart]: part.id }, equipment: { ...draft.equipment, hat: null } }} decorative faceOnly={facePart !== 'hair'} /><span>{part.label}{!unlocked && <small>Story Pass</small>}</span>{selected ? <Check className="di-designer-picked" size={15} aria-hidden="true" /> : !unlocked ? <LockKeyhole className="di-designer-picked" size={14} aria-hidden="true" /> : null}</button>;
                  })}
                </div></fieldset>
                <p className="di-designer-tip">{facePart === 'hair' && equipped ? 'Hats can cover your hair. Take yours off in Wardrobe for the full reveal.' : 'Try a few on. Your hero changes as you choose.'}</p>
              </> : <>
                <div className="di-wardrobe-heading"><h3>The finishing touches.</h3><p>{owned} hats ready to wear. Every calling welcome.</p></div>
                <button className="di-bare-head" type="button" aria-pressed={draft.equipment.hat === null} onClick={() => changeDraft({ ...draft, equipment: { ...draft.equipment,hat: null,hatColor:null,hatTrim:null } })}>No hat {draft.equipment.hat === null ? <Check size={17} /> : <span>Unequip</span>}</button>
                <div className="di-hat-grid">{hats.filter(hat => ownsHat(hat, character.inventory, collection)).map(hatChoice)}</div>
                {equipped?.supporter && ownsHat(equipped, character.inventory, collection) && <fieldset className="di-builder-colors"><legend>{equipped.label} palettes</legend><div>
                  <button type="button" aria-pressed={!draft.equipment.hatColor} onClick={() => changeDraft({...draft,equipment:{...draft.equipment,hat:equipped.id,hatColor:null}})}>Original color</button>
                  {SUPPORTER_STYLES.filter(style => style.hat === equipped.id && collection.styles.includes(style.id)).map(style => <button key={style.id} type="button" aria-pressed={draft.equipment.hatColor===style.id} onClick={() => changeDraft({...draft,equipment:{...draft.equipment,hat:equipped.id,hatColor:style.id}})}><span style={{background:style.color}}/><small>{style.label}</small></button>)}
                </div></fieldset>}
                {owned < hats.length && <details className="di-designer-disclosure" open={!!initialTarget.hatId && !ownsHat(hats.find(hat => hat.id === initialTarget.hatId) ?? HERO_HATS[0], character.inventory, collection)}><summary>{hats.length - owned} more hats to discover</summary><div className="di-hat-grid">{hats.filter(hat => !ownsHat(hat, character.inventory, collection)).map(hatChoice)}</div></details>}
                <details className="di-designer-disclosure" open={!!initialTarget.styleId}><summary>Make something special with Thread</summary><CollectionWardrobe highlightStyleId={initialTarget.styleId} hero={preview} onEquip={equipment => changeDraft({ ...draft,equipment })} /></details>
                <fieldset className="di-part-picker"><legend>Shoes</legend><div><button type="button" aria-pressed={!draft.equipment.shoes} onClick={()=>changeDraft({...draft,equipment:{...draft.equipment,shoes:null,shoeColor:null}})}>Classic boots</button>{HERO_SHOES.map(part=>{const unlocked=!!part.unlockId&&collection.items?.includes(part.unlockId);return <button type="button" key={part.id} disabled={!unlocked} aria-pressed={draft.equipment.shoes===part.id} onClick={()=>changeDraft({...draft,equipment:{...draft.equipment,shoes:part.id,shoeColor:null}})}><HeroAvatar hero={{...preview,equipment:{...draft.equipment,shoes:part.id}}} decorative/><span>{part.label}{!unlocked?' · Story Pass':''}</span></button>;})}</div></fieldset>
                {draft.equipment.shoes==='ruby' && collection.items?.includes('shoes:ruby-sparkle') && <fieldset className="di-builder-colors"><legend>Sparkling Ruby Shoes colors</legend><div><button type="button" onClick={()=>changeDraft({...draft,equipment:{...draft.equipment,shoeColor:null}})}>Original red</button>{HERO_COLORS.map(color=><button type="button" key={color.value} aria-pressed={draft.equipment.shoeColor===color.value} onClick={()=>changeDraft({...draft,equipment:{...draft.equipment,shoeColor:color.value}})}><span style={{background:color.value}}/><small>{color.name}</small></button>)}</div></fieldset>}
                <fieldset className="di-part-picker"><legend>Title</legend><div><button type="button" aria-pressed={!draft.equipment.title} onClick={()=>changeDraft({...draft,equipment:{...draft.equipment,title:null}})}>No title</button>{PASS_TITLES.map(title=><button type="button" key={title.id} disabled={!collection.items?.includes(`title:${title.id}`)} aria-pressed={draft.equipment.title===title.id} onClick={()=>changeDraft({...draft,equipment:{...draft.equipment,title:title.id}})}>{title.label}{!collection.items?.includes(`title:${title.id}`)?' · Story Pass':''}</button>)}</div></fieldset>
                {collection.items?.includes('frame:inn-border') && <fieldset className="di-builder-colors"><legend>Avatar border</legend><div><button type="button" onClick={()=>changeDraft({...draft,equipment:{...draft.equipment,frame:null,frameColor:null}})}>No border</button>{HERO_COLORS.map(color=><button type="button" key={color.value} aria-pressed={draft.equipment.frame==='inn-border'&&draft.equipment.frameColor===color.value} onClick={()=>changeDraft({...draft,equipment:{...draft.equipment,frame:'inn-border',frameColor:color.value}})}><span style={{background:color.value}}/><small>{color.name}</small></button>)}</div></fieldset>}
              </>}
            </div>
          </fieldset>
        </div>
        <footer className="di-builder-footer">{saveError && <p role="alert">{saveError}</p>}<span className="di-designer-save-state" role="status">{saving ? 'Saving your little legend…' : changed ? 'A fresh look. Save to keep it.' : 'Try anything. Make it yours.'}</span><div><button className="di-button di-secondary" type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="di-button di-primary" type="submit" disabled={saving || loading}>{saving ? 'Saving…' : 'Save hero'} <Check size={17} aria-hidden="true" /></button></div></footer>
        <span className="di-sr-only" role="status" aria-live="polite">{announcement}</span>
      </form>
    </div>
  </div>, document.body);
}
