import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, LockKeyhole, X } from 'lucide-react';
import { CHARACTER_CLASS_PRESETS, HERO_COLORS, type CharacterClassKey, type CharacterProfile } from '../../lib/character';
import { HERO_HATS, HERO_PARTS, normalizeCustomization, ownsHat, type HeroAppearance } from '../../lib/cosmetics';
import { useAdventureStore } from '../../store/adventureStore';
import { HeroAvatar, HeroHatPreview } from './HeroAvatar';
import { CollectionWardrobe } from './Collection';
import { collectionUnlocks } from '../../lib/dropinn/collection';
import { SUPPORTER_STYLES } from '../../lib/dropinn/payments';

const labels: Record<keyof HeroAppearance, string> = { body: 'Body', eyes: 'Eyes', nose: 'Nose', mouth: 'Mouth' };

export function HeroCustomizer({ character, onClose }: { character: CharacterProfile; onClose: () => void }) {
  const [draft, setDraft] = useState(() => ({ ...character, ...normalizeCustomization(character) }));
  const [tab, setTab] = useState<'character' | 'hats'>('character');
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
      const nodes = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? []).filter(node => node.tabIndex >= 0);
      const first = nodes[0], last = nodes.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; if (root) root.inert = wasInert; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || loading) return;
    setSaving(true); setSaveError('');
    await useAdventureStore.getState().setHero(draft.name, draft.classKey, draft.accent, { appearance: draft.appearance, equipment: draft.equipment });
    const error = useAdventureStore.getState().error;
    setSaving(false);
    if (error) setSaveError(error); else onClose();
  };

  return createPortal(<div className="di-app di-customizer-backdrop">
    <div className="di-customizer" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="hero-builder-title" tabIndex={-1}>
      <header className="di-builder-heading">
        <div><p className="di-eyebrow">A small hero. Entirely yours.</p><h2 id="hero-builder-title">Meet your little weirdo.</h2></div>
        <button type="button" className="di-builder-close" aria-label="Close character builder" disabled={saving} onClick={onClose}><X size={22} /></button>
      </header>
      <form onSubmit={event => void save(event)}>
        <div className="di-builder-workspace">
          <aside className="di-builder-preview">
            <div className="di-portrait-paper"><span className="di-paper-note">Quite the adventurer.</span><HeroAvatar hero={preview} /><span className="di-paper-spark di-spark-one">✦</span><span className="di-paper-spark di-spark-two">✧</span></div>
            <h3>{draft.name.trim() || 'Wren'}</h3><p>{CHARACTER_CLASS_PRESETS[draft.classKey].label} · one of a kind</p>
            <div className="di-equipped-slot"><span className="di-slot-art">{equipped ? <HeroHatPreview hat={equipped} color={draft.accent} hatColor={draft.equipment.hatColor} hatTrim={draft.equipment.hatTrim} /> : <HeroAvatar hero={preview} decorative />}</span><div><small>HAT SLOT</small><strong>{equipped?.label ?? 'A lovely bare head'}</strong></div></div>
            <p className="di-builder-caption">Big personality. Tiny feet.<br />Looks never change your abilities or rewards.</p>
          </aside>
          <section className="di-builder-options">
            <div className="di-builder-tabs" role="tablist" aria-label="Customize your hero">
              {(['character', 'hats'] as const).map(value => <button key={value} id={`hero-tab-${value}`} role="tab" type="button" aria-selected={tab === value} aria-controls="hero-builder-panel" tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault(); const next = event.key === 'Home' ? 'character' : event.key === 'End' ? 'hats' : tab === 'character' ? 'hats' : 'character';
                  setTab(next); document.getElementById(`hero-tab-${next}`)?.focus();
                }
              }}>{value === 'character' ? 'Character' : `Hats · ${owned}/${hats.length}`}</button>)}
            </div>
            <div id="hero-builder-panel" role="tabpanel" aria-labelledby={`hero-tab-${tab}`}>
              {tab === 'character' ? <>
                <div className="di-builder-identity"><label htmlFor="builder-name">Hero name <small>optional</small></label><input id="builder-name" value={draft.name} maxLength={18} placeholder="Wren" onChange={event => setDraft({ ...draft, name: event.target.value })} />
                  <fieldset><legend>Your calling</legend><div className="di-builder-class-grid">{(Object.keys(CHARACTER_CLASS_PRESETS) as CharacterClassKey[]).map(key => <button key={key} type="button" aria-pressed={draft.classKey === key} onClick={() => setDraft({ ...draft, classKey: key })}>{CHARACTER_CLASS_PRESETS[key].label}</button>)}</div></fieldset>
                </div>
                <fieldset className="di-builder-colors"><legend>A splash of color</legend><div>{HERO_COLORS.map(color => <button type="button" key={color.value} aria-label={`${color.name} body color`} aria-pressed={draft.accent === color.value} onClick={() => setDraft({ ...draft, accent: color.value })}><span style={{ background: color.value }}>{draft.accent === color.value && <Check size={17} />}</span><small>{color.name}</small></button>)}</div></fieldset>
                {(Object.keys(HERO_PARTS) as (keyof HeroAppearance)[]).map(key => <fieldset className="di-part-picker" key={key}><legend>{labels[key]}</legend><div>{HERO_PARTS[key].map(part => <button type="button" key={part.id} aria-pressed={draft.appearance[key] === part.id} onClick={() => setDraft({ ...draft, appearance: { ...draft.appearance, [key]: part.id } })}>
                  <HeroAvatar hero={{ ...preview, appearance: { ...draft.appearance, [key]: part.id }, equipment: { hat: null } }} decorative faceOnly={key !== 'body'} /><span>{part.label}</span>
                </button>)}</div></fieldset>)}
              </> : <>
                <div className="di-wardrobe-heading"><h3>A hat for every little adventure.</h3><p>Four to start. Three with a story. Wear any hat, whatever your calling.</p></div>
                <button className="di-bare-head" type="button" aria-pressed={draft.equipment.hat === null} onClick={() => setDraft({ ...draft, equipment: { hat: null } })}>No hat {draft.equipment.hat === null ? <Check size={17} /> : <span>Unequip</span>}</button>
                <div className="di-hat-grid">{hats.map(hat => {
                  const unlocked = ownsHat(hat, character.inventory, collection);
                  const selected = draft.equipment.hat === hat.id;
                  return <button type="button" key={hat.id} disabled={!unlocked} aria-pressed={selected} className={unlocked ? '' : 'di-hat-locked'} onClick={() => setDraft({ ...draft, equipment: { hat: hat.id } })}>
                    <span className="di-hat-paper"><HeroHatPreview hat={hat} color={draft.accent} />{selected ? <Check size={18} /> : !unlocked ? <LockKeyhole size={16} /> : null}</span>
                    <strong>{hat.label}</strong><small>{selected ? 'Equipped' : unlocked ? hat.supporter ? 'Supporter · ready to wear' : hat.keepsake ? 'Earned · ready to wear' : 'Starter · ready to wear' : hat.supporter ? 'Optional supporter pack' : `Earn ${hat.keepsake} in ${hat.chapter}`}</small>
                  </button>;
                })}</div>
                {equipped?.supporter && ownsHat(equipped, character.inventory, collection) && <fieldset className="di-builder-colors"><legend>{equipped.label} palettes</legend><div>
                  <button type="button" aria-pressed={!draft.equipment.hatColor} onClick={() => setDraft({...draft,equipment:{hat:equipped.id,hatColor:null}})}>Original color</button>
                  {SUPPORTER_STYLES.filter(style => style.hat === equipped.id && collection.styles.includes(style.id)).map(style => <button key={style.id} type="button" aria-pressed={draft.equipment.hatColor===style.id} onClick={() => setDraft({...draft,equipment:{hat:equipped.id,hatColor:style.id}})}><span style={{background:style.color}}/><small>{style.label}</small></button>)}
                </div></fieldset>}
                <CollectionWardrobe hero={preview} onEquip={equipment => setDraft({ ...draft,equipment })} />
              </>}
            </div>
          </section>
        </div>
        <footer className="di-builder-footer">{saveError && <p role="alert">{saveError}</p>}<span>Made for the table. Saved for next time.</span><div><button className="di-button di-secondary" type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="di-button di-primary" type="submit" disabled={saving || loading}>{saving ? 'Saving…' : 'Save hero'} <Check size={17} /></button></div></footer>
      </form>
    </div>
  </div>, document.body);
}
