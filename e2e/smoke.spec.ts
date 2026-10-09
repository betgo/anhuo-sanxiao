import { test, expect } from "@playwright/test";

/**
 * Phaser 渲染珠子在 canvas 上，没有 DOM `.bead`。
 * 冒烟只断言：首页标题、#game、canvas 出现；再点进战斗后 canvas 仍在。
 * 不做像素/截图对比。
 */
test("homepage loads with canvas", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle(/暗火三消/);
  await expect(page.locator("#game")).toBeVisible();
  const canvas = page.locator("#game canvas");
  await expect(canvas).toBeVisible({ timeout: 30_000 });
});

test("enter battle keeps canvas (beads are canvas sprites, not DOM)", async ({ page }) => {
  await page.goto("./");
  const canvas = page.locator("#game canvas");
  await expect(canvas).toBeVisible({ timeout: 30_000 });

  // Game logical size 420x780; Scale.FIT maps CSS box → game coords.
  const clickGame = async (gx: number, gy: number) => {
    const box = await canvas.boundingBox();
    if (!box) throw new Error("no canvas box");
    await page.mouse.click(box.x + (gx / 420) * box.width, box.y + (gy / 780) * box.height);
  };

  // Title: 「进入地牢」 button center ~ (210, 460)
  await page.waitForTimeout(800);
  await clickGame(210, 460);
  await page.waitForTimeout(600);
  // Select: first level row center ~ (210, 88)
  await clickGame(210, 88);
  await page.waitForTimeout(600);
  // Prep: 「开始战斗」 ~ (210, 530)
  await clickGame(210, 530);
  await page.waitForTimeout(1200);

  await expect(canvas).toBeVisible();
  await expect(page.locator("#game canvas")).toHaveCount(1);
});
