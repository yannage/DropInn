import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Dices, ExternalLink, Package, Shirt } from 'lucide-react';
import { publicMerchUrl, merchProducts, embroideredTee, type MerchProduct } from '../../lib/merch';
import './merch.css';

export function MerchTeaser() {
  return <section className="merch-teaser" aria-labelledby="merch-teaser-title">
    <img src={embroideredTee.images[0].src} alt="Drop Inn embroidered tavern tee in Black" width="240" height="240" loading="lazy" />
    <div><p className="merch-kicker">Goods from the inn</p><h2 id="merch-teaser-title">Take a little of the inn with you.</h2><p>Printed in Ivory. Stitched in Black. Find your favorite tee.</p></div>
    <a className="merch-button merch-button-light" href="/merch">Explore the merch <ArrowRight size={18} /></a>
  </section>;
}

export default function Merch() {
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
      <nav className="merch-editions" aria-label="Shop by edition">
        {merchProducts.map(product => <a key={product.id} href={`#${product.id}`}>{product.edition}<ArrowRight size={15} /></a>)}
      </nav>
      {merchProducts.map((product, index) => <MerchProductCard key={product.id} product={product} priority={index === 0} />)}
      <section className="merch-note"><Package size={24} aria-hidden="true" /><div><h2>A little piece of the place.</h2><p>Made for the errand between quests. The coffee after a close call. And the friend who always saves you a seat.</p></div><span aria-hidden="true">See you at the inn.</span></section>
    </main>
    <footer className="merch-footer"><a href="/">Your next adventure is waiting <ArrowRight size={17} /></a><nav aria-label="Site information"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:themainyak@gmail.com">Contact</a></nav><p>Physical merch is sold through Printful, separately from in-game purchases.</p></footer>
  </div>;
}

function MerchProductCard({ product, priority }: { product: MerchProduct; priority: boolean }) {
  const [view, setView] = useState(0);
  const image = product.images[view];
  const purchaseUrl = publicMerchUrl(product.purchaseUrl);
  const startingPrice = Math.min(...product.prices.map(price => price.usd));
  return <article id={product.id} className="merch-product" aria-labelledby={`${product.id}-title`}>
    <div className="merch-gallery">
      <div className="merch-photo">
        <span className="merch-stamp">Drop Inn<br /><strong>{product.edition}</strong></span>
        <img src={image.src} alt={image.alt} width="1000" height="1000" fetchPriority={priority ? "high" : undefined} loading={priority ? "eager" : "lazy"} />
      </div>
      <div className="merch-gallery-bottom">
        <div className="merch-views" role="group" aria-label={`${product.name} view`}>
          {product.images.map((item, index) => <button key={item.label} type="button" aria-pressed={view === index} onClick={() => setView(index)}>{item.label}</button>)}
        </div>
        <p>Printful product mockup</p>
      </div>
    </div>
    <div className="merch-product-copy">
      <p className="merch-kicker">{product.kicker}</p>
      <h2 id={`${product.id}-title`}>{product.name}</h2>
      <p className="merch-price">From ${startingPrice} <span>USD</span></p>
      <p className="merch-description">{product.description}</p>
      <div className="merch-color"><span aria-hidden="true" style={{ backgroundColor: product.colorHex }} />{product.color}<small>Comfort Colors 1717</small></div>
      <div className="merch-sizes" aria-label="Available sizes">{product.prices.map(price => <span key={price.size}>{price.size}</span>)}</div>
      <p className="merch-fit">Relaxed fit · Heavyweight, garment-dyed cotton</p>
      {purchaseUrl ? <a className="merch-button" href={purchaseUrl} target="_blank" rel="noopener noreferrer">Shop {product.edition.toLowerCase()} <ExternalLink size={18} /><span className="di-sr-only"> on Printful (opens in a new tab)</span></a>
        : <div className="merch-coming-soon"><span><Shirt size={19} />Coming soon</span><p>We’re putting the finishing touches on our shop. Check back here to grab yours.</p></div>}
      <p className="merch-checkout-note">US shipping only. Shipping and tax calculated at checkout.{purchaseUrl && ' Choose your size and pay securely on Printful.'}</p>
      <div className="merch-details">
        <details open><summary>A tee with a story</summary><p>{product.story}</p><p>{product.productionNote}</p></details>
        <details><summary>Sizing & prices</summary><p>Choose your usual size for a relaxed fit. Check the full size guide on Printful before ordering.</p><table><caption>Prices before shipping and tax</caption><thead><tr><th scope="col">Size</th><th scope="col">Price (USD)</th></tr></thead><tbody>{product.prices.map(price => <tr key={price.size}><th scope="row">{price.size}</th><td>${price.usd}</td></tr>)}</tbody></table></details>
        <details><summary>Delivery & order help</summary><p>Printful handles checkout, production, shipping, and support for merchandise orders. Delivery estimates and applicable return policies are shown on Printful.</p><p>For an existing order, follow the support link in your Printful confirmation email. No Drop Inn account is needed to shop.</p></details>
      </div>
    </div>
  </article>;
}
