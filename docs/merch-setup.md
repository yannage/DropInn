# Drop Inn merchandise

The public `/merch` page renders independently of the game store, account setup, and command service. The lobby header, footer, and a feature below the play content link to it. Merchandise is separate from Paddle's in-game supporter purchases.

## Catalog and assets

`src/lib/merch.ts` holds product copy, local mockup paths, prices, and the public purchase URL. Prices are USD 28 for S–XL, 30 for 2XL, 32 for 3XL, and 34 for 4XL, before shipping and tax. Launch is Ivory Comfort Colors 1717 only, US shipping only.

The 1000 × 1000 transparent WebP images in `public/merch/` were exported through Printful's Download mockups flow for saved product 475452212, Flat style, Front and Back, Ivory, PNG, on September 26, 2026. Source filenames:

- `unisex-garment-dyed-heavyweight-t-shirt-ivory-front-6ab83ab223e7d.png`
- `unisex-garment-dyed-heavyweight-t-shirt-ivory-back-6ab83ab2241a0.png`

They were resized to 1000 pixels and encoded with sharp at WebP quality 86 (44,866 and 28,642 bytes). These are Printful-generated product mockups, not physical sample photographs or AI garment illustrations. The print artwork, editable master, and original saved product record are in `design/brand/drop-inn-logo-v1/`.

## Checkout activation

`purchaseUrl: null` intentionally shows Coming soon with no purchase link. The guard accepts only HTTPS product pages on `playdropinn.printful.me`; it rejects dashboard links, other hosts, credentials, and custom ports. Do not replace it with a guessed URL or a merchant dashboard link.

Quick Store setup is prepared as **Drop Inn Merch**, requested address **playdropinn.printful.me**, USA tax residence confirmed by the owner, logo uploaded. Creation is pending the owner's explicit approval to accept Printful's Quick Stores Terms of Service. The existing 30% global default markup is unchanged in the prepared form; set the exact agreed prices on the new product.

Once creation is authorized:

1. Create the Quick Store; if the address is unavailable, obtain a replacement choice before creating an immutable address.
2. Reuse the existing light-fabric website artwork (Printful file 1074260507), front DTG, 10 × 8.95 inches, Ivory, all seven sizes. Preserve manual/API store 18814538 and its product 475452212.
3. Set the agreed retail prices, title, description, and front/back mockups. Owner handles any identity/tax/bank onboarding and further legal agreements.
4. Verify the public product, sizes, prices, and checkout without purchasing. Record the actual Quick Store/product IDs and URL in the brand asset record, then set `purchaseUrl` and redeploy. Keep Coming soon until verification succeeds.

Printful handles customer checkout, printing, shipping, and merchandise order support. No Printful token, bank data, shipping address, order API, webhook, or new database table is needed on Drop Inn.

## Verification and rollback

September 26 local verification: 336 Vitest tests passed; production build passed. Reviewed desktop, 390px, and 320px layouts; no horizontal overflow; both mockup files load; front/back controls change the image; prices expand correctly; keyboard focus is visible. The lobby loads and exposes Merch navigation. Public checkout is not verified because the store has not been created.

Before activation, also verify the live page, direct-route refresh, and unchanged supporter checkout. To disable purchases, set `purchaseUrl` back to null and redeploy; this leaves Printful's existing orders and fulfillment alone. Revert the merch commit to remove the site feature entirely.
