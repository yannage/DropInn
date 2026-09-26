import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Dices, ExternalLink, Package, Shirt } from 'lucide-react';
import { publicMerchUrl, startingPrice, tavernTee } from '../../lib/merch';
import './merch.css';

export function MerchTeaser() {
  return <section className="merch-teaser" aria-labelledby="merch-teaser-title">
    <img src={tavernTee.images[0].src} alt="Drop Inn tavern-sign tee in Ivory" width="240" height="240" loading="lazy" />
    <div><p className="merch-kicker">Goods from the inn</p><h2 id="merch-teaser-title">Take a little of the inn with you.</h2><p>Our crooked tavern sign, on your new favorite tee.</p></div>
    <a className="merch-button merch-button-light" href="/merch">Explore the merch <ArrowRight size={18} /></a>
  </section>;
}

export default function Merch() {
  const [view, setView] = useState(0);
  const image = tavernTee.images[view];
  const purchaseUrl = publicMerchUrl(tavernTee.purchaseUrl);
  useEffect(() => {
    const oldTitle = document.title;
    document.title = 'Drop Inn Merch — Goods from the inn';
    return () => { document.title = oldTitle; };
  }, []);

  return <div className="di-app merch-page">
    <a className="merch-skip" href="#merch-main">Skip to merchandise</a>
    <header className="merch-header">
      <a className="merch-brand" href="/" aria-label="Drop Inn home"><Dices size={27} />Drop<span>Inn</span><i /></a>
      <nav aria-label="Main navigation"><a href="/"><ArrowLeft size={16} />Back to the inn</a><a href="/merch" aria-current="page">Merch</a></nav>
    </header>
    <main id="merch-main" className="merch-main">
      <section className="merch-intro" aria-labelledby="merch-title">
        <p className="merch-kicker">Good company. Everyday adventures.</p>
        <h1 id="merch-title">Goods from <em>the inn.</em></h1>
        <p>For the stories you carry beyond the table.</p>
      </section>
      <article className="merch-product" aria-labelledby="tee-title">
        <div className="merch-gallery">
          <div className="merch-photo">
            <span className="merch-stamp">The first<br /><strong>Drop Inn tee</strong></span>
            <img src={image.src} alt={image.alt} width="1000" height="1000" fetchPriority="high" />
          </div>
          <div className="merch-gallery-bottom">
            <div className="merch-views" role="group" aria-label="Shirt view">
              {tavernTee.images.map((item, index) => <button key={item.label} type="button" aria-pressed={view === index} onClick={() => setView(index)}>{item.label}</button>)}
            </div>
            <p>Printful product mockup</p>
          </div>
        </div>
        <div className="merch-product-copy">
          <p className="merch-kicker">Wear your welcome</p>
          <h2 id="tee-title">{tavernTee.name}</h2>
          <p className="merch-price">From ${startingPrice} <span>USD</span></p>
          <p className="merch-description">{tavernTee.description}</p>
          <div className="merch-color"><span aria-hidden="true" />{tavernTee.color}<small>Comfort Colors 1717</small></div>
          <div className="merch-sizes" aria-label="Available sizes">{tavernTee.prices.map(price => <span key={price.size}>{price.size}</span>)}</div>
          <p className="merch-fit">Relaxed fit · Heavyweight, garment-dyed cotton</p>
          {purchaseUrl ? <a className="merch-button" href={purchaseUrl} target="_blank" rel="noopener noreferrer">Shop on Printful <ExternalLink size={18} /><span className="di-sr-only"> (opens in a new tab)</span></a>
            : <div className="merch-coming-soon"><span><Shirt size={19} />Coming soon</span><p>We’re putting the finishing touches on our shop. Check back here to grab yours.</p></div>}
          <p className="merch-checkout-note">US shipping only. Shipping and tax calculated at checkout.{purchaseUrl && ' Choose your size and pay securely on Printful.'}</p>
          <div className="merch-details">
            <details open><summary>A tee with a story</summary><p>Soft, 100% ring-spun cotton with a substantial 6.1 oz feel. Our cream, moss, and mustard tavern sign is printed on the front; the back stays plain.</p><p>Made to order by Printful. Mockups show the design; fabric and printed colors can vary slightly.</p></details>
            <details><summary>Sizing & prices</summary><p>Choose your usual size for a relaxed fit. Check the full size guide on Printful before ordering.</p><table><caption>Prices before shipping and tax</caption><thead><tr><th scope="col">Size</th><th scope="col">Price (USD)</th></tr></thead><tbody>{tavernTee.prices.map(price => <tr key={price.size}><th scope="row">{price.size}</th><td>${price.usd}</td></tr>)}</tbody></table></details>
            <details><summary>Delivery & order help</summary><p>Printful handles checkout, printing, shipping, and support for merchandise orders. Delivery estimates and applicable return policies are shown on Printful.</p><p>For an existing order, follow the support link in your Printful confirmation email. No Drop Inn account is needed to shop.</p></details>
          </div>
        </div>
      </article>
      <section className="merch-note"><Package size={24} aria-hidden="true" /><div><h2>A little piece of the place.</h2><p>Made for the errand between quests. The coffee after a close call. And the friend who always saves you a seat.</p></div><span aria-hidden="true">See you at the inn.</span></section>
    </main>
    <footer className="merch-footer"><a href="/">Your next adventure is waiting <ArrowRight size={17} /></a><nav aria-label="Site information"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:themainyak@gmail.com">Contact</a></nav><p>Physical merch is sold through Printful, separately from in-game purchases.</p></footer>
  </div>;
}
