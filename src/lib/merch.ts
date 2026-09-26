export interface MerchProduct {
  name: string;
  color: string;
  description: string;
  images: { src: string; alt: string; label: string }[];
  prices: { size: string; usd: number }[];
  purchaseUrl: string | null;
}

// Set only after the public Quick Store product and checkout have been verified.
export const tavernTee: MerchProduct = {
  name: 'Tavern Sign Tee',
  color: 'Ivory',
  description: 'A crooked sign. An open door. A little reminder that there’s always room for one more adventurer.',
  images: [
    { src: '/merch/tavern-tee-front.webp', alt: 'Ivory Drop Inn shirt with a moss-green tavern sign, cream lettering, mustard doorway, and playdropinn.com beneath it.', label: 'Front' },
    { src: '/merch/tavern-tee-back.webp', alt: 'Plain Ivory back of the Drop Inn Comfort Colors shirt.', label: 'Back' },
  ],
  prices: [
    { size: 'S', usd: 28 }, { size: 'M', usd: 28 },
    { size: 'L', usd: 28 }, { size: 'XL', usd: 28 },
    { size: '2XL', usd: 30 }, { size: '3XL', usd: 32 }, { size: '4XL', usd: 34 },
  ],
  purchaseUrl: 'https://playdropinn.printful.me/product/unisex-garment-dyed-heavyweight-t-shirt',
};

export function publicMerchUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'playdropinn.printful.me'
      && url.pathname.startsWith('/product/') && url.pathname.length > '/product/'.length
      && !url.username && !url.password && !url.port
      ? url.href : null;
  } catch { return null; }
}

export const startingPrice = Math.min(...tavernTee.prices.map(price => price.usd));
