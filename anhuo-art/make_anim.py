#!/usr/bin/env python3
"""Platform poses: idle / walk / attack. Visual only."""
import sys
sys.path.insert(0, "/workspace/anhuo-art")
from PIL import Image, ImageDraw
import make_art as A

OUT = "/workspace/anhuo-art"

def blank(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))

def shift(im, dx, dy):
    out = blank(*im.size)
    out.alpha_composite(im, (int(dx), int(dy)))
    return out

def split_legs(im, leg=9):
    w, h = im.size
    body = im.crop((0, 0, w, h - leg))
    legs = im.crop((0, h - leg, w, h))
    return body, legs, leg

def idle_frames(im):
    return [im, shift(im, 0, -1)]

def walk_frames(im):
    body, legs, leg = split_legs(im)
    w, h = im.size
    frames = []
    for dx, bob in ((-3, 0), (3, -1), (-3, 0), (3, -1)):
        fr = blank(w, h)
        fr.alpha_composite(body, (0, bob))
        fr.alpha_composite(legs, (dx, h - leg))
        frames.append(fr)
    return frames

def slash(fr, x, y, color, facing):
    w, h = fr.size
    def dot(px, py, c):
        if 0 <= px < w and 0 <= py < h:
            fr.putpixel((px, py), c)
    if facing > 0:
        for i, yy in enumerate((0, 1, 3, 2, 0)):
            dot(x + i, y + yy, color)
        dot(x + 3, y - 2, A.CREAM)
    else:
        for i, yy in enumerate((0, 1, 3, 2, 0)):
            dot(x - i, y + yy, color)
        dot(x - 3, y - 2, A.CREAM)

def attack_frames(im, facing):
    """facing +1 hero lunges right, -1 monster lunges left."""
    w, h = im.size
    wind = shift(im, -facing * 2, 1)
    hit = shift(im, facing * 6, -2)
    slash(hit, (w - 4) if facing > 0 else 8, 12, A.YEL_LT, facing)
    slash(hit, (w - 2) if facing > 0 else 6, 16, A.CREAM, facing)
    back = shift(im, facing, 0)
    return [wind, hit, back]

def downed(im):
    w, h = im.size
    # fall onto the ground, stay where they are
    rot = im.transpose(Image.ROTATE_90)
    out = blank(w, h)
    rw, rh = rot.size
    # sit the fallen body on the bottom
    scale = rot.resize((min(w - 2, rw), min(10, rh)), Image.NEAREST)
    out.alpha_composite(scale, (1, h - scale.size[1] - 1))
    return out

ACTORS = [
    ("hero", lambda: A.spr_hero(A.RED), 1),
    ("enemy-01", A.spr_bone, -1),
    ("enemy-02", A.spr_wisp, -1),
    ("enemy-03", A.spr_rat, -1),
    ("enemy-04", A.spr_statue, -1),
    ("enemy-05", A.spr_shield_skel, -1),
    ("enemy-06", A.spr_ghost, -1),
    ("enemy-07", A.spr_rust_guard, -1),
    ("enemy-08", A.spr_golem, -1),
    ("enemy-09", A.spr_axe, -1),
    ("enemy-10", A.spr_lord, -1),
]

def sheet_one(name, base, facing):
    frames = {
        "idle": idle_frames(base),
        "walk": walk_frames(base),
        "attack": attack_frames(base, facing),
    }
    frames["down"] = [downed(base)]
    # strip
    cell = 36
    labels = [("待机", frames["idle"]), ("走动", frames["walk"]), ("攻击", frames["attack"])]
    if facing < 0:
        labels.append(("倒下", frames["down"]))
    cols = sum(len(f) for _, f in labels)
    im = blank(cols * cell, cell + 4)
    x = 0
    saved = {}
    for key, fl in frames.items():
        saved[key] = fl
        for i, fr in enumerate(fl):
            A.paste if False else None
            im.alpha_composite(fr, (x + 2, 2))
            x += cell
    # redo strip with gaps between groups, taller for label later
    return saved

def build_sheet():
    # one row per actor: idle x2, walk x4, attack x3, (down x1 for enemies)
    cell = 40
    rows = []
    all_frames = {}
    for name, fn, facing in ACTORS:
        base = fn()
        pack = {
            "idle": idle_frames(base),
            "walk": walk_frames(base),
            "attack": attack_frames(base, facing),
        }
        if facing < 0:
            pack["down"] = [downed(base)]
        all_frames[name] = pack
        seq = pack["idle"] + pack["walk"] + pack["attack"] + pack.get("down", [])
        row = blank(len(seq) * cell, cell)
        for i, fr in enumerate(seq):
            row.alpha_composite(fr, (i * cell + 4, 2))
        rows.append((name, row, len(seq)))
    w = max(r.size[0] for _, r, _ in rows) + 90
    h = 28 + len(rows) * (cell + 8)
    canvas = A.S(w, h, A.BG)
    A.stone_bg(canvas)
    A.panel(canvas, 8, 8, w - 16, h - 16)
    d = ImageDraw.Draw(canvas)
    A.text(d, (20, 12), "待机 · 走动 · 攻击 · 倒下（怪）", 14, A.GOLD)
    names = {
        "hero": "英雄",
        "enemy-01": "骨兵",
        "enemy-02": "鬼火",
        "enemy-03": "疫鼠",
        "enemy-04": "石像",
        "enemy-05": "盾骷",
        "enemy-06": "疾鬼",
        "enemy-07": "锈卫",
        "enemy-08": "魔像",
        "enemy-09": "斧魔",
        "enemy-10": "领主",
    }
    for i, (name, row, n) in enumerate(rows):
        y = 40 + i * (cell + 6)
        d = ImageDraw.Draw(canvas)
        A.text(d, (16, y + 8), names[name], 12, A.CREAM)
        canvas.alpha_composite(row, (78, y))
    return canvas, all_frames

def platform_still(frames, phase):
    """phase: enter | overlap | lunge | down"""
    W, H = 520, 220
    im = A.S(W, H, A.BG)
    A.stone_bg(im)
    A.panel(im, 8, 8, W - 16, H - 16)
    # platform floor
    A.rect(im, 28, 168, 464, 10, (58, 40, 26, 255))
    A.rect(im, 28, 176, 464, 4, A.INK)
    d = ImageDraw.Draw(im)
    titles = {
        "enter": "开场：从右侧一个接一个往左走",
        "overlap": "停下后可以重叠，不排成横排",
        "lunge": "打的时候自己跑过去，打完跑回原位",
        "down": "死了原地倒下，别人不挪",
    }
    A.text(d, (20, 16), titles[phase], 14, A.GOLD)

    def put(fr, x, y, scale=2):
        im.alpha_composite(A.up(fr, scale), (int(x), int(y)))

    hero = frames["hero"]
    bone = frames["enemy-01"]
    wisp = frames["enemy-02"]
    lord = frames["enemy-10"]

    # hero always left, idle or hit-react
    if phase == "lunge":
        put(hero["attack"][1], 70, 96)
    else:
        put(hero["idle"][0], 36, 100)

    if phase == "enter":
        # one already stopped near the hero; the next is still walking in from the right
        put(bone["idle"][0], 150, 100)
        put(wisp["walk"][1], 400, 104)
        d = ImageDraw.Draw(im)
        A.text(d, (360, 78), "从右边走进来", 12, A.MUTED, bold=False)
        A.text(d, (140, 78), "先到的更靠左", 12, A.MUTED, bold=False)
    elif phase == "overlap":
        # draw the farther ones first so the front one covers them
        put(lord["idle"][0], 196, 96)
        put(wisp["idle"][1], 176, 110)
        put(bone["idle"][0], 150, 100)
        d = ImageDraw.Draw(im)
        A.text(d, (150, 72), "叠在一起，最靠左是前排", 12, A.GOLD, bold=False)
    elif phase == "lunge":
        # only the front one has run up to the hero; the pile stays where it was
        put(lord["idle"][0], 250, 96)
        put(wisp["idle"][0], 232, 110)
        put(bone["attack"][1], 108, 96)
        d = ImageDraw.Draw(im)
        A.text(d, (100, 72), "这只跑上来打，打完再跑回去", 12, A.MUTED, bold=False)
    else:
        put(lord["idle"][0], 230, 96)
        put(wisp["idle"][0], 200, 108)
        put(bone["down"][0], 150, 118)
        d = ImageDraw.Draw(im)
        A.text(d, (168, 78), "倒下，原地", 12, A.RED, bold=False)
        A.text(d, (250, 78), "其余不动", 12, A.MUTED, bold=False)
    return im

def gif_enter(frames):
    hero = frames["hero"]
    bone = frames["enemy-01"]
    wisp = frames["enemy-02"]
    rat = frames["enemy-03"]
    pics = []
    # 16 frames: three monsters walk in from right and stop overlapping, staggered
    stops = [150, 188, 214]  # not a neat row; piled
    starts = [480, 520, 560]
    for t in range(18):
        im = A.S(440, 200, A.BG)
        A.stone_bg(im)
        A.rect(im, 16, 150, 408, 8, (58, 40, 26, 255))
        d = ImageDraw.Draw(im)
        A.text(d, (16, 12), "从右往左进场，停住后叠在一起", 13, A.GOLD)
        im.alpha_composite(A.up(hero["idle"][t % 2], 2), (24, 86))
        xs = []
        sprites = [bone, wisp, rat]
        for i, sp in enumerate(sprites):
            x = starts[i] - t * 22
            if x < stops[i]:
                x = stops[i]
                fr = sp["idle"][t % 2]
            else:
                fr = sp["walk"][t % 4]
            xs.append(x)
            im.alpha_composite(A.up(fr, 2), (int(x), 86 + (i % 2) * 6))
        pics.append(im.convert("P", palette=Image.ADAPTIVE))
    pics[0].save(
        f"{OUT}/enter.gif",
        save_all=True,
        append_images=pics[1:],
        duration=90,
        loop=0,
        disposal=2,
    )

def main():
    canvas, frames = build_sheet()
    canvas.save(f"{OUT}/anim-sheet.png")
    for phase in ("enter", "overlap", "lunge", "down"):
        platform_still(frames, phase).save(f"{OUT}/platform-{phase}.png")
    gif_enter(frames)
    # also dump individual scaled frames for 开发
    import os
    os.makedirs(f"{OUT}/frames", exist_ok=True)
    for name, pack in frames.items():
        for pose, fl in pack.items():
            for i, fr in enumerate(fl):
                A.up(fr, 4).save(f"{OUT}/frames/{name}-{pose}-{i}.png")
    print("ok", canvas.size)

if __name__ == "__main__":
    main()
