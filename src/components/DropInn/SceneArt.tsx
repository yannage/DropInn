import { useId } from 'react';

/** Hand-built scene plates keep the story readable and work offline. */
export function SceneArt({
  scene = 'village',
  className = '',
}: {
  scene?: 'village' | 'river' | 'chapel';
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const paint = (name: string) => `url(#${id}-${name})`;
  return (
    <svg
      className={`di-scene-art ${className}`}
      viewBox="0 0 1000 560"
      fill="none"
      role="img"
      aria-label={
        {
          village: 'A lantern-lit inn among the misty pines of Briar Glen.',
          river: 'Moonlight follows a winding river toward a ruined chapel.',
          chapel:
            'An ancient chapel, its broken ward glowing beneath the moon.',
        }[scene]
      }
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient
          id={`${id}-sky`}
          x1="500"
          y1="0"
          x2="500"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#152a37" />
          <stop offset=".6" stopColor="#52766c" />
          <stop offset="1" stopColor="#a4a18a" />
        </linearGradient>
        <linearGradient
          id={`${id}-water`}
          x1="500"
          y1="240"
          x2="620"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9dac98" />
          <stop offset=".4" stopColor="#51818b" />
          <stop offset="1" stopColor="#233e50" />
        </linearGradient>
        <linearGradient
          id={`${id}-roof`}
          x1="420"
          y1="210"
          x2="800"
          y2="340"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4c6869" />
          <stop offset="1" stopColor="#1b313c" />
        </linearGradient>
        <linearGradient
          id={`${id}-wall`}
          x1="520"
          y1="275"
          x2="650"
          y2="460"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#798071" />
          <stop offset="1" stopColor="#333f3b" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#ffdc99" stopOpacity=".7" />
          <stop offset="1" stopColor="#f4b955" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-moon`}>
          <stop stopColor="#e5e6c6" stopOpacity=".22" />
          <stop offset="1" stopColor="#e5e6c6" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${id}-shade`}
          x1="500"
          y1="370"
          x2="500"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0b1b1d" stopOpacity="0" />
          <stop offset="1" stopColor="#0b1b1d" stopOpacity=".7" />
        </linearGradient>
        <filter id={`${id}-blur`}>
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <g id={`${id}-pine`}>
          <path
            d="M0 0 -23 53 -13 50 -36 82 -21 79 -50 115 -7 106 -7 130 7 130 7 106 50 115 21 79 36 82 13 50 23 53Z"
            fill="currentColor"
          />
        </g>
        <pattern
          id={`${id}-stone`}
          width="36"
          height="22"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 21H36M18 0V21" stroke="#102226" strokeOpacity=".25" />
        </pattern>
      </defs>
      <path fill={paint('sky')} d="M0 0H1000V560H0Z" />
      <circle cx="730" cy="110" r="145" fill={paint('moon')} />
      <circle cx="730" cy="110" r="36" fill="#d3d9bd" opacity=".87" />
      <circle cx="720" cy="99" r="8" fill="#b9c6b0" opacity=".4" />
      <circle cx="744" cy="117" r="13" fill="#b9c6b0" opacity=".35" />
      {[
        [124, 69],
        [242, 110],
        [389, 53],
        [564, 83],
        [860, 44],
        [911, 128],
        [474, 129],
        [60, 137],
        [630, 32],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 1.6 : 0.9}
          fill="#e7dbc0"
          opacity=".6"
        />
      ))}
      <path
        d="M0 250 98 184 156 220 281 120 366 218 443 171 565 251 647 177 758 240 881 153 1000 227V560H0Z"
        fill="#33534f"
        opacity=".72"
      />
      <path
        d="m0 297 125-69 78 34 102-74 143 92 115-56 115 60 114-54 106 60 102-73V560H0Z"
        fill="#2a4e48"
      />
      {Array.from({ length: 23 }, (_, i) => (
        <use
          key={i}
          href={`#${id}-pine`}
          transform={`translate(${i * 48 - 22}, ${238 + (i % 4) * 12}) scale(${0.65 + (i % 3) * 0.18})`}
          color="#24453f"
        />
      ))}
      <path d="M0 335Q240 308 421 350T1000 325V560H0Z" fill="#223c37" />
      <ellipse
        cx="520"
        cy="327"
        rx="530"
        ry="17"
        fill="#afc1aa"
        opacity=".16"
        filter={paint('blur')}
      />
      {scene === 'village' && (
        <>
          <path
            d="M531 443Q545 479 467 510L373 560H729L651 500 617 430Z"
            fill="#8a8970"
            opacity=".57"
          />
          <path d="M668 302h140v130H668Z" fill="#45534a" />
          <path d="m650 312 91-94 95 94Z" fill={paint('roof')} />
          <path d="m741 229 68 73h-69Z" fill="#223944" />
          <path d="M438 260H693V435H438Z" fill={paint('wall')} />
          <path d="M438 260H693V435H438Z" fill={paint('stone')} />
          <path d="m394 283 160-160 183 160Z" fill={paint('roof')} />
          <path d="m554 124 183 159h-38L548 147 419 283h-25Z" fill="#68817b" />
          <path d="m554 141 144 135H419Z" fill="#2b4850" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M${435 + i * 21} ${267 - i * 21}H${688 - i * 23}`}
              stroke="#7c9690"
              strokeOpacity=".25"
              strokeWidth="3"
            />
          ))}
          <path d="M611 202v-82h29v106" fill="#59665c" />
          <path d="M606 118h39v12h-39Z" fill="#879080" />
          <path
            d="M625 112q-38-44-4-65t-3-40"
            stroke="#c2c9b3"
            strokeWidth="18"
            strokeLinecap="round"
            opacity=".14"
            filter={paint('blur')}
          />
          <path
            d="M465 286v143m95-143v146m111-146v146M442 350h248M442 416h250"
            stroke="#24372f"
            strokeWidth="10"
          />
          <path d="M487 300h44v40h-44Z" fill="#dfad62" />
          <path d="M509 300v40m-22-20h44" stroke="#4d4b39" strokeWidth="5" />
          <path d="M596 300h45v40h-45Z" fill="#c98f4e" />
          <path d="M618 300v40m-22-20h45" stroke="#4d4b39" strokeWidth="5" />
          <path d="M516 434v-57a27 27 0 0 1 54 0v57" fill="#e9b96e" />
          <path d="M526 435v-51a17 17 0 0 1 34 0v51" fill="#6b5437" />
          <path d="M552 373v59" stroke="#392f23" strokeWidth="3" />
          <circle cx="548" cy="404" r="2" fill="#f6d995" />
          <ellipse
            cx="542"
            cy="424"
            rx="85"
            ry="65"
            fill={paint('glow')}
            opacity=".4"
          />
          <path
            d="M461 437h205m-214 8h224m-233 9h241"
            stroke="#778173"
            strokeWidth="6"
          />
          <path
            d="M692 339h50m-9-1v18m-34-18v18"
            stroke="#1b2e2d"
            strokeWidth="6"
          />
          <path
            d="M693 355h46v42h-46Z"
            fill="#8c714b"
            stroke="#ba9a61"
            strokeWidth="2"
          />
          <path
            d="m703 386 12-23 13 23m-22-7h20"
            stroke="#e8c584"
            strokeWidth="2"
          />
          <path
            d="M754 438v-85m-12 0h24m-12 0v-16"
            stroke="#18352e"
            strokeWidth="5"
          />
          <circle cx="754" cy="366" r="44" fill={paint('glow')} />
          <path
            d="m745 357 18 0-2 22h-14Z"
            fill="#efc176"
            stroke="#594e36"
            strokeWidth="3"
          />
          <path d="M170 377h160v74H170Z" fill="#425446" />
          <path d="m153 381 80-69 114 69Z" fill="#2c4547" />
          <path d="M191 397h23v25h-23zm78 0h27v25h-27Z" fill="#a77d4a" />
          <path
            d="M803 408v57m45-68v62m44-70v64m-99-30 112-23m-109 47 107-24"
            stroke="#738071"
            strokeWidth="5"
          />
        </>
      )}
      {scene === 'river' && (
        <>
          <path
            d="M555 317q-155 43-76 75t-7 54Q351 490 282 560h444q-136-79-125-111t-58-60q-72-37 55-72Z"
            fill={paint('water')}
          />
          <path
            d="m513 349 53 0m-63 8h43m-21 53h85m-110 35h99m-83 52h182m-250 25h181"
            stroke="#c9d3b8"
            strokeWidth="2"
            opacity=".32"
          />
          <path d="M390 370q117-70 247-7l-4 13q-129-53-239 6Z" fill="#877963" />
          <path
            d="M397 357q117-70 238-7m-233 21v-37m28 28v-43m29 34v-43m28 38v-43m29 39v-43m29 43v-43m29 46v-42m28 49v-42m28 50v-40"
            stroke="#514f43"
            strokeWidth="6"
          />
          <path
            d="M770 294v-86l21-19 21 19v86m-54 0v-38h-22l46-40 48 40h-18"
            fill="#718476"
            opacity=".8"
          />
          <ellipse
            cx="548"
            cy="405"
            rx="191"
            ry="22"
            fill="#b9c7b7"
            opacity=".16"
            filter={paint('blur')}
          />
          <path
            d="m308 447-40-74m32 51 7-43m-16 23-32-11m458 52 28-94m-20 65 36-33m-25 2-8-31"
            stroke="#53705a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="m264 372-5-17m49 29 2-14m432-16 5-17m10 48 12-13"
            stroke="#b39765"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="m254 438 53-10 24 32-79 8Zm414 29 63-33 45 46-109 12Z"
            fill="#30483f"
          />
        </>
      )}
      {scene === 'chapel' && (
        <>
          <path d="M425 409h253l84 151H307Z" fill="#626d5c" />
          <path
            d="M446 399h209m-219 21h230m-244 26h258m-277 30h301"
            stroke="#9a9a7b"
            strokeWidth="6"
          />
          <path d="M422 288h261v121H422Z" fill="#657369" />
          <path d="M422 288h261v121H422Z" fill={paint('stone')} />
          <path d="m397 301 155-134 156 134Z" fill={paint('roof')} />
          <path d="m423 280 129-110 131 111" stroke="#91a295" strokeWidth="8" />
          <path d="M501 218V114l51-39 53 39v105" fill="#76897d" />
          <path d="M492 118 552 63l62 55Z" fill="#2c4348" />
          <path d="M551 64V34m-13 14h27" stroke="#9ba991" strokeWidth="5" />
          <path d="M533 188v-42a20 20 0 0 1 40 0v42Z" fill="#203936" />
          <path
            d="M543 176v-21a10 10 0 0 1 20 0v21"
            fill="#94c8b9"
            opacity=".5"
          />
          <path d="M513 407v-72a39 39 0 0 1 78 0v72" fill="#172f2e" />
          <path
            d="M524 407v-67a28 28 0 0 1 56 0v67"
            stroke="#a8bb9b"
            strokeWidth="3"
          />
          <path
            d="M552 312v32l-11 8 14 10-7 26 11 19"
            stroke="#a5dac4"
            strokeWidth="3"
          />
          <path
            d="M447 345v-28a12 12 0 0 1 24 0v28Zm185 0v-28a12 12 0 0 1 24 0v28Z"
            fill="#334e49"
            stroke="#94a48d"
            strokeWidth="3"
          />
          <circle cx="552" cy="360" r="75" fill={paint('moon')} />
          <path
            d="m523 252 17-9-5-17 20 8 14-15 1 22 22 3-19 12 5 17-23-10-20 11 3-17Z"
            fill="#a2d5bc"
            opacity=".75"
          />
          <path
            d="M421 343q27-23 14-59m242 90q-28-24-18-51m-2 14 22-19m-247-14-24-7"
            stroke="#304f3e"
            strokeWidth="8"
          />
          <path d="m712 453 11-25 31-7 17 17-6 20-35 4Z" fill="#192e2b" />
          <path d="m725 432 3-17 10 9m14-3 9-9 1 21" fill="#192e2b" />
          <path d="M738 437h5m9-1h5" stroke="#c9d298" strokeWidth="3" />
        </>
      )}
      <path
        d="M0 471q142-55 267 14t167 75H0Zm1000-26q-155-24-244 54l-68 61h312Z"
        fill="#17312b"
      />
      <use
        href={`#${id}-pine`}
        transform="translate(64 67) scale(3.6)"
        color="#18382f"
      />
      <use
        href={`#${id}-pine`}
        transform="translate(-27 38) scale(4.2)"
        color="#112d27"
      />
      <use
        href={`#${id}-pine`}
        transform="translate(951 154) scale(2.8)"
        color="#19362e"
      />
      <use
        href={`#${id}-pine`}
        transform="translate(1030 52) scale(4)"
        color="#112b27"
      />
      <path
        d="M0 515q208-29 367 45H0Zm1000-4q-137-18-273 49h273Z"
        fill="#102720"
      />
      {[
        [174, 460],
        [838, 425],
        [327, 418],
        [682, 483],
        [220, 506],
        [869, 486],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="12" fill={paint('glow')} opacity=".55" />
          <circle cx={x} cy={y} r="1.7" fill="#e3c486" />
        </g>
      ))}
      <path fill={paint('shade')} d="M0 370H1000V560H0Z" />
    </svg>
  );
}
