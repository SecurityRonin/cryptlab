import { test } from '@playwright/test';

/* Not an assertion suite — this measures each tool on every challenge so the
   teaching copy can quote numbers that were observed rather than assumed. */
test('measure the tool ladder across the corpus', async ({ page }) => {
    test.setTimeout(300000);
    await page.goto('/');
    await page.click('#seg button[data-t="1"]');

    const pct = async (sel, re) => {
        const t = await page.locator(sel).textContent();
        const m = t.match(re);
        return m ? +m[1] : null;
    };

    const rows = [];
    const groups = await page.locator('#picker .pgroup').count();
    for (let g = 0; g < groups; g++) {
        const band = (await page.locator('#picker .pglabel').nth(g).textContent()).split('·')[0].trim();
        const buttons = page.locator('#picker .pgroup').nth(g).locator('button');
        for (let b = 0; b < (await buttons.count()); b++) {
            const label = (await buttons.nth(b).textContent()).replace(/\d+$/, '').trim();

            await page.click('#seg button[data-t="1"]');
            await buttons.nth(b).click();
            const letters = +(await page.locator('#b_meter').textContent()).match(/(\d+) letters/)[1];

            await page.click('#b_guess');
            const t2 = await pct('#b_acc', /(\d+)%/);

            await page.click('#seg button[data-t="2"]');
            await page.click('#b_bigram');
            const t4 = await pct('#b_bg', /Now.*?(\d+)%/s);

            // ---- ⑤ Accept only cribs that do NOT make the text less English. A human
            // reads the plaintext before accepting; this is the cheapest stand-in for that.
            await page.click('#seg button[data-t="3"]');
            let applied = 0;
            const n = Math.min(3, await page.locator('#c_words .cword:not(.done)').count());
            for (let w = 0; w < n; w++) {
                const word = page.locator('#c_words .cword:not(.done)').nth(w);
                if (!(await word.count())) break;
                await word.click();
                const safe = page.locator('#b_cands .cand:not(.risky)').first();
                if (await safe.count()) { await safe.click(); applied++; }
            }
            let t5 = t4;
            if (applied) {
                await page.click('#seg button[data-t="2"]');
                await page.click('#b_bigram');
                t5 = await pct('#b_bg', /Now.*?(\d+)%/s);
            }

            rows.push(
                `${band.padEnd(11)} ${label.padEnd(27)} ${String(letters).padStart(4)}  ` +
                `②${String(t2).padStart(4)}%  ④${String(t4).padStart(4)}%  ⑤${String(t5).padStart(4)}% (${applied} cribs)`,
            );
        }
    }
    console.log('\nBAND        CHALLENGE                   LTRS  FREQ    PAIRS   CRIBS');
    rows.forEach((r) => console.log(r));
});
