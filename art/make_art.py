#!/usr/bin/env python3
"""Pixel art boards for 暗火三消 chapter 1. Visual only, no game rules."""
from PIL import Image, ImageDraw, ImageFont

OUT = "/workspace/anhuo-art"
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_R = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

# dungeon palette
INK = (18, 12, 8, 255)
BG = (26, 18, 12, 255)
PANEL = (42, 29, 20, 255)
EDGE = (107, 74, 48, 255)
EDGE_DK = (58, 38, 24, 255)
CREAM = (240, 226, 200, 255)
MUTED = (203, 184, 154, 255)
GOLD = (226, 180, 52, 255)
BONE = (239, 230, 214, 255)
BONE2 = (196, 176, 148, 255)
RED = (226, 59, 50, 255)
RED_DK = (140, 32, 28, 255)
BLUE = (60, 125, 224, 255)
BLUE_LT = (159, 215, 255, 255)
GREEN = (58, 170, 85, 255)
GREEN_DK = (20, 90, 46, 255)
YELLOW = (226, 180, 52, 255)
YEL_LT = (255, 224, 130, 255)
RUST = (168, 90, 50, 255)
RUST_DK = (110, 52, 28, 255)
PURP = (122, 78, 163, 255)
PURP_LT = (186, 150, 220, 255)
STONE = (140, 128, 110, 255)
STONE_DK = (78, 70, 60, 255)
FLESH = (214, 150, 112, 255)
GHOST = (160, 220, 210, 255)
GHOST_LT = (220, 245, 238, 255)
METAL = (168, 168, 176, 255)
ORANGE = (226, 90, 42, 255)

def S(w, h, fill=None):
    im = Image.new("RGBA", (w, h), fill or (0, 0, 0, 0))
    return im

def pix(im, x, y, c):
    if c is None:
        return
    if 0 <= x < im.size[0] and 0 <= y < im.size[1]:
        im.putpixel((int(x), int(y)), c)

def rect(im, x, y, w, h, c):
    for yy in range(int(y), int(y + h)):
        for xx in range(int(x), int(x + w)):
            pix(im, xx, yy, c)

def frame(im, x, y, w, h, c, t=1):
    rect(im, x, y, w, t, c)
    rect(im, x, y + h - t, w, t, c)
    rect(im, x, y, t, h, c)
    rect(im, x + w - t, y, t, h, c)

def outline(im, c=INK):
    src = im.copy()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if src.getpixel((x, y))[3] == 0:
                hit = False
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src.getpixel((nx, ny))[3] > 200:
                        hit = True
                        break
                if hit:
                    im.putpixel((x, y), c)

def up(im, n):
    return im.resize((im.size[0] * n, im.size[1] * n), Image.NEAREST)

def paste(dst, src, x, y):
    dst.alpha_composite(src, (int(x), int(y)))

# ---------- sprites, 32x36 logical ----------

def spr_bone():
    im = S(32, 36)
    # spear
    rect(im, 22, 4, 2, 26, BONE2)
    rect(im, 21, 2, 4, 4, METAL)
    rect(im, 22, 3, 2, 2, CREAM)
    # skull
    rect(im, 8, 4, 12, 10, BONE)
    rect(im, 10, 7, 3, 3, INK)
    rect(im, 15, 7, 3, 3, INK)
    pix(im, 11, 8, RED)
    pix(im, 16, 8, RED)
    rect(im, 12, 11, 4, 2, INK)
    rect(im, 11, 12, 1, 1, BONE)
    rect(im, 16, 12, 1, 1, BONE)
    # ribs
    rect(im, 10, 15, 10, 8, BONE2)
    for i in range(3):
        rect(im, 11, 16 + i * 2, 8, 1, INK)
    rect(im, 14, 15, 2, 8, BONE)
    # arms
    rect(im, 6, 16, 4, 2, BONE)
    rect(im, 5, 18, 2, 5, BONE)
    rect(im, 20, 16, 3, 2, BONE)
    # legs
    rect(im, 11, 23, 3, 8, BONE)
    rect(im, 16, 23, 3, 8, BONE)
    rect(im, 10, 30, 5, 2, BONE2)
    rect(im, 16, 30, 5, 2, BONE2)
    outline(im)
    return im

def spr_wisp():
    im = S(32, 36)
    # floating flame, no feet
    rect(im, 12, 28, 8, 2, BLUE)
    rect(im, 10, 22, 12, 7, BLUE)
    rect(im, 8, 16, 16, 8, BLUE)
    rect(im, 11, 10, 10, 8, BLUE_LT)
    rect(im, 13, 6, 6, 6, CREAM)
    rect(im, 14, 4, 4, 3, CREAM)
    # eyes
    rect(im, 12, 16, 2, 3, INK)
    rect(im, 18, 16, 2, 3, INK)
    pix(im, 12, 16, BLUE_LT)
    pix(im, 18, 16, BLUE_LT)
    # wisps
    rect(im, 6, 20, 2, 4, BLUE_LT)
    rect(im, 24, 18, 2, 5, BLUE_LT)
    rect(im, 9, 8, 2, 3, CREAM)
    outline(im)
    return im

def spr_rat():
    im = S(32, 36)
    # tail
    rect(im, 2, 16, 6, 2, GREEN_DK)
    rect(im, 1, 14, 2, 3, GREEN_DK)
    # body
    rect(im, 7, 16, 16, 8, GREEN)
    rect(im, 8, 14, 12, 3, GREEN)
    rect(im, 20, 13, 8, 7, GREEN)  # head
    rect(im, 24, 11, 3, 3, GREEN)  # ear
    rect(im, 26, 12, 2, 2, FLESH)
    # eye
    rect(im, 24, 15, 2, 2, INK)
    pix(im, 24, 15, RED)
    # teeth
    rect(im, 27, 18, 2, 2, BONE)
    # pustules
    rect(im, 10, 17, 2, 2, YEL_LT)
    rect(im, 15, 19, 2, 2, YEL_LT)
    rect(im, 12, 21, 2, 2, GREEN_DK)
    # feet
    rect(im, 9, 24, 3, 2, GREEN_DK)
    rect(im, 16, 24, 3, 2, GREEN_DK)
    rect(im, 22, 20, 3, 2, GREEN_DK)
    outline(im)
    return im

def spr_statue():
    im = S(32, 36)
    # pedestal
    rect(im, 6, 30, 20, 3, STONE_DK)
    rect(im, 8, 28, 16, 3, STONE)
    # block body
    rect(im, 9, 14, 14, 14, STONE)
    rect(im, 11, 16, 10, 8, STONE_DK)
    # head block
    rect(im, 10, 4, 12, 10, STONE)
    rect(im, 12, 7, 3, 2, INK)
    rect(im, 17, 7, 3, 2, INK)
    rect(im, 14, 10, 4, 1, STONE_DK)
    # arms as slabs
    rect(im, 4, 16, 5, 3, STONE)
    rect(im, 23, 16, 5, 3, STONE)
    rect(im, 4, 19, 3, 6, STONE)
    rect(im, 25, 19, 3, 6, STONE)
    # crack
    pix(im, 15, 6, STONE_DK)
    pix(im, 16, 5, STONE_DK)
    pix(im, 16, 18, INK)
    pix(im, 17, 19, INK)
    pix(im, 17, 20, INK)
    outline(im)
    return im

def spr_shield_skel():
    im = S(32, 36)
    # big shield
    rect(im, 3, 8, 12, 20, METAL)
    rect(im, 5, 10, 8, 16, STONE_DK)
    rect(im, 7, 14, 4, 8, RUST)
    rect(im, 8, 17, 2, 2, GOLD)
    # skull peeking
    rect(im, 16, 6, 10, 9, BONE)
    rect(im, 18, 8, 2, 2, INK)
    rect(im, 22, 8, 2, 2, INK)
    pix(im, 18, 8, RED)
    pix(im, 22, 8, RED)
    rect(im, 19, 12, 4, 1, INK)
    # body behind shield
    rect(im, 17, 16, 8, 8, BONE2)
    rect(im, 18, 24, 2, 7, BONE)
    rect(im, 22, 24, 2, 7, BONE)
    rect(im, 17, 30, 4, 2, BONE2)
    rect(im, 21, 30, 4, 2, BONE2)
    # sword tip
    rect(im, 26, 18, 2, 10, METAL)
    rect(im, 25, 16, 4, 3, BONE)
    outline(im)
    return im

def spr_ghost():
    im = S(32, 36)
    # speed streaks
    rect(im, 2, 12, 5, 1, GHOST)
    rect(im, 1, 16, 4, 1, GHOST_LT)
    rect(im, 3, 22, 4, 1, GHOST)
    # sheet
    rect(im, 10, 6, 14, 8, GHOST_LT)
    rect(im, 8, 12, 18, 12, GHOST)
    rect(im, 10, 24, 4, 4, GHOST)
    rect(im, 16, 24, 4, 5, GHOST)
    rect(im, 22, 24, 4, 3, GHOST)
    # face
    rect(im, 13, 12, 3, 3, INK)
    rect(im, 19, 12, 3, 3, INK)
    rect(im, 15, 18, 6, 2, INK)
    pix(im, 14, 12, CREAM)
    pix(im, 20, 12, CREAM)
    outline(im)
    return im

def spr_rust_guard():
    im = S(32, 36)
    # helmet
    rect(im, 9, 3, 14, 6, RUST_DK)
    rect(im, 10, 8, 12, 6, RUST)
    rect(im, 12, 10, 8, 2, INK)
    pix(im, 13, 10, RED)
    pix(im, 17, 10, RED)
    # plate
    rect(im, 8, 15, 16, 10, RUST)
    rect(im, 10, 17, 12, 6, RUST_DK)
    rect(im, 14, 16, 4, 4, GOLD)
    # rust spots
    rect(im, 9, 20, 2, 2, RUST_DK)
    rect(im, 20, 18, 2, 2, ORANGE)
    # arms
    rect(im, 4, 16, 4, 3, RUST)
    rect(im, 3, 19, 3, 6, RUST_DK)
    rect(im, 24, 16, 4, 3, RUST)
    rect(im, 26, 18, 2, 8, METAL)  # sword
    rect(im, 25, 16, 4, 2, BONE2)
    # legs
    rect(im, 10, 25, 4, 7, RUST_DK)
    rect(im, 18, 25, 4, 7, RUST_DK)
    rect(im, 9, 31, 6, 2, INK)
    rect(im, 17, 31, 6, 2, INK)
    outline(im)
    return im

def spr_golem():
    im = S(32, 36)
    rect(im, 7, 30, 18, 3, STONE_DK)
    rect(im, 8, 14, 16, 16, STONE)
    rect(im, 10, 4, 12, 11, STONE)
    # rune eyes
    rect(im, 12, 7, 3, 3, PURP_LT)
    rect(im, 17, 7, 3, 3, PURP_LT)
    # chest rune
    rect(im, 14, 18, 4, 6, PURP)
    rect(im, 15, 19, 2, 4, PURP_LT)
    pix(im, 13, 20, PURP_LT)
    pix(im, 18, 20, PURP_LT)
    pix(im, 15, 17, PURP)
    # arms
    rect(im, 3, 16, 5, 4, STONE)
    rect(im, 3, 20, 4, 7, STONE_DK)
    rect(im, 24, 16, 5, 4, STONE)
    rect(im, 25, 20, 4, 7, STONE_DK)
    # rune on arm
    rect(im, 4, 22, 2, 2, PURP_LT)
    outline(im)
    return im

def spr_axe():
    im = S(32, 36)
    # huge axe head
    rect(im, 2, 6, 10, 12, METAL)
    rect(im, 3, 7, 8, 10, STONE_DK)
    rect(im, 4, 10, 4, 4, RED)
    rect(im, 11, 10, 2, 16, RUST_DK)  # haft
    # horns + head
    rect(im, 16, 2, 3, 4, BONE2)
    rect(im, 24, 2, 3, 4, BONE2)
    rect(im, 17, 5, 10, 8, FLESH)
    rect(im, 19, 7, 2, 2, INK)
    rect(im, 23, 7, 2, 2, INK)
    pix(im, 19, 7, RED)
    pix(im, 23, 7, YELLOW)
    rect(im, 20, 10, 4, 2, INK)
    # body
    rect(im, 16, 14, 12, 10, RED_DK)
    rect(im, 18, 16, 8, 6, RED)
    # legs
    rect(im, 17, 24, 4, 8, RED_DK)
    rect(im, 23, 24, 4, 8, RED_DK)
    rect(im, 16, 31, 6, 2, INK)
    rect(im, 22, 31, 6, 2, INK)
    outline(im)
    return im

def spr_lord():
    im = S(32, 36)
    # cape
    rect(im, 6, 12, 20, 20, (90, 24, 28, 255))
    rect(im, 8, 14, 16, 16, (120, 28, 32, 255))
    # crown
    rect(im, 10, 2, 12, 3, GOLD)
    rect(im, 10, 0, 2, 3, GOLD)
    rect(im, 15, 0, 2, 3, YEL_LT)
    rect(im, 20, 0, 2, 3, GOLD)
    pix(im, 15, 1, RED)
    # face
    rect(im, 11, 5, 10, 8, FLESH)
    rect(im, 13, 7, 2, 2, INK)
    rect(im, 17, 7, 2, 2, INK)
    pix(im, 13, 7, GOLD)
    pix(im, 17, 7, GOLD)
    rect(im, 14, 10, 4, 1, INK)
    # armor
    rect(im, 11, 14, 10, 10, (40, 28, 36, 255))
    rect(im, 14, 16, 4, 4, GOLD)
    rect(im, 15, 17, 2, 2, RED)
    # scepter
    rect(im, 23, 8, 2, 16, GOLD)
    rect(im, 22, 6, 4, 3, RED)
    # boots
    rect(im, 10, 30, 5, 3, INK)
    rect(im, 17, 30, 5, 3, INK)
    outline(im)
    return im

def spr_hero(accent):
    im = S(32, 36)
    # hood
    rect(im, 9, 3, 14, 6, accent)
    rect(im, 11, 7, 10, 7, FLESH)
    rect(im, 13, 9, 2, 2, INK)
    rect(im, 17, 9, 2, 2, INK)
    rect(im, 14, 12, 4, 1, INK)
    # cloak
    rect(im, 8, 14, 16, 12, accent)
    rect(im, 12, 16, 8, 8, (48, 32, 24, 255))
    # rust sword
    rect(im, 23, 10, 2, 14, RUST)
    rect(im, 22, 8, 4, 3, BONE2)
    rect(im, 22, 23, 4, 2, RUST_DK)
    # legs
    rect(im, 11, 26, 4, 6, (48, 32, 24, 255))
    rect(im, 17, 26, 4, 6, (48, 32, 24, 255))
    rect(im, 10, 31, 6, 2, INK)
    rect(im, 16, 31, 6, 2, INK)
    outline(im)
    return im

def icon_sword():
    im = S(16, 16)
    rect(im, 7, 1, 2, 9, RUST)
    rect(im, 8, 2, 1, 7, ORANGE)
    rect(im, 5, 9, 6, 2, BONE2)
    rect(im, 7, 11, 2, 3, RUST_DK)
    pix(im, 6, 4, RUST_DK)
    outline(im)
    return im

def icon_amulet():
    im = S(16, 16)
    rect(im, 7, 1, 2, 3, GOLD)
    rect(im, 4, 4, 8, 8, GOLD)
    rect(im, 6, 6, 4, 4, GREEN)
    rect(im, 7, 7, 2, 2, GREEN_DK)
    rect(im, 5, 12, 6, 2, GOLD)
    outline(im)
    return im

def bead(kind):
    """16x16 gem. Shape differs so the four colors read without relying on hue alone."""
    im = S(16, 16)
    colors = {
        "r": (RED, RED_DK, (255, 160, 140, 255)),
        "b": (BLUE, (24, 60, 140, 255), BLUE_LT),
        "g": (GREEN, GREEN_DK, (170, 240, 170, 255)),
        "y": (YELLOW, (140, 90, 16, 255), YEL_LT),
    }
    base, dk, lt = colors[kind]
    rect(im, 2, 2, 12, 12, base)
    rect(im, 2, 11, 12, 3, dk)
    rect(im, 11, 2, 3, 12, dk)
    rect(im, 3, 3, 4, 2, lt)
    if kind == "r":
        # sword notch
        rect(im, 7, 4, 2, 7, INK)
        rect(im, 5, 8, 6, 2, INK)
    elif kind == "b":
        # droplet
        rect(im, 6, 4, 4, 6, INK)
        rect(im, 7, 3, 2, 2, INK)
        rect(im, 7, 5, 2, 3, BLUE_LT)
    elif kind == "g":
        # cross
        rect(im, 7, 4, 2, 8, INK)
        rect(im, 4, 7, 8, 2, INK)
    else:
        # star
        rect(im, 7, 4, 2, 8, INK)
        rect(im, 4, 7, 8, 2, INK)
        pix(im, 5, 5, INK)
        pix(im, 10, 5, INK)
        pix(im, 5, 10, INK)
        pix(im, 10, 10, INK)
    outline(im)
    return im

ENEMIES = [
    ("游荡骨兵", spr_bone, "只结算红珠"),
    ("蓝焰鬼火", spr_wisp, "裂击解锁"),
    ("腐疫鼠", spr_rat, "开局残血，教绿珠"),
    ("试炼石像", spr_statue, "黄珠按职业"),
    ("持盾骷髅", spr_shield_skel, "开始反击"),
    ("疾行鬼", spr_ghost, "回合收紧"),
    ("锈蚀守卫", spr_rust_guard, "锈剑生效"),
    ("咒印魔像", spr_golem, "职业技解锁"),
    ("重斧魔", spr_axe, "反击加重"),
    ("地牢领主", spr_lord, "后段反击变强"),
]

def font(size, bold=True):
    return ImageFont.truetype(FONT if bold else FONT_R, size)

def text(draw, xy, s, size, fill, bold=True, anchor="lt"):
    f = font(size, bold)
    # crude shadow for pixel feel
    x, y = xy
    draw.text((x + 1, y + 1), s, font=f, fill=INK, anchor=anchor)
    draw.text((x, y), s, font=f, fill=fill, anchor=anchor)

def panel(im, x, y, w, h):
    rect(im, x, y, w, h, PANEL)
    frame(im, x, y, w, h, EDGE, 2)
    frame(im, x + 2, y + 2, w - 4, h - 4, EDGE_DK, 1)

def stone_bg(im):
    w, h = im.size
    rect(im, 0, 0, w, h, BG)
    # brick
    for y in range(0, h, 16):
        shift = 10 if (y // 16) % 2 else 0
        for x in range(-16, w, 28):
            frame(im, x + shift, y, 28, 16, (34, 24, 16, 255), 1)

def bar(im, x, y, w, h, frac, col):
    rect(im, x, y, w, h, INK)
    fw = max(0, int((w - 2) * frac))
    if fw:
        rect(im, x + 1, y + 1, fw, h - 2, col)

def screen_base():
    im = S(440, 780, BG)
    stone_bg(im)
    return im

def make_title():
    im = screen_base()
    panel(im, 24, 36, 392, 700)
    lord = up(spr_lord(), 4)
    paste(im, lord, 156, 70)
    d = ImageDraw.Draw(im)
    text(d, (220, 230), "暗火三消", 48, GOLD, anchor="mt")
    text(d, (220, 292), "像素暗黑 · 三消闯关", 18, MUTED, bold=False, anchor="mt")
    text(d, (220, 322), "一个英雄，三种职业", 16, CREAM, bold=False, anchor="mt")
    # four beads
    for i, k in enumerate("rbgy"):
        paste(im, up(bead(k), 3), 110 + i * 58, 370)
    d = ImageDraw.Draw(im)
    labels = ["红·伤害", "蓝·技能", "绿·治疗", "黄·职业"]
    for i, lab in enumerate(labels):
        text(d, (134 + i * 58, 430), lab, 12, MUTED, bold=False, anchor="mt")
    # button
    rect(im, 120, 490, 200, 48, (58, 38, 24, 255))
    frame(im, 120, 490, 200, 48, GOLD, 2)
    text(d, (220, 502), "进入地牢", 22, CREAM, anchor="mt")
    text(d, (220, 570), "第一章进度  0 / 10", 16, MUTED, bold=False, anchor="mt")
    text(d, (220, 640), "第一章 · 地牢初燃", 14, EDGE, bold=False, anchor="mt")
    return im

def make_select():
    im = screen_base()
    panel(im, 16, 16, 408, 748)
    d = ImageDraw.Draw(im)
    text(d, (36, 32), "第一章 · 地牢初燃", 22, GOLD)
    text(d, (400, 38), "已通关 3 / 10", 14, MUTED, bold=False, anchor="rt")
    text(d, (36, 68), "通关解锁下一关。可打开「全部解锁」跳关试玩。", 13, MUTED, bold=False)
    states = ["已通关", "已通关", "已通关", "可挑战", "未解锁", "未解锁", "未解锁", "未解锁", "未解锁", "未解锁"]
    for i, (name, fn, teach) in enumerate(ENEMIES):
        col = i % 2
        row = i // 2
        x = 32 + col * 196
        y = 100 + row * 112
        locked = states[i] == "未解锁"
        rect(im, x, y, 184, 100, (32, 22, 16, 255) if not locked else (24, 16, 12, 255))
        border = GOLD if states[i] == "已通关" else (EDGE if not locked else (50, 36, 26, 255))
        frame(im, x, y, 184, 100, border, 2)
        sp = up(fn(), 2)
        if locked:
            # dim
            gray = Image.new("RGBA", sp.size, (0, 0, 0, 140))
            sp = sp.copy()
            sp.alpha_composite(gray)
        paste(im, sp, x + 6, y + 14)
        d = ImageDraw.Draw(im)
        num = f"{i+1:02d}"
        text(d, (x + 78, y + 10), num, 12, GOLD)
        text(d, (x + 78, y + 28), name, 16, CREAM if not locked else MUTED)
        text(d, (x + 78, y + 54), states[i], 13, MUTED, bold=False)
        text(d, (x + 78, y + 74), teach, 11, EDGE, bold=False)
    # toggle
    rect(im, 32, 680, 18, 18, INK)
    frame(im, 32, 680, 18, 18, GOLD, 2)
    d = ImageDraw.Draw(im)
    text(d, (58, 678), "全部解锁", 16, CREAM)
    return im

def make_prep():
    im = screen_base()
    panel(im, 16, 16, 408, 748)
    d = ImageDraw.Draw(im)
    text(d, (36, 28), "第 7 关", 14, MUTED, bold=False)
    text(d, (36, 48), "锈蚀守卫", 28, GOLD)
    text(d, (36, 88), "敌血 100 · 回合 11 · 每回合反击 6", 14, MUTED, bold=False)
    text(d, (36, 114), "本关要教：锈剑从这里开始给红珠加伤。", 14, CREAM, bold=False)
    paste(im, up(spr_rust_guard(), 3), 300, 36)
    text(d, (36, 160), "选择职业（战斗中不能换）", 14, MUTED, bold=False)
    classes = [
        ("输出", "黄珠伤害", RED, False),
        ("生存", "黄珠护盾", GREEN, True),
        ("控制", "黄珠定身", PURP, False),
    ]
    heroes = [spr_hero(RED), spr_hero(GREEN), spr_hero(PURP)]
    for i, ((name, sub, col, on), hero) in enumerate(zip(classes, heroes)):
        x = 32 + i * 128
        rect(im, x, 190, 120, 150, (74, 52, 24, 255) if on else (42, 29, 20, 255))
        frame(im, x, 190, 120, 150, GOLD if on else EDGE, 2)
        paste(im, up(hero, 2), x + 28, 198)
        d = ImageDraw.Draw(im)
        text(d, (x + 60, 292), name, 16, CREAM, anchor="mt")
        text(d, (x + 60, 314), sub, 12, MUTED, bold=False, anchor="mt")
    text(d, (36, 356), "生存：黄珠每颗护盾 +4，不吃连击倍率。", 13, MUTED, bold=False)
    # gear
    rect(im, 32, 390, 376, 72, (32, 22, 16, 255))
    frame(im, 32, 390, 376, 72, EDGE, 2)
    paste(im, up(icon_sword(), 3), 44, 400)
    d = ImageDraw.Draw(im)
    text(d, (100, 404), "锈剑", 18, CREAM)
    text(d, (100, 430), "本关生效：红珠每颗基础 +1", 13, GOLD, bold=False)
    text(d, (380, 416), "已装备", 14, MUTED, bold=False, anchor="rt")
    rect(im, 32, 476, 376, 72, (32, 22, 16, 255))
    frame(im, 32, 476, 376, 72, EDGE, 2)
    paste(im, up(icon_amulet(), 3), 44, 486)
    d = ImageDraw.Draw(im)
    text(d, (100, 490), "护符", 18, CREAM)
    text(d, (100, 516), "勾上后绿珠每颗 3 点，不勾是 2 点", 13, MUTED, bold=False)
    # checkbox on
    rect(im, 360, 498, 22, 22, INK)
    frame(im, 360, 498, 22, 22, GOLD, 2)
    text(d, (371, 496), "✓", 16, GOLD, anchor="mt")
    rect(im, 80, 580, 280, 48, (58, 38, 24, 255))
    frame(im, 80, 580, 280, 48, GOLD, 2)
    text(d, (220, 592), "开始战斗", 22, CREAM, anchor="mt")
    text(d, (220, 648), "返回选关", 16, MUTED, bold=False, anchor="mt")
    text(d, (220, 690), "失败不掉已有装备", 13, EDGE, bold=False, anchor="mt")
    return im

def make_battle():
    im = screen_base()
    # shorter content, still a full battle
    panel(im, 12, 12, 416, 756)
    d = ImageDraw.Draw(im)
    text(d, (28, 22), "第 7 / 10 关 · 锈蚀守卫", 14, MUTED, bold=False)
    text(d, (412, 22), "已用回合 3 / 11", 14, CREAM, bold=False, anchor="rt")
    text(d, (28, 46), "本关要教：锈剑让每颗红珠再多 1 点基础伤害。", 13, GOLD, bold=False)
    # enemy
    paste(im, up(spr_rust_guard(), 2), 24, 74)
    d = ImageDraw.Draw(im)
    text(d, (96, 78), "锈蚀守卫", 16, CREAM)
    text(d, (400, 78), "72 / 100", 14, CREAM, bold=False, anchor="rt")
    bar(im, 96, 104, 304, 12, 0.72, RED)
    text(d, (96, 122), "反击 6", 12, MUTED, bold=False)
    # hero
    paste(im, up(spr_hero(GREEN), 2), 24, 150)
    d = ImageDraw.Draw(im)
    text(d, (96, 150), "英雄 · 生存", 16, CREAM)
    text(d, (400, 150), "28 / 34", 14, CREAM, bold=False, anchor="rt")
    bar(im, 96, 174, 304, 12, 28 / 34, (214, 69, 61, 255))
    text(d, (96, 192), "护盾 8 / 22", 12, BLUE_LT, bold=False)
    bar(im, 96, 210, 304, 8, 8 / 22, (126, 176, 214, 255))
    # resources: blue, yellow, shield, stun
    chips = [("蓝 6", BLUE), ("黄 3", YELLOW), ("护盾 8", BLUE_LT), ("定身 1", PURP_LT)]
    for i, (lab, col) in enumerate(chips):
        x = 28 + i * 98
        rect(im, x, 232, 90, 26, INK)
        frame(im, x, 232, 90, 26, col, 2)
        d = ImageDraw.Draw(im)
        text(d, (x + 45, 235), lab, 13, col, anchor="mt")
    d = ImageDraw.Draw(im)
    text(d, (28, 264), "锈剑 +1  ·  护符 每颗 3 点", 12, MUTED, bold=False)
    # board 7x6
    board = [
        "rbygbrr",
        "gyrbgby",
        "brgyrgb",
        "ygbrbry",
        "rbygrgb",
        "gbrygby",
    ]
    ox, oy = 58, 290
    cell = 46
    rect(im, ox - 4, oy - 4, 7 * cell + 8, 6 * cell + 8, INK)
    frame(im, ox - 4, oy - 4, 7 * cell + 8, 6 * cell + 8, EDGE, 2)
    for r in range(6):
        for c in range(7):
            paste(im, up(bead(board[r][c]), 2), ox + c * cell + 6, oy + r * cell + 6)
    # selected gem highlight on r0 c0
    frame(im, ox + 4, oy + 4, 40, 40, CREAM, 2)
    d = ImageDraw.Draw(im)
    text(d, (28, 580), "点一颗珠，再点相邻的一颗。无效交换会退回。", 12, MUTED, bold=False)
    # skills
    rect(im, 28, 608, 184, 64, (58, 38, 24, 255))
    frame(im, 28, 608, 184, 64, GOLD, 2)
    rect(im, 224, 608, 184, 64, (36, 26, 18, 255))
    frame(im, 224, 608, 184, 64, (70, 50, 36, 255), 2)
    d = ImageDraw.Draw(im)
    text(d, (120, 616), "裂击", 18, CREAM, anchor="mt")
    text(d, (120, 642), "蓝×4 · 伤害 22", 12, MUTED, bold=False, anchor="mt")
    text(d, (316, 612), "职业技", 18, (120, 100, 80, 255), anchor="mt")
    text(d, (316, 638), "第 8 关解锁", 12, (120, 100, 80, 255), bold=False, anchor="mt")
    text(d, (220, 688), "技能在交换前放，放了不触发反击。", 12, EDGE, bold=False, anchor="mt")
    text(d, (28, 716), "红当场伤害  ·  绿当场治疗或护盾  ·  蓝和黄会存着", 12, MUTED, bold=False)
    return im

def make_result(win):
    im = screen_base()
    panel(im, 24, 80, 392, 600)
    sp = up(spr_lord() if not win else spr_hero(RED), 4)
    paste(im, sp, 156, 120)
    d = ImageDraw.Draw(im)
    if win:
        text(d, (220, 280), "胜利", 48, GOLD, anchor="mt")
        text(d, (220, 350), "地牢领主倒下了。", 18, CREAM, bold=False, anchor="mt")
        text(d, (220, 384), "第一章通关。装备还在。", 16, MUTED, bold=False, anchor="mt")
        rect(im, 110, 450, 220, 48, (58, 38, 24, 255))
        frame(im, 110, 450, 220, 48, GOLD, 2)
        d = ImageDraw.Draw(im)
        text(d, (220, 462), "返回选关", 20, CREAM, anchor="mt")
    else:
        text(d, (220, 280), "失败", 48, RED, anchor="mt")
        text(d, (220, 350), "英雄倒下。装备还在。", 18, CREAM, bold=False, anchor="mt")
        text(d, (220, 384), "可以重试这一关。", 16, MUTED, bold=False, anchor="mt")
        rect(im, 110, 440, 220, 48, (58, 38, 24, 255))
        frame(im, 110, 440, 220, 48, GOLD, 2)
        d = ImageDraw.Draw(im)
        text(d, (220, 452), "重试", 20, CREAM, anchor="mt")
        text(d, (220, 510), "返回选关", 16, MUTED, bold=False, anchor="mt")
    return im

def enemy_sheet():
    im = S(980, 520, BG)
    stone_bg(im)
    panel(im, 12, 12, 956, 496)
    d = ImageDraw.Draw(im)
    text(d, (28, 22), "第一章 · 十个敌人", 22, GOLD)
    for i, (name, fn, teach) in enumerate(ENEMIES):
        col = i % 5
        row = i // 5
        x = 28 + col * 188
        y = 70 + row * 210
        rect(im, x, y, 176, 196, (32, 22, 16, 255))
        frame(im, x, y, 176, 196, EDGE, 2)
        paste(im, up(fn(), 3), x + 40, y + 12)
        d = ImageDraw.Draw(im)
        text(d, (x + 88, y + 128), f"{i+1:02d}  {name}", 14, CREAM, anchor="mt")
        text(d, (x + 88, y + 154), teach, 12, MUTED, bold=False, anchor="mt")
    return im

def bead_sheet():
    im = S(640, 180, BG)
    stone_bg(im)
    panel(im, 8, 8, 624, 164)
    d = ImageDraw.Draw(im)
    text(d, (24, 18), "四色珠 · 形状也不一样", 16, GOLD)
    items = [("r", "红 · 剑痕 · 伤害"), ("b", "蓝 · 水滴 · 技能"), ("g", "绿 · 十字 · 治疗"), ("y", "黄 · 星 · 职业")]
    for i, (k, lab) in enumerate(items):
        paste(im, up(bead(k), 4), 24 + i * 154, 52)
        d = ImageDraw.Draw(im)
        text(d, (24 + i * 154, 126), lab, 12, CREAM)
    return im

def hero_sheet():
    im = S(720, 220, BG)
    stone_bg(im)
    panel(im, 8, 8, 704, 204)
    d = ImageDraw.Draw(im)
    text(d, (24, 16), "战前三职业 · 锈剑 · 护符", 16, GOLD)
    for i, (name, col) in enumerate([("输出", RED), ("生存", GREEN), ("控制", PURP)]):
        paste(im, up(spr_hero(col), 3), 24 + i * 150, 48)
        d = ImageDraw.Draw(im)
        text(d, (72 + i * 150, 160), name, 14, CREAM, anchor="mt")
    paste(im, up(icon_sword(), 4), 470, 56)
    paste(im, up(icon_amulet(), 4), 580, 56)
    d = ImageDraw.Draw(im)
    text(d, (502, 140), "锈剑", 14, CREAM, anchor="mt")
    text(d, (612, 140), "护符", 14, CREAM, anchor="mt")
    return im

def main():
    files = {
        "enemies.png": enemy_sheet(),
        "beads.png": bead_sheet(),
        "classes.png": hero_sheet(),
        "screen-title.png": make_title(),
        "screen-select.png": make_select(),
        "screen-prep.png": make_prep(),
        "screen-battle.png": make_battle(),
        "screen-win.png": make_result(True),
        "screen-lose.png": make_result(False),
    }
    for i, (name, fn, _) in enumerate(ENEMIES):
        files[f"enemy-{i+1:02d}.png"] = up(fn(), 6)
    files["hero-out.png"] = up(spr_hero(RED), 6)
    files["hero-surv.png"] = up(spr_hero(GREEN), 6)
    files["hero-ctrl.png"] = up(spr_hero(PURP), 6)
    files["icon-sword.png"] = up(icon_sword(), 8)
    files["icon-amulet.png"] = up(icon_amulet(), 8)
    for k in "rbgy":
        files[f"bead-{k}.png"] = up(bead(k), 8)
    for name, im in files.items():
        im.save(f"{OUT}/{name}")
        print(name, im.size)

if __name__ == "__main__":
    main()
