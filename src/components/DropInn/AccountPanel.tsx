import { useEffect, useId, useState } from 'react';
import { Cloud, UserRound } from 'lucide-react';
import { useAdventureStore } from '../../store/adventureStore';
import { localPlay } from '../../lib/dropinn/api';
import { googleSignIn, sendEmailCode, verifyEmailCode, hasGuestRecovery, returnToGuest } from '../../lib/supabase/accountAuth';
import { getErrorMessage } from '../../lib/errors';
import { SceneDrawer } from './SceneAdventure';
import { HeroAvatar } from './HeroAvatar';
import { CHARACTER_CLASS_PRESETS } from '../../lib/character';
import './account.css';

export function SaveStatus() {
  const {saveStatus,saveError}=useAdventureStore();
  const text={browser:'Saved in this browser',guest:'Guest — link an account to recover',cloud:'Saved to account',saving:'Saving…',failed:'Save failed — retry'}[saveStatus];
  return <div className="di-save-status" role="status"><Cloud size={15}/><span>{text}{saveError && <small>{saveError}</small>}</span></div>;
}
export function AccountPanel() {
  const state=useAdventureStore();
  const [open,setOpen]=useState(false);
  const [existing,setExisting]=useState(false);
  const [email,setEmail]=useState('');
  const [code,setCode]=useState('');
  const [codeType,setCodeType]=useState<'email'|'email_change'|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sentAt,setSentAt]=useState(0);
  const [time,setTime]=useState(Date.now());
  const uid=useId();
  const locked=!!(state.room || state.restoringCode || state.pendingMove || state.loading || busy);
  const guest=!state.account || state.account.guest;
  useEffect(()=>{
    const show=()=>setOpen(true);window.addEventListener('dropinn-open-account',show);
    const params=new URLSearchParams(location.hash.slice(1));
    const callbackError=params.get('error_description');
    if(callbackError){setError(callbackError.slice(0,220));setOpen(true);history.replaceState(null,'',location.pathname+location.search);}
    return ()=>window.removeEventListener('dropinn-open-account',show);
  },[]);
  useEffect(()=>{if(!sentAt)return;const timer=setInterval(()=>setTime(Date.now()),1000);return()=>clearInterval(timer);},[sentAt]);
  const run=async(action:()=>Promise<unknown>)=>{
    setBusy(true);setError('');
    try{await action();}catch(e){setError(getErrorMessage(e,'Sign-in did not finish. Please retry.'));}finally{setBusy(false);}
  };
  const send=()=>run(async()=>{setCodeType(await sendEmailCode(email,existing));setSentAt(Date.now());setTime(Date.now());});
  const exportDesign=()=>{
    const h=state.character;if(!h)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify({name:h.name,classKey:h.classKey,accent:h.accent,appearance:h.appearance,equipment:h.equipment},null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='dropinn-hero-design.json';a.click();URL.revokeObjectURL(url);
  };
  return <div className="di-account-entry">
    <SaveStatus/>
    <button className="di-button di-secondary di-full" onClick={()=>setOpen(true)}><UserRound size={17}/>{guest?'Save your hero':'Your account & heroes'}</button>
    {open && <SceneDrawer title="Your hero, wherever you drop in" presentation="dialog" onClose={()=>setOpen(false)}>
      <div className="di-account-panel">
        <SaveStatus/>
        <p>One recoverable hero is free. Your adventures and earned keepsakes stay yours.</p>
        {localPlay ? <><p>This preview saves on this browser and address. Different preview ports have separate heroes. Account sign-in is available in the online game once configured.</p><a className="di-button di-primary" href="https://dropp-in.netlify.app/" target="_blank" rel="noreferrer">Open the online inn</a></> : <>
          {locked && <p>Finish or leave your visit before changing accounts or heroes.</p>}
          {guest ? <>
            <label className="di-account-existing"><input type="checkbox" checked={existing} disabled={locked || !!codeType} onChange={e=>setExisting(e.target.checked)}/> I already have a DropInn account</label>
            <button className="di-button di-secondary di-full" disabled={locked || !state.account?.providers.google} onClick={()=>void run(()=>googleSignIn(existing))}>{existing?'Sign in':'Continue'} with Google</button>
            {!state.account?.providers.google && <small>Google sign-in is not configured on this host yet.</small>}
            <form onSubmit={e=>{e.preventDefault();void (codeType?run(async()=>{await verifyEmailCode(email,code,codeType);setCodeType(null);setCode('');await state.refreshAccount();}):send());}}>
              <label htmlFor={`${uid}-email`}>Email address</label><input id={`${uid}-email`} type="email" autoComplete="email" value={email} disabled={locked || !!codeType} required onChange={e=>setEmail(e.target.value)}/>
              {codeType && <><label htmlFor={`${uid}-code`}>Six-digit login code</label><input id={`${uid}-code`} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/><p>Check your email. Enter the code here to keep this hero.</p></>}
              <button className="di-button di-primary di-full" disabled={locked || !state.account?.providers.email}>{busy?'Working…':codeType?'Verify code':existing?'Email me a login code':'Save with an email code'}</button>
              {codeType && <div className="di-account-code-actions"><button type="button" disabled={locked || time-sentAt<60_000} onClick={()=>void send()}>Resend code{time-sentAt<60_000?` (${Math.ceil((60_000-time+sentAt)/1000)}s)`:''}</button><button type="button" disabled={locked} onClick={()=>{setCodeType(null);setCode('');}}>Change email</button></div>}
            </form>
            {!state.account?.providers.email && <small>Email sign-in is awaiting verified email delivery on this host.</small>}
          </> : <>
            <p>Signed in{state.account?.email?` as ${state.account.email}`:''}. Connected: {state.account?.identities.join(', ') || 'verified account'}.</p>
            {state.account?.providers.google && !state.account.identities.includes('google') && <button className="di-button di-secondary" disabled={locked} onClick={()=>void run(()=>googleSignIn(false))}>Connect Google to this account</button>}
            <fieldset><legend>Your saved heroes</legend>{state.account?.heroes.map(({character})=><button className="di-account-hero" key={character.id} disabled={locked} aria-pressed={state.character?.id===character.id} onClick={()=>void run(()=>state.selectHero(character.id))}>
              <HeroAvatar hero={character} decorative/><span><strong>{character.name}</strong><small>{CHARACTER_CLASS_PRESETS[character.classKey].label} · {character.xp} XP{state.character?.id===character.id?' · Selected':''}</small></span>
            </button>)}</fieldset>
            {(state.account?.heroes.length ?? 0)>1 && <p>Recovered heroes are preserved. Choose your hero between visits.</p>}
            <button className="di-button di-secondary" disabled={locked} onClick={()=>void run(()=>state.signOut())}>Sign out on this browser</button>
          </>}
        </>}
        <hr/><button className="di-button di-secondary" onClick={exportDesign}>Download hero design</button>
        <p className="di-fine">A design file copies appearance and calling. Account progress and earned unlocks remain on the server.</p>
        {!localPlay && <label className="di-account-import">Import a design onto your selected hero<input type="file" accept="application/json,.json" disabled={locked} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;void run(async()=>{if(file.size>10000)throw new Error('Choose a small DropInn hero design file.');const d=JSON.parse(await file.text());if(!Object.prototype.hasOwnProperty.call(CHARACTER_CLASS_PRESETS,d.classKey)||typeof d.name!=='string')throw new Error('Choose a valid hero design.');await state.setHero(d.name,d.classKey,d.accent,{appearance:d.appearance,equipment:d.equipment});});}}/></label>}
        {hasGuestRecovery() && <button className="di-button di-secondary" disabled={locked} onClick={()=>void run(async()=>{await returnToGuest();await state.refreshAccount();setCodeType(null);})}>Return to my guest hero</button>}
        {!localPlay && <button className="di-text-button" disabled={locked} onClick={()=>void run(()=>state.refreshAccount())}>Retry account sync</button>}
        {(error || state.saveError || state.error) && <p role="alert">{error || state.saveError || state.error}</p>}
      </div>
    </SceneDrawer>}
  </div>;
}

