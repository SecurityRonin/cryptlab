import { defineConfig } from '@playwright/test';

// Set BASE_URL to smoke-test a deployed site instead of a local server:
//   BASE_URL=https://securityronin-cryptlab.netlify.app npx playwright test
const target = process.env.BASE_URL;

export default defineConfig({
    testDir: './tests',
    use: {
        baseURL: target || 'http://localhost:3009',
        headless: true,
    },
    // no local server needed when pointing at a deployment
    webServer: target
        ? undefined
        : {
              command: 'python3 -m http.server 3009 --directory web',
              port: 3009,
              reuseExistingServer: true,
              timeout: 10000,
          },
});
