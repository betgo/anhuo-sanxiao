export type ClassId = "out" | "surv" | "ctrl";

export type SaveData = {
  cleared: boolean[];
  unlockAll: boolean;
  classId: ClassId;
  amulet: boolean;
};

const KEY = "anhuo-sanxiao-v2";

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && Array.isArray(o.cleared) && o.cleared.length === 10) {
        return {
          cleared: o.cleared.map(Boolean),
          unlockAll: !!o.unlockAll,
          classId: o.classId === "surv" || o.classId === "ctrl" ? o.classId : "out",
          amulet: !!o.amulet,
        };
      }
    }
  } catch {}
  return {
    cleared: Array(10).fill(false),
    unlockAll: false,
    classId: "out",
    amulet: false,
  };
}

export function persist(save: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {}
}
