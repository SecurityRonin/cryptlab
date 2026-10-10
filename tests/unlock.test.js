import { test, expect } from '@playwright/test';

/* Pressing the tool's main button unlocks the next tab at once; working the
   board earns it too, after any eight clicks in the tool. */
const poolTile = (page, l) => page.locator(`#engref .tile[data-p="${l}"]`);
const tab = (page, t) => page.locator(`#seg button[data-t="${t}"]`);

test.describe('Earning the next tab by working the board', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-t="1"]');
    });

    test('any eight clicks in ② unlock ④, even ones that change nothing', async ({ page }) => {
        for (let i = 0; i < 7; i++) await poolTile(page, 'E').click();   // pick up, put down, pick up...
        await expect(tab(page, 2)).toHaveClass(/lock/);
        await poolTile(page, 'E').click();
        await expect(tab(page, 2)).not.toHaveClass(/lock/);
        await expect(page.locator('#b_acc')).toContainText('now unlocked');
        await expect(tab(page, 3)).toHaveClass(/lock/);           // ② clicks never reach past ④
    });

    test('any eight clicks in ④ unlock ⑤', async ({ page }) => {
        await page.click('#b_guess');
        await tab(page, 2).click();
        for (let i = 0; i < 7; i++) await page.click('#b_out');
        await expect(tab(page, 3)).toHaveClass(/lock/);
        await page.click('#b_out');
        await expect(tab(page, 3)).not.toHaveClass(/lock/);
        await expect(page.locator('#b_bg')).toContainText('now unlocked');
    });
});
