export interface MerchProduct {
  id: string;
  name: string;
  edition: string;
  color: string;
  colorHex: string;
  kicker: string;
  story: string;
  productionNote: string;
  description: string;
  images: { src: string; alt: string; label: string }[];
  prices: { size: string; usd: number }[];
  purchaseUrl: string | null;
}

// Set only after the public Quick Store product and checkout have been verified.
export const tavernTee: MerchProduct = {
  id: 'printed-tee',
  name: 'Tavern Sign Tee',
  edition: 'Printed tee',
  color: 'Ivory',
  colorHex: '#fff4d9',
  kicker: 'Wear your welcome',
  story: 'Soft, 100% ring-spun cotton with a substantial 6.1 oz feel. Our cream, moss, and mustard tavern sign is printed on the front; the back stays plain.',
  productionNote: 'Made to order by Printful. Mockups show the design; fabric and printed colors can vary slightly.',
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

export const embroideredTee: MerchProduct = {
  id: 'embroidered-tee',
  name: 'Embroidered Tavern Tee',
  edition: 'Embroidered tee',
  color: 'Black',
  colorHex: '#1b1b1c',
  kicker: 'A welcome, stitched in',
  description: 'Our little tavern, close to your heart. Bold thread, a crooked sign, and an open door for whatever comes next.',
  story: 'The Drop Inn sign in four-color flat embroidery on the left chest, approximately 4 × 2.9 inches. White lettering, a green sign, and a gold doorway on a black heavyweight tee. The back stays plain.',
  productionNote: 'Made to order by Printful on 100% ring-spun cotton, 6.1 oz fabric. These are product mockups; thread, fabric, and final stitched details may vary slightly.',
  images: [
    { src: '/merch/embroidered-tee-front.webp', alt: 'Black Drop Inn shirt with a small green, white, and gold tavern sign embroidered on the left chest.', label: 'Front' },
    { src: '/merch/embroidered-tee-detail.webp', alt: 'Printful close-up mockup of the Drop Inn tavern sign in white, green, gold, and black thread.', label: 'Detail' },
    { src: '/merch/embroidered-tee-back.webp', alt: 'Plain black back of the Drop Inn embroidered Comfort Colors shirt.', label: 'Back' },
  ],
  prices: [
    { size: 'S', usd: 36 }, { size: 'M', usd: 36 },
    { size: 'L', usd: 36 }, { size: 'XL', usd: 36 },
    { size: '2XL', usd: 38 }, { size: '3XL', usd: 40 }, { size: '4XL', usd: 42 },
  ],
  purchaseUrl: 'https://playdropinn.printful.me/product/drop-inn-embroidered-tavern-tee-black',
};

export const merchProducts = [embroideredTee, tavernTee];

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
