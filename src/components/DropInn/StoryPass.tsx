import { useEffect, useRef, useState } from 'react';
import { adventureRequest } from '../../lib/dropinn/api';
import { closeCheckout, openCheckout } from '../../lib/dropinn/checkout';
import type { Purchase } from '../../lib/dropinn/payments';
import { PASS_REWARDS, STORY_PASS, storyPassProgress } from '../../lib/dropinn/storyPass';
import { ADVENTURES } from '../../lib/dropinn/registry';
import { HeroAvatar } from './HeroAvatar';
import { useAdventureStore } from '../../store/adventureStore';
import './story-pass.css';

const productLabel = { 'first-tales-standard': '$5 Story Pass', 'first-tales-super': '$10 Super Supporter', 'first-tales-upgrade': '$5 Super Supporter upgrade' } as const;
type Product = keyof typeof productLabel;
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
    const response = await adventureRequest({ operation: 'payment-status', orderId, bundleId });
    if (identity.current !== accountId) return;
    setOrder(response.purchase ?? null);
    await refreshCollection();
    if (response.purchase?.status === 'completed') {
      setMessage('Confirmed. Your earned Story Pass rewards are now in your wardrobe.');
      localStorage.removeItem(storage(response.purchase.bundleId as Product));
    } else if (response.purchase?.status === 'refunded' || response.purchase?.status === 'disputed') {
      setMessage('This purchase needs review. Your earned story progress is saved.');
    } else if (response.purchase) setMessage('Payment is being checked. Resume the same checkout or check again.');
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
  return <section className="di-story-pass" aria-label={STORY_PASS.name}>
    <p className="di-eyebrow">Four stories. One collection.</p><h2>{STORY_PASS.name}</h2>
    <p>Play every story for free. Your quests count before you buy. The $5 pass opens the cosmetic track; Super Supporter adds a border, extra earned titles and sparkling shoe colors.</p>
    <button type="button" className="di-button di-secondary di-pass-jump" onClick={()=>document.getElementById('di-pass-buy')?.scrollIntoView({block:'nearest'})}>See $5 and $10 options</button>
    <div className="di-pass-status"><strong>{pass.points}/1000 points · Step {pass.step}/10</strong><progress value={pass.points} max="1000" aria-label="Story Pass progress" /><span>{pass.tier === 'free' ? 'Free progress' : pass.tier === 'super' ? 'Super Supporter' : 'Story Pass owned'}</span></div>
    <h3>Stories in this pass</h3><div className="di-pass-stories">{ADVENTURES.filter(adventure=>STORY_PASS.stories.some(id=>id===adventure.id)).map(adventure=><button type="button" key={adventure.id} onClick={()=>onPlay(adventure.id)}>{adventure.title}<span>Play story →</span></button>)}</div>
    <h3>Quests</h3><ul className="di-pass-quests">{pass.quests.map(quest=><li key={quest.id}><span>{quest.id==='all-stories'?'Finish all four stories':quest.id.startsWith('chapters:')?quest.label:quest.id.endsWith(':third')?`Finish ${questName(quest.id.slice(0,-6))} three times`:`Finish ${questName(quest.id.slice(0,-6))} once`}</span><strong>{quest.current}/{quest.target} · {quest.done?'Done':'+100 points'}</strong></li>)}</ul>
    <h3>Rewards</h3><ol className="di-pass-rewards">{PASS_REWARDS.map(reward=>{const earned=pass.step>=reward.step;const granted=pass.items.includes(reward.id);return <li key={reward.id}><b>{reward.step}</b><PassRewardPreview id={reward.id}/><span>{reward.label}</span><small>{granted?'Yours':earned?'Earned · requires purchase':pass.tier==='super'&&reward.step<=2?'Super Supporter · yours':'Requires more progress'}</small></li>;})}</ol>
    <div className="di-pass-supporter"><strong>Super Supporter extras</strong><p>First two rewards and a six-color avatar border immediately; “the Inn’s Patron” at step 4, “the Gilded Taleweaver” at step 9, and sparkling Ruby Shoes in six colors at step 10.</p></div>
    {sandbox && <p role="note"><strong>Sandbox checkout — no real money.</strong> Test purchases stay separate from live purchases.</p>}
    {sale?.endsAt && <p>New pass sales end {new Date(sale.endsAt).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',timeZoneName:'short'})}. Owners can finish anytime.</p>}
    {!sale?.salesOpen && <p>{pass.tier === 'free' ? 'Pass sales are closed or have not started.' : 'Sales closed — owners can keep earning.'}</p>}
    {eligible && pass.tier !== 'super' && <label className="di-pass-terms"><input type="checkbox" checked={terms} onChange={event=>setTerms(event.target.checked)}/> I agree to the <a href="/terms" target="_blank" rel="noreferrer">terms</a> and <a href="/refunds" target="_blank" rel="noreferrer">refund policy</a>.</label>}
    <div className="di-pass-buy" id="di-pass-buy">{pass.tier==='free' ? <><button type="button" className="di-button di-primary" disabled={busy||!sale?.salesOpen||(eligible&&!terms)} onClick={()=>void buy('first-tales-standard')}>{eligible?'Get Story Pass · $5':'Sign in to buy · $5'}</button><button type="button" className="di-button di-secondary" disabled={busy||!sale?.salesOpen||(eligible&&!terms)} onClick={()=>void buy('first-tales-super')}>Super Supporter · $10</button></> : pass.tier==='standard' ? <button type="button" className="di-button di-primary" disabled={busy||!sale?.upgradesOpen||(eligible&&!terms)} onClick={()=>void buy('first-tales-upgrade')}>Upgrade to Super Supporter · $5</button> : <p>Super Supporter owned</p>}</div>
    <p className="di-fine">One-time purchase. Paddle shows taxes and the final total before payment. Cosmetics do not change your abilities.</p>
    {order && ['ready','creating'].includes(order.status) && <button type="button" className="di-button di-secondary" disabled={busy} onClick={()=>void buy(order.bundleId as Product)}>Resume checkout</button>}
    {eligible && <button type="button" className="di-button di-secondary" disabled={busy} onClick={()=>void check(order?.id, order?.bundleId as Product|undefined).catch(e=>setError(e instanceof Error?e.message:'Could not check payment.'))}>Check purchase / restore rewards</button>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}{order && <p className="di-fine">Purchase reference: <code>{order.id}</code></p>}
  </section>;
}
