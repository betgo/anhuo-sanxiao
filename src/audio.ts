import Phaser from "phaser";
import { W } from "./config";

const MUTE_KEY = "anhuo-sanxiao-muted";
export const BGM_VOL = 0.35;
export const SFX_VOL = 0.45;

export const AUDIO_KEYS = {
  bgmMenu: "bgm-menu",
  bgmBattle: "bgm-battle",
  swap: "sfx-swap",
  match: "sfx-match",
  match4: "sfx-match4",
  match5: "sfx-match5",
  hit: "sfx-hit",
  hurt: "sfx-hurt",
  skill: "sfx-skill",
  win: "sfx-win",
  lose: "sfx-lose",
} as const;

let unlocked = false;
let currentBgm: string | null = null;
let intendedBgm: string | null = null;

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(v: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  } catch {}
}

export function unlockAudio(scene: Phaser.Scene) {
  if (unlocked) return;
  unlocked = true;
  try {
    if (scene.sound.locked) scene.sound.unlock();
  } catch {}
}

export function loadAudio(scene: Phaser.Scene) {
  const pairs: [string, string][] = [
    [AUDIO_KEYS.bgmMenu, "audio/bgm-menu.ogg"],
    [AUDIO_KEYS.bgmBattle, "audio/bgm-battle.ogg"],
    [AUDIO_KEYS.swap, "audio/sfx-swap.ogg"],
    [AUDIO_KEYS.match, "audio/sfx-match.ogg"],
    [AUDIO_KEYS.match4, "audio/sfx-match4.ogg"],
    [AUDIO_KEYS.match5, "audio/sfx-match5.ogg"],
    [AUDIO_KEYS.hit, "audio/sfx-hit.ogg"],
    [AUDIO_KEYS.hurt, "audio/sfx-hurt.ogg"],
    [AUDIO_KEYS.skill, "audio/sfx-skill.ogg"],
    [AUDIO_KEYS.win, "audio/sfx-win.ogg"],
    [AUDIO_KEYS.lose, "audio/sfx-lose.ogg"],
  ];
  for (const [key, path] of pairs) scene.load.audio(key, path);
}

export function playBgm(scene: Phaser.Scene, key: string) {
  intendedBgm = key;
  if (isMuted()) {
    stopBgm(scene);
    return;
  }
  if (currentBgm === key) {
    const existing = scene.sound.get(key);
    if (existing && existing.isPlaying) return;
  }
  stopBgm(scene);
  currentBgm = key;
  intendedBgm = key;
  try {
    scene.sound.play(key, { loop: true, volume: BGM_VOL });
  } catch {}
}

export function resumeIntendedBgm(scene: Phaser.Scene) {
  if (intendedBgm) playBgm(scene, intendedBgm);
}

export function stopBgm(scene: Phaser.Scene) {
  for (const k of [AUDIO_KEYS.bgmMenu, AUDIO_KEYS.bgmBattle]) {
    const s = scene.sound.get(k);
    if (s) {
      try { s.stop(); } catch {}
    }
  }
  currentBgm = null;
}

export function playSfx(scene: Phaser.Scene, key: string, vol = SFX_VOL) {
  if (isMuted()) return;
  try {
    scene.sound.play(key, { volume: vol });
  } catch {}
}

export function applyMuteState(scene: Phaser.Scene) {
  if (isMuted()) {
    stopBgm(scene);
    scene.sound.mute = true;
  } else {
    scene.sound.mute = false;
  }
}

/** Top-right mute toggle. First click also unlocks browser audio. */
export function addMuteButton(scene: Phaser.Scene, onChange?: () => void) {
  const label = () => (isMuted() ? "静音开" : "静音");
  const bg = scene.add.rectangle(W - 44, 22, 72, 24, 0x2a1c14, 0.9)
    .setStrokeStyle(1, 0x8a6240)
    .setInteractive({ useHandCursor: true })
    .setScrollFactor(0)
    .setDepth(3000);
  const tx = scene.add.text(W - 44, 22, label(), {
    fontSize: "12px", color: "#e6d3b0",
  }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);

  const refresh = () => {
    tx.setText(label());
    applyMuteState(scene);
  };
  refresh();

  bg.on("pointerdown", () => {
    unlockAudio(scene);
    setMuted(!isMuted());
    refresh();
    if (!isMuted()) resumeIntendedBgm(scene);
    onChange?.();
  });

  return { bg, tx, refresh };
}
