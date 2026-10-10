import { test, expect } from '@playwright/test';

/* Pressing the tool's main button unlocks the next tab at once; working the
   board by hand earns it too, after any eight actions. */
const poolTile = (page, l) => page.locator(`#engref .tile[data-p="${l}"]`);
const slot = (page, n) => page.locator('#subhist .scol').nth(n).locator('.slot');
const tab = (page, t) => page.locator(`#seg button[data-t="${t}"]`);

test.describe('Earning the next tab by working the board', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-t="1"]');
    });

    test('eight hand placements in ② unlock ④', async ({ page }) => {
        const letters = 'ETAOINSH';
        for (let i = 0; i < 7; i++) {
            await poolTile(page, letters[i]).click();
            await slot(page, i).click();
        }
        await expect(tab(page, 2)).toHaveClass(/lock/);
        await poolTile(page, letters[7]).click();
        await slot(page, 7).click();
        await expect(tab(page, 2)).not.toHaveClass(/lock/);
        await expect(page.locator('#b_acc')).toContainText('now unlocked');
        await expect(tab(page, 3)).toHaveClass(/lock/);           // ② actions never reach past ④
    });

    test('eight actions in ④ unlock ⑤', async ({ page }) => {
        await page.click('#b_guess');
        await tab(page, 2).click();
        await page.click('#b_step');
        for (let i = 0; i < 6; i++) await page.click('#st_next');
        await expect(tab(page, 3)).toHaveClass(/lock/);
        await page.click('#st_next');
        await expect(tab(page, 3)).not.toHaveClass(/lock/);
        await expect(page.locator('#b_bg')).toContainText('now unlocked');
    });
});
