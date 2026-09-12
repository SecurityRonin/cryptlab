import { test } from '@playwright/test';

/* Not an assertion suite — this measures Tool 1 vs Tool 2 on every challenge so
   the teaching copy can quote numbers that were observed rather than assumed. */
test('measure tool 1 vs tool 2 across the corpus', async ({ page }) => {
    test.setTimeout(180000);
    await page.goto('/');
    await page.click('nav#seg button[data-p="brk"]');

    const rows = [];
    const groups = await page.locator('#picker .pgroup').count();
    for (let g = 0; g < groups; g++) {
        const band = (await page.locator('#picker .pglabel').nth(g).textContent()).split('·')[0].trim();
        const buttons = page.locator('#picker .pgroup').nth(g).locator('button');
        for (let b = 0; b < (await buttons.count()); b++) {
            const label = (await buttons.nth(b).textContent()).replace(/\d+$/, '').trim();
            await buttons.nth(b).click();
            const letters = +(await page.locator('#b_meter').textContent()).match(/(\d+) letters/)[1];

            await page.click('#b_guess');
            const t1 = +(await page.locator('#b_acc').textContent()).match(/(\d+)%/)[1];

            await page.click('#b_bigram');
            const bg = await page.locator('#b_bg').textContent();
            const t2 = +bg.match(/Now.*?(\d+)%/s)[1];
            const [, f0, f1] = bg.match(/fit\s+(\d+)\s+→\s+(\d+)/);

            rows.push(`${band.padEnd(11)} ${label.padEnd(28)} ${String(letters).padStart(5)}  t1=${String(t1).padStart(3)}%  t2=${String(t2).padStart(3)}%  fit ${f0}->${f1}`);
        }
    }
    console.log('\nBAND        CHALLENGE                     LTRS   TOOL1    TOOL2   PAIR-FIT');
    rows.forEach((r) => console.log(r));
});
