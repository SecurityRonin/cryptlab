import { test, expect } from '@playwright/test';

/* Regression tests for defects found by adversarial review and confirmed by
   measurement. Each asserts the FIX, so the bug cannot quietly return. */

test.describe('Review regressions', () => {
    test('the pad never emits plaintext when the message outgrows it', async ({ page }) => {
        await page.goto('/');
        await page.click('#e_modes button[data-m="pad"]');
        await page.fill('#e_in', 'SHORT');
        const padLen = (await page.locator('#e_pad').textContent()).length;
        await page.fill('#e_in', 'SHORT' + 'X'.repeat(20));
        const outText = await page.locator('#e_out').textContent();
        expect(outText.slice(padLen)).not.toContain('X');      // no clear tail
        expect(outText).toContain('·');                        // withheld, and visibly so
        await expect(page.locator('#e_padmsg')).toContainText('outgrown the pad');
        await page.click('#e_newpad');
        expect(await page.locator('#e_out').textContent()).not.toContain('·');
    });

    test('the pad uses a cryptographic random source, not Math.random', async ({ page }) => {
        await page.goto('/');
        await page.click('#e_modes button[data-m="pad"]');
        await expect(page.locator('#e_padmsg')).toContainText('crypto.getRandomValues');
    });

    test('crib dragging distinguishes the two directions instead of claiming symmetry', async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="otp"]');
        await page.fill('#otp_crib', 'COURIER');

        await page.click('#otp_drag');
        const asMsg1 = await page.locator('#otp_hits .srow.best .t').textContent();
        expect(asMsg1).toBe('mentwil');                        // COURIER at 7 in message 1

        await page.check('#otp_in2');
        await page.click('#otp_drag');
        const asMsg2 = await page.locator('#otp_hits .srow').first().locator('.t').textContent();
        expect(asMsg2).not.toBe(asMsg1);                       // the sign genuinely differs

        const body = await page.locator('#otp_res').textContent();
        expect(body).not.toContain('the two messages are symmetric');
    });

    test('Vigenère accepts a repeated key that decrypts correctly', async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="vig"]');
        await page.locator('#v_picker button').nth(0).click();      // true key KEY
        await page.locator('#s_ic .icc[data-l="6"]').click();       // a valid multiple
        await page.click('#s_auto');
        await expect(page.locator('#s_key')).toHaveText('KEYKEY');
        await expect(page.locator('#s_vacc')).toContainText('solved');
        await expect(page.locator('#s_vacc')).not.toContainText('not giving English');
        await expect(page.locator('#s_vacc')).toContainText('multiple of the true period');
    });

    test('RSA discloses that its encoding is breakable without factoring', async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="rsa"]');
        await expect(page.locator('#rsa')).toContainText('729');
        await expect(page.locator('#rsa')).not.toContainText('the only way there is');

        // the disclosure is demonstrated, not merely asserted
        for (const i of [0, 3]) {
            await page.locator('#rsa_picker button').nth(i).click();
            await page.click('#rsa_lookup');
            const msg = await page.locator('#rsa_lookmsg').textContent();
            expect(msg).toContain('729');
            expect(msg).toMatch(/“[A-Z ]+”/);                       // it really recovered text
            expect(msg).toContain('left completely intact');
        }
    });

    test('the page no longer claims each technique is strictly stronger', async ({ page }) => {
        await page.goto('/');
        const body = await page.locator('body').textContent();
        expect(body).not.toContain('strictly stronger');
        expect(body).toContain('only while its assumptions hold');       // the lede, above the tabs
        await page.click('#seg button[data-t="1"]');
        const brk = await page.locator('#brk').textContent();
        expect(brk).toContain('not a ladder where each tool supersedes the last');
        expect(brk).toContain('nothing in tabs ①–⑤ touches a correctly used one-time pad');
    });

    test('Mary’s forged postscript is attributed correctly', async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-t="1"]');
        const brk = await page.locator('#brk').textContent();
        expect(brk).toContain('asking Babington to name');
        expect(brk).not.toContain('asking Mary to name her fellow conspirators');
    });
});

test.describe('Stories are placed where they do teaching work', () => {
    const cases = [
        ['cae', 'Debian', '32,768'],
        ['brk', 'Bletchley Park, 1940', 'crash'],
        ['otp', 'Purple Dragon', '50 separate non-secure communications'],
        ['otp', 'lava lamps', 'computational security'],
        ['rsa', 'Pretty Good Privacy', 'Clipper Chip'],
    ];
    for (const [panel, a, b] of cases) {
        test(`${panel} carries the ${a} story`, async ({ page }) => {
            await page.goto('/');
            if (panel === 'brk') await page.click('#seg button[data-t="1"]');
            else await page.click(`#seg button[data-p="${panel}"]`);
            const text = await page.locator(`#${panel}`).textContent();
            expect(text).toContain(a);
            expect(text).toContain(b);
        });
    }
});
