from PIL import Image, ImageDraw
import numpy as np
from collections import deque

def key_bg(im, tol=28):
    """flood-fill near-black background from the borders -> transparent"""
    a = np.array(im.convert('RGBA'))
    h, w = a.shape[:2]
    dark = a[:, :, :3].max(axis=2) <= tol
    mask = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dark[y, x] and not mask[y, x]: mask[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y, x] and not mask[y, x]: mask[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and dark[ny, nx] and not mask[ny, nx]:
                mask[ny, nx] = True; q.append((ny, nx))
    a[mask, 3] = 0
    return Image.fromarray(a)

def spans(profile, min_gap=6, min_len=8):
    idx = np.where(profile)[0]
    out, s, prev = [], None, None
    for i in idx:
        if s is None: s = prev = i; continue
        if i - prev > min_gap: out.append((s, prev)); s = i
        prev = i
    if s is not None: out.append((s, prev))
    return [p for p in out if p[1] - p[0] >= min_len]

def frames(im, n, cell_h):
    alpha = np.array(im)[:, :, 3] > 0
    cols = spans(alpha.any(axis=0))
    cols = sorted(cols, key=lambda c: c[1]-c[0], reverse=True)[:n]
    cols.sort()
    assert len(cols) == n, (len(cols), cols)
    crops = []
    for x0, x1 in cols:
        sub = alpha[:, x0:x1+1]
        ys = np.where(sub.any(axis=1))[0]
        crops.append(im.crop((x0, ys[0], x1+1, ys[-1]+1)))
    mw = max(c.width for c in crops); mh = max(c.height for c in crops)
    s = cell_h / mh
    cw = round(mw * s) + 2
    sheet = Image.new('RGBA', (cw * n, cell_h), (0,0,0,0))
    for i, c in enumerate(crops):
        c = c.resize((max(1, round(c.width*s)), max(1, round(c.height*s))), Image.NEAREST)
        sheet.paste(c, (i*cw + (cw - c.width)//2, cell_h - c.height), c)
    return sheet

def grid_icons(im, cell):
    alpha = np.array(im)[:, :, 3] > 0
    rows = spans(alpha.any(axis=1), 10, 20)
    out = []
    for y0, y1 in rows:
        band = alpha[y0:y1+1]
        for x0, x1 in spans(band.any(axis=0), 10, 20):
            sub = alpha[y0:y1+1, x0:x1+1]
            ys = np.where(sub.any(axis=1))[0]
            out.append(im.crop((x0, y0+ys[0], x1+1, y0+ys[-1]+1)))
    assert len(out) == 8, len(out)
    sheet = Image.new('RGBA', (cell*8, cell), (0,0,0,0))
    for i, c in enumerate(out):
        c = c.copy(); c.thumbnail((cell-8, cell-8), Image.NEAREST)
        sheet.paste(c, (i*cell + (cell-c.width)//2, (cell-c.height)//2), c)
    return sheet

G = 'assets/game/'
frames(key_bg(Image.open('raw/player.png')), 4, 128).save(G+'player-walk.png', optimize=True)
frames(key_bg(Image.open('raw/bug.png')), 4, 64).save(G+'bug-walk.png', optimize=True)
frames(key_bg(Image.open('raw/coin.png')), 6, 48).save(G+'coin.png', optimize=True)
grid_icons(key_bg(Image.open('raw/icons.png')), 128).save(G+'icons.png', optimize=True)
Image.open('raw/portrait.png').convert('RGB').resize((256,256), Image.NEAREST).save(G+'portrait.png', optimize=True)
lv = Image.open('raw/level.png').convert('RGB'); lv.thumbnail((1920, 1920)); lv.save(G+'level.webp', quality=85)
for n, size in (('mascot', 1100), ('badge', 512), ('rival', 512)):
    im = key_bg(Image.open(f'raw/{n}.png'), 22)
    bb = im.getbbox(); im = im.crop(bb); im.thumbnail((size, size), Image.LANCZOS)
    im.save(G+n+'.webp', quality=88)
# OG image
og = Image.new('RGB', (1200, 630), (5,10,6))
m = Image.open(G+'mascot.webp'); m.thumbnail((600, 600)); og.paste(m, (620, 630-m.height), m)
b = Image.open(G+'badge.webp'); b.thumbnail((360,360)); og.paste(b, (140, 135), b)
og.save(G+'og.webp', quality=85)
import os
for f in sorted(os.listdir(G)):
    im = Image.open(G+f); print(f, im.size, os.path.getsize(G+f)//1024, 'KB')
