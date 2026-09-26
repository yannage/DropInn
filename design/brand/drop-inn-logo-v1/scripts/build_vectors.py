"""Rebuild the path-only logo from the preserved concept and authored geometry.

Dependencies: Pillow, numpy, vtracer==0.6.15. No font files required.
Run from any directory. Optional --tools adds an isolated dependency directory.
Only the lettering contours are traced; structural geometry is authored below.
"""
from pathlib import Path
import sys, json, io, argparse, xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('--tools')
args = parser.parse_args()
if args.tools:
    sys.path.insert(0, str(Path(args.tools).resolve()))
import numpy as np
from PIL import Image, ImageFilter
import vtracer

ROOT = Path(__file__).resolve().parents[1]
INK, CREAM, GOLD, MOSS = '#161A16', '#FFF4D6', '#E6B84A', '#64784B'
S = 'http://www.w3.org/2000/svg'
ET.register_namespace('', S)

# Broad, deliberately uneven geometry. These are real editable vector shapes.
BEAM = 'M128 153 Q189 116 244 125 L307 134 L389 129 Q468 150 548 137 L590 132 Q690 168 824 151 L1009 127 Q1132 114 1221 79 Q1240 80 1240 101 L1218 127 L1247 155 L1220 159 L1236 188 Q1177 180 1115 164 L1040 180 Q918 197 791 220 Q777 224 760 219 L618 187 Q545 180 481 190 L294 211 Q217 203 138 249 L129 221 L147 186 L126 182 Z'
BOARD = 'M220 259 Q286 244 343 247 L396 257 Q459 262 495 284 L512 299 L530 289 Q691 278 868 260 L879 279 Q921 254 968 251 L1037 238 L1172 240 L1191 322 L1164 345 L1185 365 L1195 461 L1172 474 L1185 481 L1144 500 L1192 517 L1197 619 L1182 644 L1220 838 Q1167 854 1091 851 L1004 841 Q935 822 859 835 L727 851 L613 865 L593 845 L575 867 Q461 883 371 865 L341 872 L356 854 Q284 870 239 857 L222 818 L231 751 L219 744 L222 681 L231 655 L216 650 L247 631 L204 638 L199 620 L211 515 L224 464 L203 449 L208 389 Q210 364 230 342 L205 335 L208 316 L228 300 L210 295 Z'
LEFT_STRAP = 'M313 97 Q333 83 360 84 Q376 84 384 110 Q410 182 406 251 Q400 296 382 316 Q359 327 333 312 Q322 306 330 286 Q344 250 338 203 Q335 159 314 122 Q305 107 313 97 Z'
RIGHT_STRAP = 'M1018 96 Q1040 82 1067 86 Q1082 104 1089 134 Q1110 209 1096 278 Q1094 306 1077 309 L1052 307 Q1032 305 1037 284 Q1047 258 1037 210 Q1033 159 1016 124 Q1008 104 1018 96 Z'
PLAQUE = 'M320 916 Q537 906 719 914 L929 904 L1108 905 L1129 930 L1114 948 L1131 969 L1118 1052 L1125 1070 Q1019 1086 915 1074 L731 1081 Q545 1070 442 1080 L302 1074 L290 1042 L299 1015 L293 989 L312 960 Z'
LEFT_LINK = 'M407 843 Q425 832 436 851 Q451 883 449 929 Q449 950 434 950 Q414 952 411 935 Q409 895 401 866 Q398 850 407 843 Z'
RIGHT_LINK = 'M1011 832 Q1026 822 1038 832 Q1046 842 1038 863 Q1029 892 1030 921 Q1029 940 1014 941 Q996 941 995 925 Q996 887 1001 854 Q1002 840 1011 832 Z'
# Doorway kept deliberately spare; no tiny masonry or wood grain.
ARCH = 'M909 794 Q917 676 947 626 Q978 581 1030 570 Q1060 572 1091 599 L1089 796 Q1002 778 909 794 Z'
ARCH_INNER = 'M938 777 Q944 685 969 649 Q993 610 1035 607 Q1057 608 1072 625 L1068 781 Z'
DOOR = 'M1080 600 Q1103 569 1138 557 L1157 817 L1080 790 Q1067 784 1064 777 L1061 654 Q1061 626 1080 600 Z'

img = np.asarray(Image.open(ROOT/'source/generated-concept.png').convert('RGBA'))
r,g,b,a = (img[:,:,i].astype(float) for i in range(4))
cream = (r>175)&(g>160)&(b>115)&((r-b)<100)&(a>128)

def lettering(ymin, ymax, label):
    mask = cream.copy()
    mask[:ymin] = False
    mask[ymax:] = False
    # A small median cleanup removes source compression fringe, not letter detail.
    raster = Image.fromarray(np.where(mask, 0, 255).astype('uint8')).filter(ImageFilter.MedianFilter(3))
    mem = io.BytesIO(); raster.save(mem, format='PNG')
    traced = ET.fromstring(vtracer.convert_raw_image_to_svg(mem.getvalue(), img_format='png',
        colormode='binary', mode='spline', filter_speckle=12,
        corner_threshold=70, length_threshold=5.0, splice_threshold=45, path_precision=2))
    paths=[]
    for i,p in enumerate(traced.findall(f'{{{S}}}path')):
        attrs={k:v for k,v in p.attrib.items() if k not in ('fill','stroke')}
        attrs['id']=f'{label}-outline-{i+1}'
        paths.append(attrs)
    return paths

LETTERS = {'name': lettering(315,833,'name'), 'website': lettering(930,1060,'website')}
(ROOT/'source/lettering-paths.json').write_text(json.dumps(LETTERS,indent=2)+'\n')

def el(tag, **attrs):
    return ET.Element(f'{{{S}}}{tag}', {k.replace('_','-'):str(v) for k,v in attrs.items()})
def path(parent, identity, d, fill, stroke=None, width=0):
    p=el('path',id=identity,d=d,fill=fill)
    if stroke:
        p.set('stroke',stroke); p.set('stroke-width',str(width))
        p.set('stroke-linecap','round');p.set('stroke-linejoin','round')
    parent.append(p);return p
def circle_path(parent, identity, cx, cy, rx, ry, fill):
    return path(parent,identity,f'M {cx-rx} {cy} a {rx} {ry} 0 1 0 {2*rx} 0 a {rx} {ry} 0 1 0 {-2*rx} 0 Z',fill)

def build(style, website):
    mono=style in ('black-only','cream-only')
    color='#000000' if style=='black-only' else CREAM
    svg=el('svg',version='1.1',viewBox='0 0 1374 1145',width='1374',height='1145',role='img',aria_label='Drop Inn'+(' — playdropinn.com' if website else ''))
    title=el('title');title.text='Drop Inn'+(' — playdropinn.com' if website else '');svg.append(title)
    desc=el('desc');desc.text='Original crooked tavern-sign logo. All artwork and lettering are editable paths. Transparent background. '+style+' variant.';svg.append(desc)
    # Root viewBox is recalculated to the exact rendered ink bounds by export.mjs.
    outer=[('beam',BEAM),('board',BOARD),('left-strap',LEFT_STRAP),('right-strap',RIGHT_STRAP)]
    if website:outer += [('plaque',PLAQUE),('left-link',LEFT_LINK),('right-link',RIGHT_LINK)]
    if style=='dark':
        halo=el('g',id='cream-edge-for-dark-fabric')
        for name,d in outer:path(halo,'edge-'+name,d,CREAM,CREAM,38)
        svg.append(halo)
    structure=el('g',id='sign-structure')
    if mono:
        # Transparent interior: one physical ink color, not a simulated two-color file.
        path(structure,'beam-outline',BEAM,'none',color,14)
        path(structure,'board-outline',BOARD,'none',color,18)
        path(structure,'left-strap',LEFT_STRAP,color)
        path(structure,'right-strap',RIGHT_STRAP,color)
        if website:
            path(structure,'website-plaque-outline',PLAQUE,'none',color,14)
            path(structure,'left-link',LEFT_LINK,color)
            path(structure,'right-link',RIGHT_LINK,color)
    else:
        path(structure,'beam',BEAM,GOLD,INK,18)
        path(structure,'main-board',BOARD,MOSS,INK,18)
        for name,d in [('left-strap',LEFT_STRAP),('right-strap',RIGHT_STRAP)]:path(structure,name,d,GOLD,INK,16)
        circle_path(structure,'left-strap-pin',368,229,13,14,INK)
        circle_path(structure,'right-strap-pin',1070,211,13,14,INK)
        if website:
            path(structure,'website-plaque',PLAQUE,MOSS,INK,16)
            path(structure,'left-link',LEFT_LINK,GOLD,INK,12)
            path(structure,'right-link',RIGHT_LINK,GOLD,INK,12)
    svg.append(structure)
    textgroup=el('g',id='lettering-Drop-Inn',fill=color if mono else CREAM)
    if not mono:
        textgroup.set('stroke',INK);textgroup.set('stroke-width','9');textgroup.set('stroke-linejoin','round');textgroup.set('paint-order','stroke fill')
    for attrs in LETTERS['name']:textgroup.append(el('path',**attrs))
    svg.append(textgroup)
    doorway=el('g',id='welcoming-doorway')
    if mono:
        path(doorway,'arch-outline',ARCH,'none',color,13)
        path(doorway,'inner-arch-outline',ARCH_INNER,'none',color,10)
        path(doorway,'open-door-outline',DOOR,'none',color,13)
        circle_path(doorway,'doorknob',1126,689,9,11,color)
    else:
        path(doorway,'arch-frame',ARCH,GOLD,INK,12)
        path(doorway,'doorway-interior',ARCH_INNER,INK)
        path(doorway,'open-door',DOOR,GOLD,INK,12)
        path(doorway,'door-edge','M1102 578 L1108 799','none',INK,7)
        circle_path(doorway,'doorknob',1126,689,10,13,INK)
    for i,d in enumerate(['M870 638 L897 657','M861 697 L891 701','M876 747 L899 733']):path(doorway,f'welcome-ray-{i+1}',d,'none',color if mono else GOLD,13)
    svg.append(doorway)
    if website:
        url=el('g',id='lettering-playdropinn-com',fill=color if mono else CREAM)
        if not mono:
            url.set('stroke',INK);url.set('stroke-width','6');url.set('stroke-linejoin','round');url.set('paint-order','stroke fill')
        for attrs in LETTERS['website']:url.append(el('path',**attrs))
        svg.append(url)
    name=f'drop-inn-{style}'+('-website' if website else '')
    ET.indent(svg)
    (ROOT/'svg'/f'{name}.svg').write_text(ET.tostring(svg,encoding='unicode')+'\n',encoding='utf-8')
    return name

names=[build(style,website) for style in ('light','dark','black-only','cream-only') for website in (False,True)]
print(json.dumps({'built':names, 'name_paths':len(LETTERS['name']), 'website_paths':len(LETTERS['website'])}))
