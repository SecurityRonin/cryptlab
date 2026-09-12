import { test, expect } from '@playwright/test';

/* Pointer Events, not HTML5 drag-and-drop, so dragTo() will not drive the board.
   page.mouse takes viewport coordinates and does NOT auto-scroll, unlike click(). */
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

test.describe('Timeline navigation', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    // the full nine-tab timeline is asserted in modern.test.js; this covers locking only
    test('only the two earned tools start locked', async ({ page }) => {
        const locked = await page.locator('#seg button.lock').evaluateAll((bs) =>
            bs.map((b) => b.firstChild.textContent.trim()),
        );
        expect(locked).toEqual(['④ Bigrams', '⑤ Cribs']);
    });

    test('a locked tab refuses to open', async ({ page }) => {
        await page.click('#seg button[data-t="3"]');
        await expect(page.locator('section#brk')).not.toHaveClass(/on/);
        await expect(page.locator('section#enc')).toHaveClass(/on/);
    });

    test('②, ④ and ⑤ share one panel and one board', async ({ page }) => {
        await page.click('#seg button[data-t="1"]');
        const ciphertext = await page.locator('#b_in').inputValue();
        await page.click('#b_guess');
        await page.click('#seg button[data-t="2"]');
        await expect(page.locator('section#brk')).toHaveClass(/on/);
        expect(await page.locator('#b_in').inputValue()).toBe(ciphertext);
        await expect(page.locator('#tool2')).toBeVisible();
        await expect(page.locator('#tool1')).toBeHidden();
    });

    test('the era label changes with the tool', async ({ page }) => {
        await page.click('#seg button[data-t="1"]');
        await expect(page.locator('#b_era')).toContainText('c. 850');
        await page.click('#b_guess');
        await page.click('#seg button[data-t="2"]');
        await expect(page.locator('#b_era')).toContainText('1922');
        await page.click('#b_bigram');
        await page.click('#seg button[data-t="3"]');
        await expect(page.locator('#b_era')).toContainText('1940');
    });
});

test.describe('① Caesar — exhaustive key search', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="cae"]');
    });

    test('shows all 25 candidate decryptions, unscored until asked', async ({ page }) => {
        await expect(page.locator('#c_grid .srow')).toHaveCount(25);
        await expect(page.locator('#c_grid .srow.best')).toHaveCount(0);
        await page.click('#c_score');
        await expect(page.locator('#c_grid .srow.best')).toHaveCount(1);
    });

    test('the best-scoring row is the true key, for every challenge', async ({ page }) => {
        const n = await page.locator('#c_picker button').count();
        expect(n).toBe(3);
        for (let i = 0; i < n; i++) {
            await page.locator('#c_picker button').nth(i).click();
            await page.click('#c_score');
            await page.locator('#c_grid .srow.best').click();
            await expect(page.locator('#c_meter2')).toContainText('this is the key');
        }
    });

    test('picking a wrong shift is called out rather than accepted', async ({ page }) => {
        await page.click('#c_score');
        const best = await page.locator('#c_grid .srow.best').getAttribute('data-s');
        await page.locator(`#c_grid .srow:not([data-s="${best}"])`).first().click();
        await expect(page.locator('#c_meter2')).toContainText('not English');
    });
});

test.describe('③ Vigenère — key length then columns', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="vig"]');
    });

    test('index of coincidence finds the right key length for each challenge', async ({ page }) => {
        const expected = [3, 5, 7];   // KEY, RONIN, BABBAGE
        await expect(page.locator('#s_ic .icc')).toHaveCount(12);
        for (let i = 0; i < expected.length; i++) {
            await page.locator('#v_picker button').nth(i).click();
            await page.click('#s_icscore');
            expect(+(await page.locator('#s_ic .icc.peak .n').textContent())).toBe(expected[i]);
        }
    });

    test('solving the columns recovers the keyword', async ({ page }) => {
        const keys = ['KEY', 'RONIN', 'BABBAGE'];
        for (let i = 0; i < keys.length; i++) {
            await page.locator('#v_picker button').nth(i).click();
            await page.click('#s_icscore');
            await page.locator('#s_ic .icc.peak').click();
            await expect(page.locator('#s_cols .vcol')).toHaveCount(keys[i].length);
            await page.click('#s_auto');
            await expect(page.locator('#s_key')).toHaveText(keys[i]);
            await expect(page.locator('#s_vacc')).toContainText('solved');
        }
    });

    test('a column can be nudged by hand and the key letter follows', async ({ page }) => {
        await page.click('#s_icscore');
        await page.locator('#s_ic .icc.peak').click();
        const col = page.locator('#s_cols .vcol').first();
        await expect(col.locator('.kl')).toHaveText('A');
        await col.locator('button[data-d="1"]').click();
        await expect(col.locator('.kl')).toHaveText('B');
        await col.locator('button[data-d="-1"]').click();
        await expect(col.locator('.kl')).toHaveText('A');
    });

    test('solving without choosing a key length asks for one first', async ({ page }) => {
        await page.click('#s_auto');
        await expect(page.locator('#s_iclab')).toContainText('Pick a key length first');
    });
});

test.describe('② → ④ → ⑤ escalation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-t="1"]');
    });

    test('④ unlocks after ② runs, ⑤ after ④ runs', async ({ page }) => {
        await expect(page.locator('#seg button[data-t="2"]')).toHaveClass(/lock/);
        await expect(page.locator('#seg button[data-t="3"]')).toHaveClass(/lock/);
        await page.click('#b_guess');
        await expect(page.locator('#seg button[data-t="2"]')).not.toHaveClass(/lock/);
        await expect(page.locator('#seg button[data-t="3"]')).toHaveClass(/lock/);
        await page.click('#seg button[data-t="2"]');
        await page.click('#b_bigram');
        await expect(page.locator('#seg button[data-t="3"]')).not.toHaveClass(/lock/);
    });

    test('② fills every slot and scores itself', async ({ page }) => {
        await page.click('#b_guess');
        await expect(slot(page, 0).locator('.tile')).toHaveText('E');
        await expect(page.locator('#b_acc')).toContainText('letters right');
        const slots = page.locator('#subhist .scol');
        expect(await slots.locator('.slot .tile').count()).toBe(await slots.count());
    });

    // Measured: single-letter ranking scores 0-15% on very short and 21-39% elsewhere.
    // It never solves anything, which is exactly why ④ has to exist.
    test('single letters never solve a message, at any length', async ({ page }) => {
        const score = async () => {
            await page.click('#b_guess');
            return +(await page.locator('#b_acc').textContent()).match(/(\d+)%/)[1];
        };
        await page.locator('#picker .pgroup').nth(0).locator('button').first().click();
        const long = await score();
        await page.locator('#picker .pgroup').nth(3).locator('button').first().click();
        const veryShort = await score();
        expect(long).toBeGreaterThan(veryShort);
        expect(long).toBeLessThan(60);
    });

    test('④ solves a long message that ② could not', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(0).locator('button').first().click();
        await page.click('#b_guess');
        const single = +(await page.locator('#b_acc').textContent()).match(/(\d+)%/)[1];
        await page.click('#seg button[data-t="2"]');
        await page.click('#b_bigram');
        const paired = +(await page.locator('#b_bg').textContent()).match(/Now.*?(\d+)%/s)[1];
        expect(single).toBeLessThan(60);
        expect(paired).toBeGreaterThan(80);
    });

    // The honest failure mode, kept as a teaching point: on 25 letters the pair
    // search reports a near-perfect fit while getting the letters wrong.
    test('on a very short message ④ is confident and wrong', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(3).locator('button').first().click();
        await page.click('#b_guess');
        await page.click('#seg button[data-t="2"]');
        await page.click('#b_bigram');
        const bg = await page.locator('#b_bg').textContent();
        expect(+bg.match(/→\s*(\d+)/)[1]).toBeGreaterThan(90);
        expect(+bg.match(/Now.*?(\d+)%/s)[1]).toBeLessThan(50);
    });

    test('hand-placed letters are pinned and survive a pair pass', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');
        await dragTo(page, poolTile(page, 'Q'), slot(page, 0));
        await expect(slot(page, 0).locator('.tile')).toHaveClass(/pin/);
        await page.click('#seg button[data-t="2"]');
        await page.click('#b_bigram');
        await expect(slot(page, 0).locator('.tile')).toHaveText('Q');
        await expect(page.locator('#b_bg')).toContainText('kept your 1 pinned');
    });

    test('Undo restores the board from before a pair pass', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');
        await page.click('#seg button[data-t="2"]');
        const before = await page.locator('#b_out').textContent();
        await page.click('#b_bigram');
        expect(await page.locator('#b_out').textContent()).not.toBe(before);
        await page.click('#b_undo');
        expect(await page.locator('#b_out').textContent()).toBe(before);
    });

    test('a suggested pair block places BOTH letters in one drag', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');
        await page.click('#seg button[data-t="2"]');

        const block = page.locator('#b_suggest .ptile').first();
        await expect(block).toBeVisible();
        const { c1, c2, p1, p2 } = await block.evaluate((b) => ({ ...b.dataset }));
        await dragTo(page, block, page.locator('#subhist .scol').first().locator('.slot'));

        const at = (c) => page.locator(`#subhist .slot[data-c="${c}"] .tile`);
        await expect(at(c1)).toHaveText(p1);
        await expect(at(c2)).toHaveText(p2);
        await expect(at(c1)).toHaveClass(/pin/);
        await expect(at(c2)).toHaveClass(/pin/);
    });

    test('a pair block dropped off the board changes nothing', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');
        await page.click('#seg button[data-t="2"]');
        const before = await page.locator('#b_out').textContent();

        const block = page.locator('#b_suggest .ptile').first();
        await block.scrollIntoViewIfNeeded();
        const box = await block.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 40, box.y + 40, { steps: 4 });
        await page.mouse.move(20, 20, { steps: 8 });
        await page.mouse.up();

        expect(await page.locator('#b_out').textContent()).toBe(before);
    });
});

test.describe('⑤ Cribs — the probable-word attack', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-t="1"]');
        await page.click('#b_guess');
        await page.click('#seg button[data-t="2"]');
        await page.click('#b_bigram');
        await page.click('#seg button[data-t="3"]');
    });

    test('ranks cipher words by how decisive they are', async ({ page }) => {
        const counts = await page.locator('#c_words .cword em').evaluateAll((es) =>
            es.map((e) => e.textContent),
        );
        expect(counts.length).toBeGreaterThan(0);
        const numeric = counts.filter((c) => c !== '—').map(Number);
        expect(numeric).toEqual([...numeric].sort((a, b) => a - b));  // fewest candidates first
        expect(numeric[0]).toBeGreaterThan(0);
    });

    test('candidates always share the cipher word’s letter pattern', async ({ page }) => {
        await page.locator('#c_words .cword:not(.done)').first().click();
        const word = await page.locator('#c_words .cword.on').getAttribute('data-w');
        const cands = await page.locator('#b_cands .cand').evaluateAll((cs) =>
            cs.map((c) => ({ cw: c.dataset.cw, pw: c.dataset.pw })),
        );
        expect(cands.length).toBeGreaterThan(0);
        const pattern = (w) => {
            const m = {}; let o = '', n = 0;
            for (const ch of w) { if (!(ch in m)) m[ch] = n++; o += m[ch] + ','; }
            return o;
        };
        for (const c of cands) {
            expect(c.cw).toBe(word);
            expect(c.pw.length).toBe(word.length);
            expect(pattern(c.pw)).toBe(pattern(word));
        }
    });

    test('a crib that would undo correct letters is flagged, not hidden', async ({ page }) => {
        await page.locator('#c_words .cword:not(.done)').first().click();
        expect(await page.locator('#b_cands .cand').count()).toBeGreaterThan(0);
        const titles = await page.locator('#b_cands .cand.risky').evaluateAll((cs) => cs.map((c) => c.title));
        for (const t of titles) expect(t).toMatch(/less English|already reads as English/);
    });

    test('dragging a candidate places the whole word, pinned', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(2).locator('button').nth(1).click();
        await page.locator('#c_words .cword:not(.done)').first().click();
        const cand = page.locator('#b_cands .cand').first();
        const { cw, pw } = await cand.evaluate((c) => ({ ...c.dataset }));
        await dragTo(page, cand, page.locator('#subhist .scol').first().locator('.slot'));
        for (let i = 0; i < cw.length; i++) {
            const tile = page.locator(`#subhist .slot[data-c="${cw[i]}"] .tile`);
            await expect(tile).toHaveText(pw[i]);
            await expect(tile).toHaveClass(/pin/);
        }
    });

    test('a typed crib finds every position it could occupy', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(0).locator('button').first().click();
        await page.fill('#c_own', 'the');
        await page.click('#c_try');
        await expect(page.locator('#c_meter')).toContainText(/position/);
        expect(await page.locator('#b_cands .cand').count()).toBeGreaterThan(0);
    });

    test('a crib that cannot be there says so plainly', async ({ page }) => {
        await page.fill('#c_own', 'zzzzzzzzzz');
        await page.click('#c_try');
        await expect(page.locator('#c_meter')).toContainText('the crib is probably not there');
        await expect(page.locator('#b_cands .cand')).toHaveCount(0);
    });
});
