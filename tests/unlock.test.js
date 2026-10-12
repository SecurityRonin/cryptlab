import { test, expect } from '@playwright/test';

/* Pressing the tool's main button unlocks the next tab at once; working the
   board earns it too, after any eight interactions — clicks, drags or keys. */
async function dragTo(page, source, target) {
    await target.scrollIntoViewIfNeeded();
    await source.scrollIntoViewIfNeeded();
    const a = await source.boundingBox();
    const b = await target.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 20, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
}
const poolTile = (page, l) => page.locator(`#engref .tile[data-p="${l}"]`);
const slot = (page, n) => page.locator('#subhist .scol').nth(n).locator('.slot');
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
        await expect(page.locator('#b_unlock1')).toContainText('now unlocked');
        await expect(tab(page, 3)).toHaveClass(/lock/);           // ② interactions never reach past ④
    });

    test('drags count: eight drags in ② unlock ④', async ({ page }) => {
        const letters = 'ETAOINSH';
        for (let i = 0; i < 7; i++) await dragTo(page, poolTile(page, letters[i]), slot(page, i));
        await expect(tab(page, 2)).toHaveClass(/lock/);
        await dragTo(page, poolTile(page, letters[7]), slot(page, 7));
        await expect(tab(page, 2)).not.toHaveClass(/lock/);
        await expect(page.locator('#b_unlock1')).toContainText('now unlocked');   // survives the drop repainting the board
    });

    test('any eight interactions in ④ unlock ⑤, keys included', async ({ page }) => {
        await page.click('#b_guess');
        await tab(page, 2).click();
        await page.click('#b_out');                                     // 1
        await page.locator('#b_in').focus();
        for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');   // 2-7
        await expect(tab(page, 3)).toHaveClass(/lock/);
        await page.keyboard.press('ArrowRight');                        // 8
        await expect(tab(page, 3)).not.toHaveClass(/lock/);
        await expect(page.locator('#b_unlock2')).toContainText('now unlocked');
    });
});
