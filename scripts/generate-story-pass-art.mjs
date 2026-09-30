// Native full-canvas hero layers. Originals remain untouched for old saved heroes.
import { readFileSync, writeFileSync } from 'node:fs';

const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">\n${body}\n</svg>\n`;
const ink = '#080907';
const path = (d, fill, width = 4) => `<path d="${d}" fill="${fill}" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const artwork = {
  'hair-tidy-tuft': path('M91 105 Q88 86 99 81 L107 85 Q112 72 126 79 L131 84 Q143 74 153 85 Q166 88 161 107 Q150 100 142 105 Q126 96 112 106 Q101 100 91 105Z', '#694a32'),
  'hair-soft-fringe': path('M85 108 Q83 81 102 82 Q112 75 126 81 Q145 74 159 86 Q169 98 163 112 L151 102 L141 111 L131 101 L116 112 L103 102 Z', '#4c3439'),
  'hair-wayward-curls': `<g fill="#7b4e35" stroke="${ink}" stroke-width="4">${[[89,103,12],[100,89,13],[116,80,13],[134,82,14],[153,91,13],[165,106,11]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`,
  'hair-cloud-tuft': `${path('M83 108 Q78 94 89 88 Q89 76 105 77 Q112 66 126 75 Q140 64 148 78 Q165 76 169 93 Q178 105 164 113 L151 106 L136 111 L122 101 L105 110Z','#eee5d1')}${path('M101 85 Q116 80 121 83 M136 79 Q148 78 153 88','none',2)}`,
  'eyes-starry': `<g fill="#f7ce54" stroke="${ink}" stroke-width="3">${[99,156].map(x=>`<path d="M${x} 121 L${x+3} 129 L${x+12} 131 L${x+4} 135 L${x} 144 L${x-4} 135 L${x-12} 131 L${x-3} 129Z"/>`).join('')}</g>`,
  'nose-rosy-button': `<ellipse cx="128" cy="149" rx="10" ry="7" fill="#d77980" stroke="${ink}" stroke-width="3"/><circle cx="125" cy="146" r="2" fill="#fff2e8"/>`,
  'mouth-victorious': `${path('M104 167 Q128 199 153 166 Q148 183 128 186 Q113 185 104 167Z','#fff4d7',3)}${path('M111 173 Q128 181 146 173','none',2)}`,
  'hat-pilot-cap': `${path('M88 90 Q90 64 128 67 Q166 65 168 91 L156 100 Q127 87 100 102Z','#588c91')}${path('M83 99 Q121 88 172 99 Q165 109 128 108 Q94 109 83 99Z','#d7b779')}${path('M120 76 L136 76 L136 88 L120 88Z','#e8d5a7',2)}`,
  'hat-breakfast-nightcap': `${path('M95 96 Q101 59 130 65 Q151 65 158 101 Q145 91 127 98 Q110 90 95 96Z','#9d7dab')}${path('M94 99 Q123 90 159 99 L158 109 Q124 100 95 110Z','#eee0c0')}${path('M131 65 Q163 50 171 79 Q174 87 183 87','none',4)}<circle cx="184" cy="88" r="7" fill="#eee0c0" stroke="${ink}" stroke-width="3"/>`,
  'hat-apple-blossom-crown': `${path('M85 102 Q106 91 126 98 Q149 89 171 103 L168 112 Q143 101 127 108 Q108 101 89 112Z','#72954f')}${[96,121,148,164].map((x,i)=>`<g transform="translate(${x} ${i%2?95:99})"><circle cx="-5" cy="0" r="6" fill="#f8d9dd" stroke="${ink}" stroke-width="2"/><circle cx="5" cy="0" r="6" fill="#f8d9dd" stroke="${ink}" stroke-width="2"/><circle cx="0" cy="-5" r="6" fill="#f8d9dd" stroke="${ink}" stroke-width="2"/><circle cx="0" cy="2" r="3" fill="#e4bb52"/></g>`).join('')}`,
  'shoes-trail-boots': `${path('M82 219 L101 219 L103 234 Q95 244 67 242 Q59 237 68 231 L80 229Z','#657d66')}${path('M150 219 L168 219 L172 231 Q194 232 190 240 Q176 246 149 240Z','#657d66')}${path('M85 226 L100 227 M152 227 L166 227','none',2)}`,
  'shoes-ruby': `${path('M82 221 L101 221 L103 234 Q95 244 66 242 Q58 236 68 231 L81 229Z','#d4475a')}${path('M150 221 L167 221 L170 230 Q193 232 190 240 Q175 246 149 241Z','#d4475a')}${path('M76 235 L96 237 M153 237 L181 237','none',2)}`,
};
for (const [name, body] of Object.entries(artwork)) writeFileSync(`public/heroes/${name}.svg`, svg(body));
const rubyOutline = artwork['shoes-ruby'].replace(/fill="#d4475a"/g, 'fill="none"');
const rubyFill = artwork['shoes-ruby'].replace(/fill="#d4475a"/g, 'fill="white"').replace(/stroke="#080907"/g, 'stroke="none"');
writeFileSync('public/heroes/shoes-ruby-outline.svg', svg(rubyOutline));
writeFileSync('public/heroes/shoes-ruby-fill.svg', svg(rubyFill));
for (const body of ['bean','round','squish','pear','puff','lanky']) {
  const source = readFileSync(`public/heroes/body-${body}.svg`, 'utf8');
  const bare = source.replace(/^.*fill="#946442".*\r?\n/gm,'').replace(/^.*M86 229 L98 231.*\r?\n/gm,'');
  if (bare === source || bare.includes('fill="#946442"')) throw new Error(`Could not separate boots for ${body}.`);
  writeFileSync(`public/heroes/body-${body}-bare.svg`, bare);
}
