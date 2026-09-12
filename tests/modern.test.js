import { test, expect } from '@playwright/test';

test.describe('⑥ One-time pad — the cipher that wins', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="otp"]');
    });

    test('any claimed plaintext yields a key that produces the ciphertext', async ({ page }) => {
        const ct = await page.locator('#otp_ct').textContent();
        for (const claim of ['ATTACK THE HARBOUR AT DAWN', 'SURRENDER THE FLEET AT NOON', 'ZZZ ZZZ']) {
            await page.fill('#otp_claim', claim);
            const key = await page.locator('#otp_key').textContent();
            const want = claim.toUpperCase().replace(/[^A-Z]/g, '');
            const n = Math.min(want.length, ct.length);
            expect(key.length).toBe(n);
            // key was derived as C - P, so P + key must reproduce C exactly
            for (let i = 0; i < n; i++) {
                const p = want.charCodeAt(i) - 65, k = key.charCodeAt(i) - 65;
                expect(String.fromCharCode(65 + ((p + k) % 26))).toBe(ct[i]);
            }
        }
    });

    test('a claim longer than the pad is refused, because length is what a pad leaks', async ({ page }) => {
        const ct = await page.locator('#otp_ct').textContent();
        await page.fill('#otp_claim', 'A'.repeat(ct.length + 5));
        await expect(page.locator('#otp_msg')).toContainText('Longer than the ciphertext');
    });

    test('a full-length claim is reported as perfect secrecy', async ({ page }) => {
        const ct = await page.locator('#otp_ct').textContent();
        await page.fill('#otp_claim', 'Q'.repeat(ct.length));
        await expect(page.locator('#otp_msg')).toContainText('Perfect secrecy');
    });

    test('reusing the pad cancels the key: C1 − C2 equals P1 − P2', async ({ page }) => {
        const [c1, c2, diff] = await Promise.all([
            page.locator('#otp_c1').textContent(),
            page.locator('#otp_c2').textContent(),
            page.locator('#otp_diff').textContent(),
        ]);
        expect(c1.length).toBe(c2.length);
        expect(diff.length).toBe(c1.length);
        for (let i = 0; i < diff.length; i++) {
            const d = (c1.charCodeAt(i) - c2.charCodeAt(i) + 26) % 26;
            expect(diff.charCodeAt(i) - 65).toBe(d);
        }
    });

    test('crib dragging finds the true position and reads the other message', async ({ page }) => {
        await page.fill('#otp_crib', 'COURIER');
        await page.click('#otp_drag');
        // COURIER sits at index 7 of "MEET THE COURIER…"; the other message reads "…MENTWIL…"
        await expect(page.locator('#otp_hits .srow.best .k')).toHaveText('07');
        await expect(page.locator('#otp_hits .srow.best .t')).toHaveText('mentwil');
        await expect(page.locator('#otp_res')).toContainText('position');
    });

    test('a crib too short to be informative is refused', async ({ page }) => {
        await page.fill('#otp_crib', 'A');
        await page.click('#otp_drag');
        await expect(page.locator('#otp_res')).toContainText('at least two letters');
        await expect(page.locator('#otp_hits .srow')).toHaveCount(0);
    });
});

test.describe('⑦ RSA — break it by factoring', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="rsa"]');
    });

    test('offers four key sizes and starts with no private key known', async ({ page }) => {
        await expect(page.locator('#rsa_picker button')).toHaveCount(4);
        await expect(page.locator('#rsa_params')).toContainText('unknown');
        await expect(page.locator('#rsa_key')).toHaveText('—');
    });

    test('factoring recovers p, q, d and the plaintext for every key', async ({ page }) => {
        const expected = ['MEET AT DAWN', 'BURN THIS NOTE', 'THE KEY IS SAFE', 'FACTORING IS HARD'];
        for (let i = 0; i < expected.length; i++) {
            await page.locator('#rsa_picker button').nth(i).click();
            await expect(page.locator('#rsa_out')).toHaveText('—');
            await page.click('#rsa_factor');
            await expect(page.locator('#rsa_meter')).toContainText('trial divisions');
            await expect(page.locator('#rsa_key')).toContainText('d = ');
            await expect(page.locator('#rsa_out')).toHaveText(expected[i]);
        }
    });

    test('bigger keys demonstrably cost more trial divisions', async ({ page }) => {
        const trials = [];
        for (let i = 0; i < 4; i++) {
            await page.locator('#rsa_picker button').nth(i).click();
            await page.click('#rsa_factor');
            const t = await page.locator('#rsa_meter').textContent();
            trials.push(+t.match(/in ([\d,]+) trial/)[1].replace(/,/g, ''));
        }
        for (let i = 1; i < trials.length; i++) expect(trials[i]).toBeGreaterThan(trials[i - 1]);
    });

    test('the scaling table is empty until something is actually measured', async ({ page }) => {
        await expect(page.locator('#rsa_scale')).toContainText('this table fills in');
        await page.click('#rsa_factor');
        await expect(page.locator('#rsa_scale')).toContainText('2048-bit');
        await expect(page.locator('#rsa_note')).toContainText('Measured on');
        // no overflow to Infinity or NaN at 2048 bits
        const body = await page.locator('#rsa_scale').innerText();
        expect(body).not.toMatch(/Infinity|NaN/);
    });
});

test.describe('⑧ Shor — factoring by finding a period', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('#seg button[data-p="shor"]');
    });

    test('the power sequence really does return to 1 at the stated period', async ({ page }) => {
        for (const n of ['15', '21', '35', '77']) {
            await page.locator(`#sh_picker button[data-n="${n}"]`).click();
            const bases = await page.locator('#sh_bases button').evaluateAll((bs) => bs.map((b) => +b.dataset.a));
            for (const a of bases.slice(0, 3)) {
                await page.locator(`#sh_bases button[data-a="${a}"]`).click();
                const cells = await page.locator('#sh_cycle span').count();
                const text = await page.locator('#sh_period').textContent();
                const r = +text.match(/after (\d+) steps/)[1];
                expect(cells).toBe(r);                                  // the cycle ends exactly at 1
                expect(Math.pow(a, r) % +n).toBe(1 % +n);               // and a^r ≡ 1 mod N
            }
        }
    });

    test('a good base factors N; a bad one says why instead of pretending', async ({ page }) => {
        await page.locator('#sh_picker button[data-n="21"]').click();
        const bases = await page.locator('#sh_bases button').evaluateAll((bs) => bs.map((b) => +b.dataset.a));
        let solved = 0, refused = 0;
        for (const a of bases) {
            await page.locator(`#sh_bases button[data-a="${a}"]`).click();
            await page.click('#sh_factor');
            const res = await page.locator('#sh_result').textContent();
            if (/21 = /.test(res)) {
                expect(res).toMatch(/21 = (3 × 7|7 × 3)/);
                solved++;
            } else {
                expect(res).toMatch(/is odd|≡ −1|trivial/);
                refused++;
            }
        }
        expect(solved).toBeGreaterThan(0);
        expect(refused).toBeGreaterThan(0);   // Shor genuinely expects to retry
    });

    test('factoring without a period refuses rather than guessing', async ({ page }) => {
        await page.locator('#sh_picker button[data-n="15"]').click();
        await page.locator('#sh_bases button[data-a="4"]').click();
        await page.click('#sh_factor');
        await expect(page.locator('#sh_result')).not.toHaveText('');
    });
});

test.describe('The complete timeline', () => {
    test('nine tabs, in chronological order, each with its year', async ({ page }) => {
        await page.goto('/');
        const tabs = await page.locator('#seg button').evaluateAll((bs) =>
            bs.map((b) => `${b.firstChild.textContent.trim()}|${b.querySelector('.z').textContent.trim()}`),
        );
        expect(tabs).toEqual([
            'Encrypt|加密',
            '① Caesar|antiquity',
            '② Frequency|c. 850',
            '③ Vigenère|1863',
            '④ Bigrams|1922',
            '⑤ Cribs|1940',
            '⑥ One-time pad|1949',
            '⑦ RSA|1977',
            '⑧ Shor|1994',
        ]);
    });

    test('every panel opens without a script error', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
        await page.goto('/');
        for (const p of ['enc', 'cae', 'brk', 'vig', 'otp', 'rsa', 'shor']) {
            await page.click(`#seg button[data-p="${p}"]`);
            await expect(page.locator(`section#${p}`)).toHaveClass(/on/);
        }
        expect(errors).toEqual([]);
    });
});
