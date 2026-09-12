import { test, expect } from '@playwright/test';

/* Drag helper: the solver uses Pointer Events, not HTML5 drag-and-drop, so
   Playwright's dragTo() will not drive it. Move in two steps — the engine
   ignores movement under 5px, which is what keeps taps working. */
async function dragTo(page, source, target) {
    // page.mouse takes viewport coordinates and does NOT auto-scroll, unlike click()
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

const poolTile = (page, letter) => page.locator(`#engref .tile[data-p="${letter}"]`);
const slot = (page, n) => page.locator('#subhist .scol').nth(n).locator('.slot');

test.describe('CryptLab — page & branding', () => {
    test('loads with the right title', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/CryptLab/);
    });

    test('logo links to securityronin.com', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.brand a[href*="securityronin.com"] img')).toBeVisible();
    });

    test('footer has Netlify and Sponsor badges', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('footer a[href*="netlify.com"]')).toBeVisible();
        await expect(page.locator('footer a[href*="sponsors/h4x0r"]')).toBeVisible();
    });

    test('no console errors on load', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
        await page.goto('/');
        await page.click('nav#seg button[data-p="brk"]');
        expect(errors).toEqual([]);
    });
});

test.describe('Encipher tab', () => {
    test('Caesar shift 3 enciphers correctly', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#e_out')).toHaveText('PHHW PH DW PLGQLJKW');
    });

    test('Vigenère mode changes the output', async ({ page }) => {
        await page.goto('/');
        await page.click('#e_modes button[data-m="vig"]');
        await expect(page.locator('#e_out')).toHaveText('DSRB ZV OG UVUBVOUK');
    });

    test('education sections start collapsed', async ({ page }) => {
        await page.goto('/');
        const first = page.locator('#enc details.edu').first();
        expect(await first.evaluate((d) => d.open)).toBe(false);
    });
});

test.describe('Break tab — challenge corpus', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('nav#seg button[data-p="brk"]');
    });

    test('offers 3 long, 5 medium, 8 short and 4 very short challenges', async ({ page }) => {
        const groups = page.locator('#picker .pgroup');
        await expect(groups).toHaveCount(4);
        await expect(groups.nth(0).locator('button')).toHaveCount(3);
        await expect(groups.nth(1).locator('button')).toHaveCount(5);
        await expect(groups.nth(2).locator('button')).toHaveCount(8);
        await expect(groups.nth(3).locator('button')).toHaveCount(4);
        await expect(page.locator('#picker button')).toHaveCount(20);
    });

    test('bands are ordered longest first and labelled', async ({ page }) => {
        const labels = page.locator('#picker .pglabel');
        await expect(labels.nth(0)).toContainText('Long');
        await expect(labels.nth(1)).toContainText('Medium');
        await expect(labels.nth(2)).toContainText('Short');
        await expect(labels.nth(3)).toContainText('Very short');
    });

    test('length bands really are separated by size', async ({ page }) => {
        const sizes = await page.locator('#picker .pgroup').evaluateAll((gs) =>
            gs.map((g) => [...g.querySelectorAll('button i')].map((i) => +i.textContent)),
        );
        const [long, medium, short, veryShort] = sizes;
        expect(Math.min(...long)).toBeGreaterThan(Math.max(...medium));
        expect(Math.min(...medium)).toBeGreaterThan(Math.max(...short));
        expect(Math.min(...short)).toBeGreaterThan(Math.max(...veryShort));
        expect(Math.max(...veryShort)).toBeLessThan(40);
        expect(Math.min(...long)).toBeGreaterThan(600);
    });

    test('very short messages carry no article and no full stop', async ({ page }) => {
        const plains = await page.locator('#picker .pgroup').nth(3).locator('button').evaluateAll(
            (bs) => bs.map((b) => b.dataset.i),
        );
        for (const i of plains) {
            await page.locator(`#picker button[data-i="${i}"]`).click();
            const solution = await page.locator('#b_solution').textContent();
            expect(solution).not.toMatch(/\bthe\b/i);
            expect(solution.replace(/[“”]/g, '')).not.toMatch(/[.,;:!?]/);
        }
    });

    test('sample-size meter warns on very short and reassures on long', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(3).locator('button').first().click();
        await expect(page.locator('#b_meter')).toContainText('neither tool can work');
        await page.locator('#picker .pgroup').nth(0).locator('button').first().click();
        await expect(page.locator('#b_meter')).toContainText('solid');
    });

    test('selecting a challenge swaps ciphertext and reveals its solution', async ({ page }) => {
        const before = await page.locator('#b_in').inputValue();
        await page.locator('#picker .pgroup').nth(0).locator('button').first().click();
        expect(await page.locator('#b_in').inputValue()).not.toBe(before);
        await expect(page.locator('#b_solution')).toContainText('human ingenuity');
    });
});

test.describe('Break tab — drag-to-assign solver', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('nav#seg button[data-p="brk"]');
    });

    test('histogram renders bars with empty drop slots', async ({ page }) => {
        const cols = page.locator('#subhist .scol');
        expect(await cols.count()).toBeGreaterThan(5);
        await expect(cols.first().locator('.slot')).toBeVisible();
        await expect(cols.first().locator('.slot .tile')).toHaveCount(0);
    });

    test('dragging E from the English row onto the tallest bar decodes it', async ({ page }) => {
        const cipherLetter = await page.locator('#subhist .scol').first().locator('.clet').textContent();
        await dragTo(page, poolTile(page, 'E'), slot(page, 0));
        await expect(slot(page, 0).locator('.tile')).toHaveText('E');
        await expect(poolTile(page, 'E')).toHaveClass(/used/);
        // every occurrence of that cipher letter now reads as a solved 'e'
        const solved = page.locator('#b_out .solved');
        expect(await solved.count()).toBeGreaterThan(0);
        expect(await solved.first().textContent()).toBe('e');
        expect(cipherLetter).toMatch(/^[A-Z]$/);
    });

    test('a placed letter dragged to another bar swaps with what is there', async ({ page }) => {
        await dragTo(page, poolTile(page, 'E'), slot(page, 0));
        await dragTo(page, poolTile(page, 'T'), slot(page, 1));
        await expect(slot(page, 0).locator('.tile')).toHaveText('E');
        await expect(slot(page, 1).locator('.tile')).toHaveText('T');

        await dragTo(page, slot(page, 0).locator('.tile'), slot(page, 1));
        await expect(slot(page, 0).locator('.tile')).toHaveText('T');
        await expect(slot(page, 1).locator('.tile')).toHaveText('E');
    });

    test('a placed letter dragged onto an empty bar moves rather than swaps', async ({ page }) => {
        await dragTo(page, poolTile(page, 'E'), slot(page, 0));
        await dragTo(page, slot(page, 0).locator('.tile'), slot(page, 2));
        await expect(slot(page, 0).locator('.tile')).toHaveCount(0);
        await expect(slot(page, 2).locator('.tile')).toHaveText('E');
    });

    test('dragging a letter off the board removes it and returns it to the pool', async ({ page }) => {
        await dragTo(page, poolTile(page, 'E'), slot(page, 0));
        await expect(poolTile(page, 'E')).toHaveClass(/used/);

        const tile = slot(page, 0).locator('.tile');
        await tile.scrollIntoViewIfNeeded();
        const box = await tile.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 40, box.y + 40, { steps: 4 });
        await page.mouse.move(20, 20, { steps: 8 });   // drop far away from any slot
        await page.mouse.up();

        await expect(slot(page, 0).locator('.tile')).toHaveCount(0);
        await expect(poolTile(page, 'E')).not.toHaveClass(/used/);
    });

    test('a plaintext letter can only ever be in one place', async ({ page }) => {
        // the pool tile is consumed on placement, so E cannot be taken twice
        await dragTo(page, poolTile(page, 'E'), slot(page, 0));
        await dragTo(page, poolTile(page, 'E'), slot(page, 1));
        await expect(slot(page, 1).locator('.tile')).toHaveCount(0);
        expect(await page.locator('#subhist .slot .tile').filter({ hasText: 'E' }).count()).toBe(1);

        // moving the placed one is the only way to relocate it, and it stays unique
        await dragTo(page, slot(page, 0).locator('.tile'), slot(page, 1));
        await expect(slot(page, 0).locator('.tile')).toHaveCount(0);
        await expect(slot(page, 1).locator('.tile')).toHaveText('E');
        expect(await page.locator('#subhist .slot .tile').filter({ hasText: 'E' }).count()).toBe(1);
    });

    test('tapping works as a fallback for pointer-less use', async ({ page }) => {
        await poolTile(page, 'E').click();
        await expect(poolTile(page, 'E')).toHaveClass(/sel/);
        await slot(page, 0).click();
        await expect(slot(page, 0).locator('.tile')).toHaveText('E');
    });

    test('Reset clears the board', async ({ page }) => {
        await dragTo(page, poolTile(page, 'E'), slot(page, 0));
        await page.click('#b_reset');
        await expect(slot(page, 0).locator('.tile')).toHaveCount(0);
        await expect(poolTile(page, 'E')).not.toHaveClass(/used/);
    });
});

/* The lab is built for phones, where the 26-column strips do not fit on screen.
   These check the layout and the drag survive a narrow, touch-capable viewport. */
test.describe('Break tab — on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('nav#seg button[data-p="brk"]');
    });

    test('both letter strips scroll horizontally rather than overflowing', async ({ page }) => {
        for (const id of ['#subhist', '#engref']) {
            const { scrollW, clientW } = await page.locator(id).evaluate((el) => ({
                scrollW: el.scrollWidth,
                clientW: el.clientWidth,
            }));
            expect(clientW).toBeLessThanOrEqual(390);
            expect(scrollW).toBeGreaterThan(clientW);   // scrollable, not clipped
        }
        const bodyOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(bodyOverflow).toBeLessThanOrEqual(1);    // nothing pushes the page sideways
    });

    test('dragging a letter onto a bar works at phone width', async ({ page }) => {
        await dragTo(page, poolTile(page, 'E'), slot(page, 0));
        await expect(slot(page, 0).locator('.tile')).toHaveText('E');
    });

    test('tapping places a letter without a mouse', async ({ page }) => {
        await poolTile(page, 'E').tap();
        await slot(page, 0).tap();
        await expect(slot(page, 0).locator('.tile')).toHaveText('E');
    });

    test('tiles are large enough to hit with a thumb', async ({ page }) => {
        const box = await slot(page, 0).boundingBox();
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(27);
    });
});

test.describe('Break tab — Tool 1 → Tool 2 escalation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('nav#seg button[data-p="brk"]');
    });

    test('Tool 2 starts locked and opens after Tool 1 is used', async ({ page }) => {
        await expect(page.locator('#tool2')).toHaveClass(/locked/);
        await expect(page.locator('#b_bigram')).toBeHidden();
        await page.click('#b_guess');
        await expect(page.locator('#tool2')).not.toHaveClass(/locked/);
        await expect(page.locator('#b_bigram')).toBeVisible();
    });

    test('Guess by frequency fills every slot and scores itself', async ({ page }) => {
        await page.click('#b_guess');
        await expect(slot(page, 0).locator('.tile')).toHaveText('E');
        await expect(page.locator('#b_acc')).toContainText('letters right');
        const slots = page.locator('#subhist .scol');
        expect(await slots.locator('.slot .tile').count()).toBe(await slots.count());
    });

    // Measured: single-letter ranking scores 0-15% on very short and 21-29% on long.
    // It never solves anything, which is precisely why Tool 2 has to exist.
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
        expect(long).toBeLessThan(60);          // the wall Tool 2 is there to climb
    });

    test('pairs solve a long message that single letters could not', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(0).locator('button').first().click();
        await page.click('#b_guess');
        const single = +(await page.locator('#b_acc').textContent()).match(/(\d+)%/)[1];
        await page.click('#b_bigram');
        const paired = +(await page.locator('#b_bg').textContent()).match(/Now.*?(\d+)%/s)[1];
        expect(single).toBeLessThan(60);
        expect(paired).toBeGreaterThan(90);
    });

    // The honest failure mode, and a teaching point in its own right: on 25 letters
    // the pair search reports a perfect fit while getting the letters wrong.
    test('on a very short message the pair search is confident and wrong', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(3).locator('button').first().click();
        await page.click('#b_guess');
        await page.click('#b_bigram');
        const bg = await page.locator('#b_bg').textContent();
        const fit = +bg.match(/→\s*(\d+)/)[1];
        const correct = +bg.match(/Now.*?(\d+)%/s)[1];
        expect(fit).toBeGreaterThan(90);
        expect(correct).toBeLessThan(40);
    });

    test('the pair pass improves the letter-pair fit', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');
        await page.click('#b_bigram');
        const t = await page.locator('#b_bg').textContent();
        const [, from, to] = t.match(/fit\s+(\d+)\s+→\s+(\d+)/);
        expect(+to).toBeGreaterThanOrEqual(+from);
    });

    test('a suggested pair block places BOTH letters in one drag', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');

        const block = page.locator('#b_suggest .ptile').first();
        await expect(block).toBeVisible();
        const { c1, c2, p1, p2 } = await block.evaluate((b) => ({ ...b.dataset }));
        expect(c1).toMatch(/^[A-Z]$/);
        expect(p1).toMatch(/^[A-Z]$/);

        await dragTo(page, block, page.locator('#subhist .scol').first().locator('.slot'));

        const at = (c) => page.locator(`#subhist .slot[data-c="${c}"] .tile`);
        await expect(at(c1)).toHaveText(p1);
        await expect(at(c2)).toHaveText(p2);
        // both arrive pinned, so the next pair pass must respect them
        await expect(at(c1)).toHaveClass(/pin/);
        await expect(at(c2)).toHaveClass(/pin/);
        await expect(page.locator('#b_bg')).toContainText(/[12] letters? pinned/);
    });

    test('a pair block dropped off the board is declined, changing nothing', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');
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

    test('pair suggestions never contradict a letter already on the board', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');
        await dragTo(page, poolTile(page, 'Q'), slot(page, 0));
        const pinnedCipher = await page.locator('#subhist .scol').first().locator('.clet').textContent();

        const proposals = await page.locator('#b_suggest .ptile').evaluateAll((ts) =>
            ts.map((t) => ({ ...t.dataset })),
        );
        for (const p of proposals) {
            if (p.c1 === pinnedCipher) expect(p.p1).toBe('Q');
            if (p.c2 === pinnedCipher) expect(p.p2).toBe('Q');
        }
    });

    test('the pair pass beats single letters on a medium message', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');
        const single = +(await page.locator('#b_acc').textContent()).match(/(\d+)%/)[1];
        await page.click('#b_bigram');
        const paired = +(await page.locator('#b_bg').textContent()).match(/Now.*?(\d+)%/s)[1];
        expect(paired).toBeGreaterThan(single);
    });

    test('letters placed by hand are pinned and survive a pair pass', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');                 // unlocks Tool 2 and clears any pins
        await dragTo(page, poolTile(page, 'Q'), slot(page, 0));
        await expect(slot(page, 0).locator('.tile')).toHaveClass(/pin/);
        await page.click('#b_bigram');
        // Q under the tallest bar is a terrible guess, so only a pin could keep it there
        await expect(slot(page, 0).locator('.tile')).toHaveText('Q');
        await expect(page.locator('#b_bg')).toContainText('kept your 1 pinned');
    });

    test('Undo restores the board from before a pair pass', async ({ page }) => {
        await page.locator('#picker .pgroup').nth(1).locator('button').first().click();
        await page.click('#b_guess');                 // unlocks Tool 2
        await dragTo(page, poolTile(page, 'E'), slot(page, 0));
        const before = await page.locator('#b_out').textContent();
        await page.click('#b_bigram');
        expect(await page.locator('#b_out').textContent()).not.toBe(before);
        await page.click('#b_undo');
        expect(await page.locator('#b_out').textContent()).toBe(before);
    });

    test('switching challenges clears pins and relocks nothing', async ({ page }) => {
        await page.click('#b_guess');
        await page.locator('#picker .pgroup').nth(2).locator('button').first().click();
        await expect(page.locator('#b_bg')).toContainText('0 letters pinned');
        await expect(page.locator('#tool2')).not.toHaveClass(/locked/);
    });
});
