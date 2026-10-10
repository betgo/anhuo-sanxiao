# UI v3（方案 C）

选型：分区干净，上下不相交。

| 落盘路径 | 用途 |
|---------|------|
| `public/art/bg-battle.png` | 上区战场背景 420×328 |
| `public/art/board-panel.png` | 下区棋盘框（仅包 7×6，勿整页拉伸） |
| `public/art/ui-log-btn.png` | 日志按钮 48×48 |
| `public/art/ui-mute.png` | 静音 48×48 |
| `public/art/ui-skill-cleave.png` | 裂击圆钮 64×64 |
| `public/art/ui-skill-class.png` | 职业技圆钮 64×64 |
| `public/art/ui-log-panel.png` | 日志弹层 |
| `public/art/bead-*.png` | 四色珠 32×32（沿用） |
| `public/art/v3/ui/battle-c.png` | 概念参考 |

开发接入：上区只铺 bg，下区单独放 board，两层矩形不相交。
