import { test, expect } from '@playwright/test';

const out = (page) => page.locator('#e_out');

test.describe('Encrypt — every cipher the lab breaks, you can also build', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('offers five ciphers, and says why there is no Shor mode', async ({ page }) => {
        const modes = await page.locator('#e_modes button').evaluateAll((bs) => bs.map((b) => b.dataset.m));
        expect(modes).toEqual(['caesar', 'vig', 'pad', 'rotor', 'rsa']);
        await expect(page.locator('#enc .hint').nth(1)).toContainText('Shor is not a cipher');
    });

    // round-tripping is the real check: a cipher you cannot undo is not a cipher
    for (const mode of ['caesar', 'vig', 'pad', 'rotor', 'rsa']) {
        test(`${mode} encrypts and decrypts back to the original`, async ({ page }) => {
            const plain = 'MEET ME AT MIDNIGHT';
            await page.click(`#e_modes button[data-m="${mode}"]`);
            if (mode !== 'rotor') await page.click('#e_dir button[data-d="enc"]');
            await page.fill('#e_in', plain);
            const ct = await out(page).textContent();
            expect(ct).not.toBe(plain);
            expect(ct.length).toBeGreaterThan(0);

            if (mode !== 'rotor') await page.click('#e_dir button[data-d="dec"]');
            await page.fill('#e_in', ct);
            expect(await out(page).textContent()).toBe(plain);
        });
    }

    test('a rotor machine is reciprocal, so it hides the direction toggle', async ({ page }) => {
        await page.click('#e_modes button[data-m="rotor"]');
        await expect(page.locator('#e_dir')).toBeHidden();
        await page.click('#e_modes button[data-m="caesar"]');
        await expect(page.locator('#e_dir')).toBeVisible();
    });

    /* Independent oracle, not a fixture of our own making: Enigma I with rotors
       I-II-III, reflector B, ring settings and positions AAA, no plugboard, fed
       all As, is a widely published test vector. */
    test('the rotor matches the published Enigma I test vector', async ({ page }) => {
        await page.click('#e_modes button[data-m="rotor"]');
        await page.fill('#e_rotor', 'AAA');
        await page.fill('#e_in', 'A'.repeat(30));
        await expect(out(page)).toHaveText('BDZGOWCXLTKSBTMCDLPBMUQOFXYHCX');
    });

    test('no letter ever enciphers to itself — the leak cribs exploited', async ({ page }) => {
        await page.click('#e_modes button[data-m="rotor"]');
        for (const letter of ['A', 'E', 'Q', 'Z']) {
            await page.fill('#e_in', letter.repeat(40));
            const ct = await out(page).textContent();
            expect(ct).not.toContain(letter);
        }
    });

    test('changing the rotor start positions changes the output', async ({ page }) => {
        await page.click('#e_modes button[data-m="rotor"]');
        await page.fill('#e_in', 'MEET ME AT MIDNIGHT');
        await page.fill('#e_rotor', 'AAA');
        const a = await out(page).textContent();
        await page.fill('#e_rotor', 'QRS');
        expect(await out(page).textContent()).not.toBe(a);
    });

    test('a fresh pad is as long as the message and changes the ciphertext', async ({ page }) => {
        await page.click('#e_modes button[data-m="pad"]');
        await page.fill('#e_in', 'MEET ME AT MIDNIGHT');
        const pad1 = await page.locator('#e_pad').textContent();
        const ct1 = await out(page).textContent();
        expect(pad1.length).toBe('MEETMEATMIDNIGHT'.length);
        await page.click('#e_newpad');
        expect(await page.locator('#e_pad').textContent()).not.toBe(pad1);
        expect(await out(page).textContent()).not.toBe(ct1);
    });

    test('RSA publishes N and e while keeping d, and honours the key size', async ({ page }) => {
        await page.click('#e_modes button[data-m="rsa"]');
        await expect(page.locator('#e_rsainfo')).toContainText('N = 3233');
        await expect(page.locator('#e_rsainfo')).toContainText('d = ');
        await page.fill('#e_in', 'HI');
        const small = await out(page).textContent();
        await page.locator('#e_rsakeys button').nth(3).click();
        const n = (await page.locator('#e_rsainfo').textContent()).match(/N = (\d+)/)[1];
        expect(n.length).toBe(16);                      // the largest key on offer
        expect(await out(page).textContent()).not.toBe(small);
    });
});

test.describe('Human in the loop — the machine does not answer first', () => {
    test('① Caesar withholds its scoring until asked', async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="cae"]');

        // nothing marked, no fit numbers, and no answer in the prose
        await expect(page.locator('#c_grid .srow.best')).toHaveCount(0);
        const fits = await page.locator('#c_grid .srow .f').evaluateAll((fs) => fs.map((f) => f.textContent));
        expect(fits.every((f) => f === '')).toBe(true);
        const meter = await page.locator('#c_meter2').textContent();
        expect(meter).not.toMatch(/best|shift \d/);
        expect(meter).toContain('tap the one that is English');

        await page.click('#c_score');
        await expect(page.locator('#c_grid .srow.best')).toHaveCount(1);
        const after = await page.locator('#c_grid .srow .f').evaluateAll((fs) => fs.map((f) => f.textContent));
        expect(after.some((f) => f !== '')).toBe(true);
    });

    test('③ Vigenère withholds the key length until asked', async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="vig"]');

        await expect(page.locator('#s_ic .icc.peak')).toHaveCount(0);
        const label = await page.locator('#s_iclab').textContent();
        expect(label).not.toMatch(/Shortest length reaching English/);
        expect(label).toContain('Tap the shortest bar');

        await page.click('#s_icscore');
        await expect(page.locator('#s_ic .icc.peak')).toHaveCount(1);
        await expect(page.locator('#s_iclab')).toContainText('Shortest length reaching English');
    });

    test('picking the right key still confirms itself without being pre-announced', async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="cae"]');
        await page.click('#c_score');                          // reveal, then use it
        await page.locator('#c_grid .srow.best').click();
        await expect(page.locator('#c_meter2')).toContainText('this is the key');
    });
});
