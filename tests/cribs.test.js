import { test, expect } from '@playwright/test';

/* Selecting a cipher word in ⑤ offers a ranked shortlist to choose from,
   alongside typing your own guess for that same word. */
const pattern = (w) => {
    const m = {}; let o = '', n = 0;
    for (const ch of w) { if (!(ch in m)) m[ch] = n++; o += m[ch] + ','; }
    return o;
};
const rows = (page) => page.locator('#c_ranked .crow');

test.describe('⑤ Cribs — ranked shortlist for the selected word', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-t="1"]');
        await page.locator('#picker .pgroup').nth(2).locator('button').nth(1).click();
        await page.click('#b_guess');
        await page.click('#seg button[data-t="2"]');
        await page.click('#b_bigram');
        await page.click('#seg button[data-t="3"]');
    });

    test('lists up to ten candidates, numbered, best first', async ({ page }) => {
        await expect(rows(page)).toHaveCount(0);
        // the word with the most candidates is the one that can exercise the cap
        const word = page.locator('#c_words .cword:not(.done)').last();
        const total = +(await word.locator('em').textContent());
        await word.click();
        await expect(rows(page)).toHaveCount(Math.min(10, total));
        const data = await rows(page).evaluateAll((rs) =>
            rs.map((r) => ({ rank: r.dataset.rank, fit: +r.dataset.fit, gain: +r.dataset.gain, cw: r.dataset.cw, pw: r.dataset.pw })),
        );
        data.forEach((d, i) => {
            expect(d.rank).toBe(String(i + 1));
            expect(pattern(d.pw)).toBe(pattern(d.cw));
            if (i) {
                const p = data[i - 1];
                expect(p.fit > d.fit || (p.fit === d.fit && p.gain >= d.gain)).toBe(true);
            }
        });
    });

    test('clicking a candidate places the whole word, pinned', async ({ page }) => {
        await page.locator('#c_words .cword:not(.done)').first().click();
        const row = rows(page).first();
        const { cw, pw } = await row.evaluate((r) => ({ ...r.dataset }));
        await row.click();
        for (let i = 0; i < cw.length; i++) {
            const tile = page.locator(`#subhist .slot[data-c="${cw[i]}"] .tile`);
            await expect(tile).toHaveText(pw[i]);
            await expect(tile).toHaveClass(/pin/);
        }
        await expect(page.locator('#c_meter')).toContainText(pw.toLowerCase());
    });

    test('a typed guess is tried against the selected word', async ({ page }) => {
        const word = page.locator('#c_words .cword:not(.done)').first();
        const cw = await word.getAttribute('data-w');
        await word.click();
        await expect(page.locator('#c_own')).toHaveAttribute('placeholder', new RegExp(cw));

        const before = await page.locator('#b_out').textContent();
        await page.fill('#c_own', 'x'.repeat(cw.length + 1));
        await page.click('#c_try');
        await expect(page.locator('#c_meter')).toContainText(`${cw.length} letters`);
        expect(await page.locator('#b_out').textContent()).toBe(before);

        const pw = await rows(page).last().getAttribute('data-pw');
        await page.fill('#c_own', pw.toLowerCase());
        await page.click('#c_try');
        for (let i = 0; i < cw.length; i++) {
            await expect(page.locator(`#subhist .slot[data-c="${cw[i]}"] .tile`)).toHaveText(pw[i]);
        }
    });
});
