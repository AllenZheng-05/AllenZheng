"""Build Allen's handwriting font from the data file saved by the character studio.

Usage:  python scripts/build-hand-font.py [data.json] [output folder]
Defaults: src/assets/hand/allen-studio-data.json and src/assets/hand/
Needs:  pip install fonttools brotli skia-pathops

Input JSON: { "a": [version, ...] }; a version is a list of strokes; a stroke is a list of [x, y, width]
on the studio's 0-100 pad, where the ascender line is y=18, x-height 42, baseline 70, descender 92.
Each letter's versions become alternates that the font cycles through, so repeated letters differ."""
import json, math, pathlib, statistics, sys
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
try:
    import pathops
except ImportError:
    pathops = None
BASE, S, PEN, BEAR = 70, 1000 / 58.0, 4.4, 55   # baseline row, pad unit -> font units, pen width in pad units, side bearing

def ribbon(stroke):
    pts = []
    for (x1, y1, w1), (x2, y2, w2) in zip(stroke, stroke[1:]):
        n = max(1, int(math.hypot(x2 - x1, y2 - y1) / 1.5))
        for j in range(n): pts.append((x1 + (x2 - x1) * j / n, y1 + (y2 - y1) * j / n, w1 + (w2 - w1) * j / n))
    pts.append(tuple(stroke[-1]))
    L, R = [], []
    for i, (x, y, w) in enumerate(pts):
        ax, ay, _ = pts[max(0, i - 1)]; bx, by, _ = pts[min(len(pts) - 1, i + 1)]
        dx, dy = bx - ax, by - ay; d = math.hypot(dx, dy) or 1; h = max(.25, w) * PEN / 2
        L.append((x - dy / d * h, y + dx / d * h)); R.append((x + dy / d * h, y - dx / d * h))
    # round caps at both ends
    def cap(c, prev, w, n=6):
        ang = math.atan2(c[1] - prev[1], c[0] - prev[0]); h = max(.25, w) * PEN / 2
        return [(c[0] + math.cos(ang + math.pi / 2 - math.pi * k / n) * h, c[1] + math.sin(ang + math.pi / 2 - math.pi * k / n) * h) for k in range(1, n)]
    end = cap(pts[-1][:2], pts[-2][:2], pts[-1][2]); start = cap(pts[0][:2], pts[1][:2], pts[0][2])
    return L + end + R[::-1] + start

def glyph(version):
    polys = [ribbon(s) for s in version if len(s) > 1]
    xs = [p[0] for poly in polys for p in poly]
    x0 = min(xs); width = (max(xs) - x0) * S + 2 * BEAR
    to = lambda p: (round((p[0] - x0) * S + BEAR), round((BASE - p[1]) * S))
    pen = TTGlyphPen(None)
    if pathops:
        path = pathops.Path()
        for poly in polys:
            one = pathops.Path(); q = [to(p) for p in poly]; one.moveTo(*q[0])
            for p in q[1:]: one.lineTo(*p)
            one.close(); one.simplify(fix_winding=True)
            path = pathops.op(path, one, pathops.PathOp.UNION) if len(list(path.segments)) else one
        path.draw(pen)
    else:
        for poly in polys:
            q = [to(p) for p in poly]; pen.moveTo(q[0]); [pen.lineTo(p) for p in q[1:]]; pen.closePath()
    return pen.glyph(), round(width)

def build(data, out, family="Allen Hand", K=3):
    order, cmap, glyphs, metrics = [".notdef", "space"], {32: "space"}, {}, {".notdef": (500, 0), "space": (300, 0)}
    glyphs[".notdef"] = TTGlyphPen(None).glyph(); glyphs["space"] = TTGlyphPen(None).glyph()
    sets = [[] for _ in range(K)]
    for ch, versions in data.items():
        if len(ch) != 1 or not versions: continue
        name = "uni%04X" % ord(ch); names = []
        for i, v in enumerate(versions[:K]):
            g, w = glyph(v); n = name if i == 0 else f"{name}.alt{i}"
            order.append(n); glyphs[n] = g; metrics[n] = (w, 0); names.append(n)
        cmap[ord(ch)] = name
        if len(names) > 1:
            for i in range(K): sets[i].append(names[i % len(names)])
    sets[0].append("space")
    for i in range(1, K):
        n = f"space.alt{i}"; order.append(n); glyphs[n] = TTGlyphPen(None).glyph(); metrics[n] = metrics["space"]; sets[i].append(n)
    # curly quotes and long dashes in the site's text use the same drawings as the plain ones
    for alias, plain in ((0x2019, "'"), (0x2018, "'"), (0x201C, '"'), (0x201D, '"'), (0x2014, "–"), (0x2212, "-"), (0xA0, " ")):
        if ord(plain) in cmap: cmap[alias] = cmap[ord(plain)]
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics({n: (w, glyphs[n].xMin if hasattr(glyphs[n], "xMin") and glyphs[n].numberOfContours else 0) for n, (w, _) in metrics.items()})
    asc, desc = round((BASE - 10) * S), -round((96 - BASE) * S)
    fb.setupHorizontalHeader(ascent=asc, descent=desc)
    fb.setupNameTable({"familyName": family, "styleName": "Regular"})
    fb.setupOS2(sTypoAscender=asc, sTypoDescender=desc, usWinAscent=asc, usWinDescent=-desc, sxHeight=round(28 * S), sCapHeight=round(52 * S))
    fb.setupPost()
    if sets[0]:
        cls = lambda xs: "[" + " ".join(xs) + "]"
        fea = "".join(f"@s{i}={cls(x)};" for i, x in enumerate(sets)) + "\nfeature calt { " + " ".join(f"sub @s{i} @s0' by @s{i + 1};" for i in range(K - 1)) + " } calt;"
        addOpenTypeFeaturesFromString(fb.font, fea)
    fb.font.flavor = "woff2"; fb.font.save(out + ".woff2")
    return len(order) - 2

def chaikin(st):
    if len(st) < 3: return st
    out = [st[0]]
    for a, b in zip(st, st[1:]): out += [(a[0]*.75+b[0]*.25, a[1]*.75+b[1]*.25), (a[0]*.25+b[0]*.75, a[1]*.25+b[1]*.75)]
    return out + [st[-1]]
def trim(st):
    """Drop the tiny wiggle the pen leaves as it lands and lifts: a very short first or last step, or a short step that doubles back."""
    d = lambda a, b: math.hypot(b[0]-a[0], b[1]-a[1])
    def back(a, b, c): return (b[0]-a[0])*(c[0]-b[0]) + (b[1]-a[1])*(c[1]-b[1]) < 0
    while len(st) > 2 and (d(st[-2], st[-1]) < 2.5 or (d(st[-2], st[-1]) < 4.5 and back(st[-3], st[-2], st[-1]))): st.pop()
    while len(st) > 2 and (d(st[0], st[1]) < 2.5 or (d(st[0], st[1]) < 4.5 and back(st[0], st[1], st[2]))): st.pop(0)
    return st

K = 5
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "src/assets/hand/allen-studio-data.json"
out_dir = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "src/assets/hand"
hand = json.load(open(src, encoding="utf-8"))["hand"]
def feats(v):
    pts = [p for st in v for p in st]; xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return [max(xs) - min(xs), max(ys) - min(ys), min(ys), max(ys)]
# Capitals and digits written small read as lowercase (S, P, C, O...), so any that fall well short of the usual
# capital height are scaled up from the baseline to match the rest.
BASE = 70
caps = [BASE - min(p[1] for st in v for p in st) for ch, vs in hand.items() if ch.isupper() or ch.isdigit() for v in vs if any(len(st) > 1 for st in v)]
CAP = statistics.median(caps); grown = []
def grow(ch, v):
    top = min(p[1] for st in v for p in st); h = BASE - top
    if h <= 0 or h >= .84 * CAP: return v
    k = CAP * .94 / h; xs = [p[0] for st in v for p in st]; cx = (min(xs) + max(xs)) / 2; grown.append(ch)
    return [[[cx + (p[0] - cx) * k, BASE + (p[1] - BASE) * k] + list(p[2:]) for p in st] for st in v]
data, report = {}, []
for ch, versions in hand.items():
    versions = [[st for st in v if len(st) > 1] for v in versions]; versions = [v for v in versions if v]
    if ch.isupper() or ch.isdigit(): versions = [grow(ch, v) for v in versions]
    if len(versions) > K:   # keep the K most typical: closest to the median size and position
        F = [feats(v) for v in versions]; med = [statistics.median(c) for c in zip(*F)]
        rank = sorted(range(len(versions)), key=lambda i: sum(abs(a - b) for a, b in zip(F[i], med)))
        keep = sorted(rank[:K]); report.append(f"{ch}:{len(versions)}"); versions = [versions[i] for i in keep]
    out = []
    for v in versions:
        ver = []
        for st in v:
            s = [tuple(p[:2]) for p in st]
            if len(s) == 2 and math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) < 1.2: s = [s[0], (s[0][0] + 1.2, s[0][1] + 1.2)]   # a dot
            s = chaikin(trim(s)); n = len(s)
            ver.append([[round(x, 2), round(y, 2), .95 if i < n - 2 else .6] for i, (x, y) in enumerate(s)])
        out.append(ver)
    data[ch] = out
print("capital height", round(CAP, 1), "| enlarged:", "".join(grown))
print(build(data, str(out_dir / "AllenHand"), "Allen Hand", K), "glyphs;", "chose the most typical", K, "of:", " ".join(report))
