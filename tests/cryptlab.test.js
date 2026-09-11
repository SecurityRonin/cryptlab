import { test, expect } from '@playwright/test';

test.describe('CryptLab — page & branding', () => {
    test('loads with the right title', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/CryptLab/);
    });

    test('logo links to securityronin.com', async ({ page }) => {
        await page.goto('/');
        const logo = page.locator('.brand a[href*="securityronin.com"] img');
        await expect(logo).toBeVisible();
    });

    test('footer has Netlify and Sponsor badges', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('footer a[href*="netlify.com"]')).toBeVisible();
        await expect(page.locator('footer a[href*="sponsors/h4x0r"]')).toBeVisible();
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

test.describe('Break tab — substitution solver', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('nav#seg button[data-p="brk"]');
    });

    test('offers five challenges', async ({ page }) => {
        await expect(page.locator('#picker button')).toHaveCount(5);
    });

    test('frequency histogram renders bars with mapping boxes', async ({ page }) => {
        const cols = page.locator('#subhist .scol');
        expect(await cols.count()).toBeGreaterThan(5);
        await expect(cols.first().locator('input')).toBeVisible();
    });

    test('Guess by frequency fills boxes and decodes toward English', async ({ page }) => {
        await page.click('#b_guess');
        // tallest bar (R in the default message) maps to E
        await expect(page.locator('#subhist .scol').first().locator('input')).toHaveValue('E');
        await expect(page.locator('#b_out')).toContainText('the');
    });

    test('a plaintext letter can live in only one box (bijective)', async ({ page }) => {
        const b1 = page.locator('#subhist .scol').nth(0).locator('input');
        const b2 = page.locator('#subhist .scol').nth(1).locator('input');
        await b1.fill('E');
        await b2.fill('E');
        await expect(b1).toHaveValue('');   // E moved to the second box
        await expect(b2).toHaveValue('E');
    });

    test('selecting a challenge swaps ciphertext and reveals its solution', async ({ page }) => {
        const before = await page.locator('#b_in').inputValue();
        await page.locator('#picker button').nth(2).click(); // ③ Mitnick
        const after = await page.locator('#b_in').inputValue();
        expect(after).not.toBe(before);
        await expect(page.locator('#b_solution')).toContainText('WEAKEST LINK');
    });
});
