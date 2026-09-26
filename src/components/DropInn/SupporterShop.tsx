import { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_HATS } from '../../lib/cosmetics';
import { adventureRequest } from '../../lib/dropinn/api';
import { openCheckout, closeCheckout } from '../../lib/dropinn/checkout';
import { SUPPORTER_BUNDLE, SUPPORTER_STYLES, type Purchase } from '../../lib/dropinn/payments';
import { useAdventureStore } from '../../store/adventureStore';
import { HeroHatPreview } from './HeroAvatar';
import './supporter-shop.css';

export function SupporterShop() {
  const { account, collection, room, refreshCollection } = useAdventureStore();
  const config = account?.payments;
  const sandbox = config?.environment === 'sandbox';
  const visible = !!config && (!sandbox || new URLSearchParams(location.search).get('payments') === 'sandbox' || location.pathname === '/checkout');
  const [order, setOrder] = useState<Purchase | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const identity = useRef(account?.id);
  identity.current = account?.id;
  const owned = collection.paid?.environment === config?.environment && collection.paid?.bundles.includes(SUPPORTER_BUNDLE.id);
  const eligible = !!account && !account.guest;
  const storageKey = `dropinn-purchase:${config?.environment}:${account?.id}:${SUPPORTER_BUNDLE.id}`;
  const offerActive = !!config?.launchOffer && now < Date.parse(config.launchOffer.endsAt);
  const pending = order?.status === 'ready' || order?.status === 'creating';
  const launchPrice = pending ? order.launchDiscounted : offerActive;
  useEffect(() => {
    if (!config?.launchOffer) return;
    const remaining = Date.parse(config.launchOffer.endsAt) - Date.now();
    if (remaining <= 0) { setNow(Date.now()); return; }
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(remaining + 100, 2147483647));
    return () => window.clearTimeout(timer);
  }, [config?.launchOffer?.endsAt]);
  const check = useCallback(async (orderId?: string) => {
    if (!eligible || !visible) return;
    const accountId = account?.id;
    const response = await adventureRequest({ operation: 'payment-status', orderId });
    if (identity.current !== accountId) return;
    const next = response.purchase ?? null;
    setOrder(next);
    await refreshCollection();
    if (next?.status === 'completed') { setMessage('Your pack is in your wardrobe. Choose a hat, then Save hero.'); localStorage.removeItem(storageKey); }
    else if (next?.status === 'refunded' || next?.status === 'canceled') { setMessage(next.status === 'refunded' ? 'This purchase was refunded. Its paid items are no longer available.' : 'This checkout was canceled.'); localStorage.removeItem(storageKey); }
    else if (next?.status === 'disputed') setMessage('This payment is under dispute. Contact payment support using your receipt.');
    else if (next) setMessage('Payment is not confirmed yet. Check again or resume the same checkout.');
  }, [account?.id, eligible, visible, refreshCollection, storageKey]);
  useEffect(() => {
    setOrder(null); setMessage(''); setError(''); setBusy(false); setAcceptedTerms(false);
    return () => closeCheckout();
  }, [account?.id]);
  useEffect(() => {
    if (!visible || !eligible) return;
    const sync = () => { void check().catch(e => setError(e instanceof Error ? e.message : 'Could not check your purchase.')); };
    sync(); window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, [check, eligible, visible]);
  useEffect(() => {
    if (!order || !['ready', 'creating'].includes(order.status)) return;
    let attempts = 0;
    const timer = window.setInterval(() => { if (++attempts > 12) { clearInterval(timer); return; } void check(order.id).catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [order?.id, order?.status, check]);
  async function buy() {
    if (!eligible) { window.dispatchEvent(new Event('dropinn-open-account')); return; }
    if (!config || busy || room || !acceptedTerms) return;
    setBusy(true); setError('');
    const accountId = account?.id;
    try {
      let commandId = localStorage.getItem(storageKey);
      if (!commandId) { commandId = crypto.randomUUID(); localStorage.setItem(storageKey, commandId); }
      const response = await adventureRequest({ operation: 'checkout', commandId, bundleId: SUPPORTER_BUNDLE.id, expectLaunchOffer: offerActive && !pending });
      if (identity.current !== accountId) return;
      const next = response.purchase;
      if (!next) throw new Error('Your checkout could not be confirmed. Check your purchase before trying again.');
      setOrder(next);
      if (next.status === 'completed') { await check(next.id); return; }
      if (next.status !== 'ready' || !next.transactionId) { await check(next.id); return; }
      await openCheckout(config, next.transactionId, event => {
        if (identity.current !== accountId) { closeCheckout(); return; }
        if (event.name === 'checkout.completed') {
          setMessage('Confirming payment with the server…');
          void check(next.id).catch(e => setError(e instanceof Error ? e.message : 'Check your purchase again shortly.'));
        }
        if (event.name === 'checkout.error' || event.name === 'checkout.payment.failed') setError('Checkout did not finish. Resume the same purchase or check its status.');
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'Checkout could not finish. Please check again.'); }
    finally { setBusy(false); }
  }
  if (!visible) return null;
  return <section className="di-supporter-shop" aria-label="Supporter pack">
    <div className="di-supporter-heading"><p className="di-eyebrow">A little thank-you for keeping the inn open</p><h2>{SUPPORTER_BUNDLE.name}</h2>
      <p>Two curious hats and four palettes for every hero on your account. One purchase. No subscription. Stories, abilities, and earned rewards stay free.</p></div>
    {sandbox && <p className="di-payment-test" role="note"><strong>Sandbox checkout — no real money.</strong> Use Paddle test details only. Test items are separate from live purchases.</p>}
    <div className="di-supporter-layout">
    <div className="di-supporter-hats">{SUPPORTER_BUNDLE.hats.map(id => {
      const hat = HERO_HATS.find(h => h.id === id)!;
      return <article key={id}><h3>{hat.label}</h3><div className="di-supporter-palettes">{SUPPORTER_STYLES.filter(s => s.hat === id).map(style => <figure key={style.id}><HeroHatPreview hat={hat} hatColor={style.id}/><figcaption>{style.label}</figcaption></figure>)}</div></article>;
    })}</div>
    <div className="di-supporter-purchase">
    <p className="di-supporter-price">{launchPrice ? <><strong>$5 USD launch price</strong><span>50% off <del>$10 USD</del> regular price</span></> : <strong>$10 USD · one-time</strong>}
      {launchPrice && config.launchOffer && <span>Offer ends {new Date(config.launchOffer.endsAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}.</span>}
      <span>One-time purchase. Paddle shows the final total and applicable taxes before payment.</span></p>
    {!owned && eligible && <label className="di-supporter-consent"><input type="checkbox" checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)} /> <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer">terms of use</a> and <a href="/refunds" target="_blank" rel="noreferrer">refund policy</a>.</span></label>}
    {owned ? <p className="di-supporter-owned" role="status">Yours — open Your hero → Hats to wear them.</p>
      : <button type="button" className="di-button di-primary" disabled={busy || !!room || !config.enabled || order?.status === 'disputed' || (eligible && !acceptedTerms)} onClick={() => void buy()}>{busy ? 'Opening checkout…' : !eligible ? 'Sign in to buy' : order?.status === 'ready' ? 'Resume checkout' : sandbox ? 'Open test checkout' : 'Buy supporter pack'}</button>}
    {room && <p>Visit the wardrobe and shop between adventures.</p>}
    {!config.enabled && <p>New purchases are currently unavailable. Existing payments can still be checked.</p>}
    {eligible && <button type="button" className="di-button di-secondary" disabled={busy} onClick={() => {setError(''); void check(order?.id).catch(e => setError(e instanceof Error ? e.message : 'Could not check payment.'));}}>Check purchase / restore items</button>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {order && <p className="di-fine">Purchase reference: <code>{order.id}</code></p>}
    </div>
    </div>
    <details className="di-supporter-help"><summary>Refunds, privacy & support</summary><p className="di-fine">Refunded purchases lose their paid items; earned items are unaffected. A purchase never equips a hat automatically. See our <a href="/refunds" target="_blank" rel="noreferrer">refund policy</a> and <a href="/privacy" target="_blank" rel="noreferrer">privacy policy</a>. Payment questions and refund requests: <a href="https://paddle.net" target="_blank" rel="noreferrer">Paddle payment support</a>. Game support: <a href="mailto:themainyak@gmail.com">themainyak@gmail.com</a>.</p></details>
  </section>;
}
