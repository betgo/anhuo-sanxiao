import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isMuted, setMuted, AUDIO_KEYS, BGM_VOL } from "../audio";

const ROOT = join(__dirname, "../..");
const audioDir = join(ROOT, "public/audio");

describe("audio assets", () => {
  it("all ogg files exist under public/audio", () => {
    const names = Object.values(AUDIO_KEYS).map((k) => `${k}.ogg`);
    for (const n of names) {
      expect(existsSync(join(audioDir, n)), n).toBe(true);
    }
  });
});

describe("mute preference", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
    };
  });
  it("defaults unmuted; persists mute flag", () => {
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
    setMuted(false);
    expect(isMuted()).toBe(false);
  });
  it("BGM default volume is 0.35", () => {
    expect(BGM_VOL).toBe(0.35);
  });
});

describe("scenes wire audio", () => {
  const audioSrc = readFileSync(join(ROOT, "src/audio.ts"), "utf8");
  const boot = readFileSync(join(ROOT, "src/scenes/BootScene.ts"), "utf8");
  const battle = readFileSync(join(ROOT, "src/scenes/BattleScene.ts"), "utf8");
  const title = readFileSync(join(ROOT, "src/scenes/TitleScene.ts"), "utf8");
  const select = readFileSync(join(ROOT, "src/scenes/SelectScene.ts"), "utf8");

  it("boot loads audio; menu/battle bgm; mute; unlock; all sfx hooks", () => {
    expect(boot).toMatch(/loadAudio\(this\)/);
    expect(title).toMatch(/AUDIO_KEYS\.bgmMenu/);
    expect(select).toMatch(/AUDIO_KEYS\.bgmMenu/);
    expect(battle).toMatch(/AUDIO_KEYS\.bgmBattle/);
    expect(audioSrc).toMatch(/loop:\s*true/);
    expect(audioSrc).toMatch(/volume:\s*BGM_VOL/);
    expect(audioSrc).toMatch(/W\s*-\s*44/);
    expect(audioSrc).toMatch(/anhuo-sanxiao-muted/);
    expect(audioSrc).toMatch(/unlockAudio/);
    expect(title).toMatch(/unlockAudio/);
    expect(title).toMatch(/addMuteButton/);
    expect(battle).toMatch(/addMuteButton/);
    for (const key of ["swap", "match", "match4", "match5", "hit", "hurt", "skill", "win", "lose"] as const) {
      expect(battle).toMatch(new RegExp(`AUDIO_KEYS\\.${key}`));
    }
  });
});
