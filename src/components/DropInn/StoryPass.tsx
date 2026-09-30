import { useEffect, useRef, useState } from 'react';
import { adventureRequest } from '../../lib/dropinn/api';
import { closeCheckout, openCheckout } from '../../lib/dropinn/checkout';
import type { Purchase } from '../../lib/dropinn/payments';
import { PASS_FREE_HATS, PASS_REWARDS, STORY_PASS, storyPassProgress } from '../../lib/dropinn/storyPass';
import { ADVENTURES } from '../../lib/dropinn/registry';
import { HeroAvatar } from './HeroAvatar';
import { useAdventureStore } from '../../store/adventureStore';
import './story-pass.css';

const productLabel = { 'first-tales-standard': '$5 Story Pass', 'first-tales-super': '$10 Super Supporter', 'first-tales-upgrade': '$5 Super Supporter upgrade' } as const;
type Product = keyof typeof productLabel;
const passProducts: Product[] = ['first-tales-upgrade', 'first-tales-super', 'first-tales-standard'];
const rewardType: Record<string, string> = { hair: 'Hair', eyes: 'Eyes', nose: 'Nose', mouth: 'Mouth', color: 'Color', title: 'Title', shoes: 'Shoes' };
const previewItems = [...PASS_REWARDS.map(reward=>reward.id),'frame:inn-border','title:inn-patron','title:gilded-taleweaver','shoes:ruby-sparkle'];
function PassRewardPreview({id}:{id:string}) {
  if (id.startsWith('title:')) return <span className="di-pass-reward-preview di-pass-title-preview" aria-hidden="true">✦</span>;
  const [kind,value] = id.split(':');
  const appearance = { body:'bean',eyes:kind==='eyes'?value:'dots',nose:kind==='nose'?value:'button',mouth:kind==='mouth'?value:'smile',hair:kind==='hair'?value:null };
  const equipment = { hat:null,shoes:kind==='shoes'?value:null };
  return <span className="di-pass-reward-preview"><HeroAvatar hero={{name:'Preview',classKey:'wizard',accent:kind==='color'?'#6E82C7':'#A78BFA',appearance,equipment,cosmeticUnlocks:{hats:[],styles:[],items:previewItems}}} decorative/></span>;
}

export function StoryPassSummary({ onOpen }: { onOpen: () => void }) {
  const pass = useAdventureStore(state => state.collection.pass) ?? storyPassProgress([], 'free');
  const next = PASS_REWARDS.find(reward => reward.step > pass.step);
  return <section className="di-pass-summary" aria-label="First Tales Story Pass">
    <div><strong>First Tales <span className="di-pass-long">Story </span>Pass</strong><span>Four free stories · {pass.tier === 'free' ? 'Free progress' : pass.tier === 'super' ? 'Super Supporter' : 'Story Pass'} · {pass.points}/1000 points</span><small className="di-pass-count">{pass.points}/1000</small></div>
    <progress value={pass.points} max="1000" aria-label="Story Pass progress" />
    <span>{next ? `Next: ${next.label}` : 'Ruby Shoes unlocked'}</span>
    <button type="button" onClick={onOpen}>View Story Pass</button>
  </section>;
}

export function StoryPassPanel({ onPlay }: { onPlay: (id: string) => void }) {
  const { account, collection, refreshCollection } = useAdventureStore();
  const pass = collection.pass ?? storyPassProgress([], 'free');
  const config = account?.payments;
  const sale = config?.storyPass;
  const [order, setOrder] = useState<Purchase | null>(null);
  const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const identity = useRef(account?.id);
  identity.current = account?.id;
  const eligible = !!account && !account.guest;
  const sandbox = config?.environment === 'sandbox';
  const storage = (product: Product) => `dropinn-pass:${config?.environment}:${account?.id}:${product}`;

  useEffect(() => () => closeCheckout(), []);
  async function check(orderId?: string, bundleId?: Product) {
    if (!eligible) return;
    const accountId = account?.id;
    const purchases = orderId || bundleId
      ? [(await adventureRequest({ operation: 'payment-status', orderId, bundleId })).purchase]
      : (await Promise.all(passProducts.map(product => adventureRequest({ operation: 'payment-status', bundleId: product })))).map(response => response.purchase);
    const purchase = purchases.find(value => value && ['ready', 'creating'].includes(value.status))
      ?? purchases.find(value => value?.status === 'completed')
      ?? purchases.find(Boolean) ?? null;
    if (identity.current !== accountId) return;
    setOrder(purchase);
    await refreshCollection();
    if (purchase?.status === 'completed') {
      setMessage('Confirmed. Your earned Story Pass rewards are now in your wardrobe.');
      localStorage.removeItem(storage(purchase.bundleId as Product));
    } else if (purchase?.status === 'refunded' || purchase?.status === 'disputed') {
      setMessage('This purchase needs review. Your earned story progress is saved.');
    } else if (purchase) setMessage('Payment is being checked. Resume the same checkout or check again.');
    else setMessage('No Story Pass purchase found. Your quest progress is saved.');
  }
  async function buy(product: Product) {
    if (!eligible) { window.dispatchEvent(new Event('dropinn-open-account')); return; }
    const resuming = order?.bundleId === product && ['ready','creating'].includes(order.status);
    if (!config || (!terms && !resuming) || busy || (!resuming && !(product === 'first-tales-upgrade' ? sale?.upgradesOpen : sale?.salesOpen))) return;
    setBusy(true); setError(''); setMessage('');
    const accountId = account?.id;
    try {
      let commandId = localStorage.getItem(storage(product));
      if (!commandId) { commandId = crypto.randomUUID(); localStorage.setItem(storage(product), commandId); }
      const response = await adventureRequest({ operation:'checkout', commandId, bundleId:product });
      if (identity.current !== accountId) return;
      const next = response.purchase;
      if (!next) throw new Error('Your purchase could not be opened. Check its status before trying again.');
      setOrder(next);
      if (next.status === 'completed' || next.status !== 'ready' || !next.transactionId) { await check(next.id, product); return; }
      await openCheckout(config, next.transactionId, event => {
        if (identity.current !== accountId) { closeCheckout(); return; }
        if (event.name === 'checkout.completed') { setMessage('Confirming your purchase…'); void check(next.id, product).catch(e => setError(e instanceof Error ? e.message : 'Check your purchase again shortly.')); }
        if (event.name === 'checkout.error' || event.name === 'checkout.payment.failed') setError('Checkout did not finish. Resume this purchase or check its status.');
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'Checkout could not finish.'); }
    finally { setBusy(false); }
  }
  const questName = (id: string) => ADVENTURES.find(adventure => adventure.id === id)?.title ?? id;
  const questDescription = (quest: typeof pass.quests[number]) => quest.id === 'all-stories' ? 'Finish all four stories'
    : quest.id.startsWith('chapters:') ? quest.label
    : quest.id.endsWith(':third') ? `Finish ${questName(quest.id.slice(0,-6))} three times`
    : `Finish ${questName(quest.id.slice(0,-6))} once`;
  const nextQuest = pass.quests.filter(quest => !quest.done).sort((a, b) => b.current / b.target - a.current / a.target)[0];
  const nextReward = PASS_REWARDS.find(reward => reward.step > pass.step);
  const finishedQuests = pass.quests.filter(quest => quest.done).length;
  const tierName = pass.tier === 'free' ? 'Free progress' : pass.tier === 'super' ? 'Super Supporter' : 'Story Pass owned';
  return <section className="di-story-pass" aria-label={STORY_PASS.name}>
    <header className="di-pass-intro">
      <p className="di-eyebrow">Four stories. One pass.</p>
      <h2>{STORY_PASS.name}</h2>
      <p>Play the stories for free. Finish quests to earn points, then unlock new looks along the track.</p>
      <div className="di-pass-how" aria-label="How the Story Pass works">
        <span><b>1</b> Play a story</span><span><b>2</b> Finish quests</span><span><b>3</b> Earn new looks</span>
      </div>
    </header>

    <section className="di-pass-status" aria-label="Your Story Pass progress">
      <div className="di-pass-status-top"><span className="di-pass-tier">{tierName}</span><strong>{pass.points} <small>/ 1000 points</small></strong></div>
      <progress value={pass.points} max="1000" aria-label="Story Pass progress" />
      <div className="di-pass-status-bottom"><span>Step {pass.step} of 10</span><span>{nextReward ? `Next: ${nextReward.label} at ${nextReward.step * 100} points` : 'Track complete · Ruby Shoes reached'}</span></div>
      {nextQuest && <p className="di-pass-next-quest"><strong>Quest to try next</strong><span>{questDescription(nextQuest)} · {nextQuest.current}/{nextQuest.target} · +100 points</span></p>}
      {pass.tier === 'free' && pass.step > 0 && <p>{pass.step} {pass.step === 1 ? 'reward is' : 'rewards are'} ready when you get the pass. Your progress is saved.</p>}
      {pass.tier === 'free' && <button type="button" className="di-pass-offer-link" onClick={()=>document.getElementById('di-pass-buy')?.scrollIntoView({block:'nearest'})}>See pass options ↓</button>}
    </section>

    <div className="di-pass-layout">
      <div className="di-pass-main">
        <section className="di-pass-track" aria-labelledby="di-pass-track-title">
          <div className="di-pass-section-heading"><div><p className="di-eyebrow">Your reward path</p><h3 id="di-pass-track-title">The 10-step timeline</h3></div><span>100 points per step</span></div>
          <ol className="di-pass-timeline">{PASS_REWARDS.map(reward=>{
            const earned = pass.step >= reward.step;
            const granted = pass.items.includes(reward.id);
            const next = nextReward?.step === reward.step;
            const status = granted ? 'In your wardrobe' : earned ? 'Ready with a pass' : next ? `${reward.step * 100 - pass.points} points to go` : `At ${reward.step * 100} points`;
            return <li key={reward.id} className={`${granted ? 'di-pass-earned' : earned ? 'di-pass-ready' : next ? 'di-pass-next' : 'di-pass-locked'}${reward.step === 10 ? ' di-pass-finale' : ''}`} aria-current={next ? 'step' : undefined}>
              <span className="di-pass-marker" aria-hidden="true">{granted ? '✓' : reward.step}</span>
              <div className="di-pass-reward-card"><PassRewardPreview id={reward.id}/><div className="di-pass-reward-copy"><span className="di-pass-reward-type">{reward.step === 10 ? 'Final reward · ' : ''}{rewardType[reward.id.split(':')[0]]}</span><strong>{reward.label}</strong><span className="di-pass-reward-state">{status}</span></div></div>
            </li>;
          })}</ol>
        </section>

        <section className="di-pass-stories-section" aria-labelledby="di-pass-stories-title">
          <div className="di-pass-section-heading"><div><p className="di-eyebrow">Included in First Tales</p><h3 id="di-pass-stories-title">Four free stories</h3></div></div>
          <p>Finish each story once to start its quest. Play favorites again for the three-clear rewards. First-clear hats stay free.</p>
          <div className="di-pass-stories">{ADVENTURES.filter(adventure=>STORY_PASS.stories.some(id=>id===adventure.id)).map(adventure=>{
            const first = pass.quests.find(quest=>quest.id===`${adventure.id}:first`);
            const third = pass.quests.find(quest=>quest.id===`${adventure.id}:third`);
            return <button type="button" key={adventure.id} onClick={()=>onPlay(adventure.id)}><strong>{adventure.title}</strong><small>First clear {first?.current ?? 0}/1 · Three clears {third?.current ?? 0}/3{PASS_FREE_HATS[adventure.id] ? ' · Free hat' : ''}</small><span>Play story →</span></button>;
          })}</div>
          <details className="di-pass-quest-details"><summary>All quests <span>{finishedQuests} of {pass.quests.length} complete</span></summary>
            <ul className="di-pass-quests">{pass.quests.map(quest=><li key={quest.id}><span>{questDescription(quest)}</span><strong>{quest.current}/{quest.target} · {quest.done?'Done':'+100 points'}</strong></li>)}</ul>
          </details>
        </section>
      </div>

      <aside className="di-pass-side" id="di-pass-buy" aria-label="Story Pass options">
        <section className="di-pass-offer">
          <p className="di-eyebrow">Optional cosmetic track</p><h3>Choose your pass</h3>
          <p>Stories and quest progress are free. A pass grants the looks you have earned.</p>
          {eligible && pass.tier !== 'super' && <label className="di-pass-terms"><input type="checkbox" checked={terms} onChange={event=>setTerms(event.target.checked)}/> <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer">terms</a> and <a href="/refunds" target="_blank" rel="noreferrer">refund policy</a>.</span></label>}
          {pass.tier === 'free' ? <div className="di-pass-options">
            <div className="di-pass-option"><div><strong>Story Pass</strong><b>$5</b></div><p>Unlock earned hair, faces, colors, titles, and Ruby Shoes as you progress.</p><button type="button" className="di-button di-primary" disabled={busy||!sale?.salesOpen||(eligible&&!terms)} onClick={()=>void buy('first-tales-standard')}>{eligible?'Get Story Pass':'Sign in to buy'}</button></div>
            <div className="di-pass-option di-pass-option-super"><div><strong>Super Supporter</strong><b>$10</b></div><p>Everything above, plus the first two rewards now, an avatar border, extra titles, and sparkling shoe colors.</p><button type="button" className="di-button di-secondary" disabled={busy||!sale?.salesOpen||(eligible&&!terms)} onClick={()=>void buy('first-tales-super')}>Get Super Supporter</button></div>
          </div> : pass.tier === 'standard' ? <div className="di-pass-option di-pass-option-super"><div><strong>Upgrade to Super Supporter</strong><b>$5</b></div><p>Add the border, extra earned titles, and sparkling shoe colors.</p><button type="button" className="di-button di-primary" disabled={busy||!sale?.upgradesOpen||(eligible&&!terms)} onClick={()=>void buy('first-tales-upgrade')}>Upgrade</button></div> : <p className="di-pass-owned">Super Supporter owned · Your extra looks are in the wardrobe as you earn them.</p>}
          {sandbox && <p className="di-pass-sandbox" role="note"><strong>Sandbox checkout · no real money.</strong> Test purchases are separate from live purchases.</p>}
          {sale?.endsAt && <p className="di-pass-sale-date">New pass sales end {new Date(sale.endsAt).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',timeZoneName:'short'})}. Owners can finish anytime.</p>}
          {!sale?.salesOpen && <p>{pass.tier === 'free' ? 'Pass sales are closed or have not started.' : 'Sales closed — owners can keep earning.'}</p>}
          <p className="di-fine">One-time purchase. Paddle shows taxes and the final total before payment. Cosmetics do not change abilities.</p>
          {order && ['ready','creating'].includes(order.status) && <button type="button" className="di-button di-secondary" disabled={busy} onClick={()=>void buy(order.bundleId as Product)}>Resume checkout</button>}
          {eligible && <button type="button" className="di-pass-restore" disabled={busy} onClick={()=>void check(order?.id, order?.bundleId as Product|undefined).catch(e=>setError(e instanceof Error?e.message:'Could not check payment.'))}>Check purchase / restore rewards</button>}
          {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}{order && <p className="di-fine">Purchase reference: <code>{order.id}</code></p>}
        </section>
      </aside>
    </div>
  </section>;
}
