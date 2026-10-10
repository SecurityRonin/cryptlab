import { test, expect } from '@playwright/test';

/* Tool ④'s "Step through it" replays the pair search one trial swap at a time,
   so a student can see what "keep the swap if the fit improves" means. */
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
const trial = (page) => page.locator('#st_trial').evaluate((t) => ({ ...t.dataset }));

test.describe('④ Pair search, step by step', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-t="1"]');
        await page.click('#b_guess');
        await page.click('#seg button[data-t="2"]');
    });

    test('starts by showing the score as a sum of pair scores', async ({ page }) => {
        await expect(page.locator('#b_stepbox')).toBeHidden();
        await page.click('#b_step');
        await expect(page.locator('#b_stepbox')).toBeVisible();
        const lps = await page.locator('#st_pairs .sp').evaluateAll((s) => s.map((x) => +x.dataset.lp));
        expect(lps.length).toBeGreaterThan(5);
        for (const lp of lps) expect(lp).toBeLessThan(0);   // a log-probability is never positive
        await expect(page.locator('#st_score')).toContainText('fit');
    });

    test('a swap is kept exactly when it raises the score, and only then changes the text', async ({ page }) => {
        await page.click('#b_step');
        const seen = new Set();
        for (let i = 0; i < 400 && seen.size < 2; i++) {
            const before = await page.locator('#b_out').textContent();
            await page.click('#st_next');
            const t = await trial(page);
            const after = await page.locator('#b_out').textContent();
            const improved = +t.after > +t.before + 1e-9;
            expect(t.verdict).toBe(improved ? 'kept' : 'reverted');
            if (improved) expect(after).not.toBe(before);
            else expect(after).toBe(before);
            seen.add(t.verdict);
        }
        expect([...seen].sort()).toEqual(['kept', 'reverted']);
    });

    test('a letter you pinned is never tried in a swap', async ({ page }) => {
        await page.click('#seg button[data-t="1"]');
        await dragTo(page, poolTile(page, 'Q'), slot(page, 0));
        const pinnedCipher = (await page.locator('#subhist .scol').first().locator('.clet').textContent()).trim();
        await page.click('#seg button[data-t="2"]');
        await page.click('#b_step');
        for (let i = 0; i < 60; i++) {
            await page.click('#st_next');
            const t = await trial(page);
            expect(t.a).not.toBe(pinnedCipher);
            expect(t.b).not.toBe(pinnedCipher);
        }
        await expect(slot(page, 0).locator('.tile')).toHaveText('Q');
    });

    test('the climb ends at a peak, then the restarts keep the best of eight', async ({ page }) => {
        await page.click('#b_step');
        await page.click('#st_climb');
        await expect(page.locator('#st_status')).toContainText('peak');
        await page.click('#st_restarts');
        const rows = page.locator('#st_restartlist .rs');
        await expect(rows).toHaveCount(8);
        const fits = await rows.evaluateAll((r) => r.map((x) => +x.dataset.fit));
        const best = +(await page.locator('#st_restartlist .rs.best').getAttribute('data-fit'));
        expect(best).toBe(Math.max(...fits));
        await expect(page.locator('#b_bg')).toContainText(`${best}`);
        await expect(page.locator('#seg button[data-t="3"]')).not.toHaveClass(/lock/);
    });

    test('Undo after stepping restores the board', async ({ page }) => {
        const before = await page.locator('#b_out').textContent();
        await page.click('#b_step');
        await page.click('#st_climb');
        expect(await page.locator('#b_out').textContent()).not.toBe(before);
        await page.click('#b_undo');
        expect(await page.locator('#b_out').textContent()).toBe(before);
        await expect(page.locator('#b_stepbox')).toBeHidden();
    });

    test('changing the board by hand closes the walkthrough', async ({ page }) => {
        await page.click('#b_step');
        await page.click('#st_next');
        await dragTo(page, slot(page, 0).locator('.tile'), slot(page, 1));
        await expect(page.locator('#b_stepbox')).toBeHidden();
    });
});
