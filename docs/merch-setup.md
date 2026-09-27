# Drop Inn merchandise

The public `/merch` page renders independently of the game store, account setup, and command service. The lobby header, footer, and a feature below the play content link to it. Merchandise is separate from Paddle's in-game supporter purchases.

## Catalog and assets

`src/lib/merch.ts` holds the two-product catalog, local mockup paths, prices, and public purchase URLs. Each card has an independent gallery and price disclosure; edition links jump directly to each shirt. Both use Comfort Colors 1717, sizes S–4XL, with US shipping only.

- Ivory printed tee: USD 28 for S–XL, 30 for 2XL, 32 for 3XL, 34 for 4XL.
- Black embroidered tee: USD 36 for S–XL, 38 for 2XL, 40 for 3XL, 42 for 4XL.

Prices exclude shipping and tax. The new embroidered edition appears first and in the lobby teaser. Its four-color logo is standard flat embroidery at 4 × 2.9 inches on the left chest. The official Printful Flat front/back and Zoomed in front exports are preserved in `design/brand/drop-inn-embroidery-v1/mockups/`; the app uses 1000px WebPs. See that folder's README for editable artwork, exact thread palette, product costs, and digitization limitations.

The 1000 × 1000 transparent WebP images in `public/merch/` were exported through Printful's Download mockups flow for saved product 475452212, Flat style, Front and Back, Ivory, PNG, on September 26, 2026. Source filenames:

- `unisex-garment-dyed-heavyweight-t-shirt-ivory-front-6ab83ab223e7d.png`
- `unisex-garment-dyed-heavyweight-t-shirt-ivory-back-6ab83ab2241a0.png`

They were resized to 1000 pixels and encoded with sharp at WebP quality 86 (44,866 and 28,642 bytes). These are Printful-generated product mockups, not physical sample photographs or AI garment illustrations. The print artwork, editable master, and original saved product record are in `design/brand/drop-inn-logo-v1/`.

## Checkout activation

`purchaseUrl: null` intentionally shows Coming soon with no purchase link. The guard accepts only HTTPS product pages on `playdropinn.printful.me`; it rejects dashboard links, other hosts, credentials, and custom ports. Do not replace it with a guessed URL or a merchant dashboard link.

Quick Store **Drop Inn Merch** (18815493) was created on September 26, 2026 at **https://playdropinn.printful.me**, after the owner confirmed USA tax residence and explicitly authorized accepting the Quick Stores Terms of Service. The global 30% default markup was left unchanged; the agreed exact prices were applied individually to this product.

Published product **475455280**, **Drop Inn Tavern Sign Tee — Ivory**, reuses Printful file 1074260507, front DTG, 10 × 8.95 inches at 300 DPI, Ivory, all seven sizes, with Flat front/back mockups. Original manual/API store 18814538 and product 475452212 are preserved.

Verified public product URL: https://playdropinn.printful.me/product/unisex-garment-dyed-heavyweight-t-shirt. The slug retains Printful's original catalog title even though the visible title and description have been updated. All seven public size prices match the catalog above. A medium shirt added to the cart at $28, and checkout opened the contact/address step with the correct item and subtotal. No customer details, payment, or order were submitted; shipping, tax, and final payment were not tested. Any future identity, tax, or payout onboarding belongs to the owner.

The second product, **475656463**, **Drop Inn Embroidered Tavern Tee — Black**, was published September 27, 2026 using artwork file **1074746942**. Its verified public URL is https://playdropinn.printful.me/product/drop-inn-embroidered-tavern-tee-black. Saved retail prices leave $19.08 above the listed production cost in every size, or $12.58 allowing for a one-time $6.50 digitization fee. M added to the public cart at $36; the Contact step showed the correct item and subtotal. No personal details or payment were submitted, and the cart was confirmed empty afterward.

Printful handles customer checkout, production, shipping, and merchandise order support. No Printful token, bank data, shipping address, order API, webhook, or new database table is needed on Drop Inn.

## Verification and rollback

September 27 embroidery update: 340 Vitest tests and the production build passed. Desktop, 390px, and 320px layouts have no horizontal overflow. Both galleries update independently, all displayed images load, product IDs are unique, and the embroidery price disclosure matches Printful. The public embroidery product, cart, and checkout entry were verified before activating its app link. The original printed product and its URL remain available.

September 26 local verification: 336 Vitest tests passed; production build passed. Reviewed desktop, 390px, and 320px layouts; no horizontal overflow; both mockup files load; front/back controls change the image; prices expand correctly; keyboard focus is visible. The lobby loads and exposes Merch navigation. The initial merch deployment (483ceee) published successfully on Netlify; the public `/merch` route loads directly and refreshes correctly. Public Printful cart and checkout-entry verification is described above.

Before activation, also verify the live page, direct-route refresh, and unchanged supporter checkout. To disable purchases, set `purchaseUrl` back to null and redeploy; this leaves Printful's existing orders and fulfillment alone. Revert the merch commit to remove the site feature entirely.
